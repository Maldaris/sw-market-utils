import { Parser } from "@json2csv/plainjs";
import Prism from "prismjs";
import { useState, useEffect } from "react";
import { ShopItem, parseShopData, cleanupLogFile, flattenItem } from "../../common";
import Advertisement from "../components/Advertisement/Advertisement";
import Dropzone from "../components/Dropzone/Dropzone";
import ErrorBoundary from "../components/ErrorBoundary/ErrorBoundary";
import TabContent from "../components/TabContent/TabContent";

export const ShopParser = () => { 

    const [error, setError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ShopItem[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'json' | 'csv'>('json');
    const [fileName, setFileName] = useState<string | null>(null);
  
    useEffect(() => {
      Prism.highlightAll();
    }, [parsedData, activeTab]);
  
    const handleFile = async (file: File) => {
      try {
        setError(null); // Clear the current error state
        setLoading(true);
        let content = "";
        if (file.name.endsWith('.gz')) {
          const buffer = await file.arrayBuffer();
          const decompressedStream = new Response(buffer).body!.pipeThrough(new DecompressionStream('gzip'));
          const reader = decompressedStream.getReader();
          const decoder = new TextDecoder();
          let result = await reader.read();
          while (!result.done) {
            content += decoder.decode(result.value, { stream: true });
            result = await reader.read();
          }
          content += decoder.decode();
        } else {
          content = await file.text();
        }
        processContent(content);
        setFileName(file.name);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(`Error processing file: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
  
    const processContent = (content: string) => {
      try {
        const lines = content.split("\n");
        if (lines[0] && lines[0].trim().startsWith("Shop Information:")) { 
          // Lines are already cleaned up, skip cleanup
          const data = parseShopData(lines);
          if (data.length === 0) {
            setError("No shop logs can be found, are you sure you've uploaded the correct logs?");
          } else {
            setParsedData(data);
          }
        } else {
          const cleanedLines = cleanupLogFile(lines.filter(line => line.includes("[CHAT]")));
          const data = parseShopData(cleanedLines);
          if (data.length === 0) {
            setError("No shop logs can be found, are you sure you've uploaded the correct logs?");
          } else {
            setParsedData(data);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(`Error processing content: ${err.message}`);
        }
      }
    };
  
    const handleDownload = (type: 'json' | 'csv') => {
      if (parsedData) {
        try {
          if (type === 'json') {
            const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'output.json';
            a.click();
            URL.revokeObjectURL(url);
          } else {
            const flatData = parsedData.map(flattenItem);
            const parser = new Parser({ header: true });
            const csv = parser.parse(flatData);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'output.csv';
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch (err: unknown) {
          if (err instanceof Error) {
            setError(`Error downloading ${type.toUpperCase()}: ${err.message}`);
          }
        }
      }
    };
  
    const handleCopy = (type: 'json' | 'csv') => {
      if (parsedData) {
        try {
          const text = type === 'json' 
            ? JSON.stringify(parsedData, null, 2) 
            : new Parser({ header: true }).parse(parsedData.map(flattenItem));
          navigator.clipboard.writeText(text);
          alert(`${type.toUpperCase()} copied to clipboard!`);
        } catch (err: unknown) {
          if (err instanceof Error) {
            setError(`Error copying ${type.toUpperCase()} to clipboard: ${err.message}`);
          }
        }
      }
    };
  
    const switchTab = (tab: 'json' | 'csv') => {
      setActiveTab(tab);
    };
  
    return (
      <ErrorBoundary>
        <div className="container mt-5">
          <h1 className="text-center">Shop Inventory Log File Parser</h1>
          <p className="text-center">
            This tool lets you convert your shop log files from Stoneworks into easily consumable formats with bots (JSON) or spreadsheets (CSV).<br />
            After clicking on shop chest/barrels in-game to see their available stock and price, 
            you can upload your log file here to parse the shop inventories and prices, and convert it into JSON or CSV format.<br />
            You can either drag and drop the file into the dropzone below or click to upload.
          </p>
          <p className="text-center">Supports either .log files, or .gz archives!</p>
          {error && <div id="error-container" className="text-center" style={{ color: 'red' }}>{error}</div>}
          <Dropzone onFileUpload={handleFile} fileName={fileName} />
          {loading && (
            <div className="text-center mt-3" id="loading-spinner">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          )}
          {parsedData && (
            <div className="mt-4" id="output-section">
              <ul className="nav nav-tabs" id="outputTabs" role="tablist">
                <li className="nav-item">
                  <a 
                    className={`nav-link ${activeTab === 'json' ? 'active' : ''}`} 
                    id="json-tab" 
                    data-toggle="tab" 
                    href="#json" 
                    role="tab" 
                    aria-controls="json" 
                    aria-selected={activeTab === 'json'}
                    onClick={() => switchTab('json')}
                  >
                    <i className="fas fa-code"></i> JSON
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${activeTab === 'csv' ? 'active' : ''}`} 
                    id="csv-tab" 
                    data-toggle="tab" 
                    href="#csv" 
                    role="tab" 
                    aria-controls="csv" 
                    aria-selected={activeTab === 'csv'}
                    onClick={() => switchTab('csv')}
                  >
                    <i className="fas fa-table"></i> CSV
                  </a>
                </li>
              </ul>
              <TabContent 
                activeTab={activeTab} 
                parsedData={parsedData} 
                handleDownload={handleDownload} 
                handleCopy={handleCopy} 
              />
            </div>
          )}
        </div>
      </ErrorBoundary>
    );
};

export default ShopParser;