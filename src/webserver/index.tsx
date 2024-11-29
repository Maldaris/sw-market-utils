import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { cleanupLogFile, parseShopData, flattenItem, ShopItem } from '../common';
import { Parser } from '@json2csv/plainjs';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-csv';

const App = () => {
    const [error, setError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ShopItem[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'json' | 'csv'>('json');
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        Prism.highlightAll();
    }, [parsedData, activeTab]);

    const handleFile = async (file: File) => {
        try {
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
        const lines = content.split("\n");
        const cleanedLines = cleanupLogFile(lines.filter(line => line.includes("[CHAT]")));
        const data = parseShopData(cleanedLines);
        setParsedData(data);
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

    return (<React.Fragment>
        <div className="container mt-5"></div>
        <h1 className="text-center">Shop Inventory Log File Parser</h1>
        <p className="text-center">
            This tool lets you convert your shop log files from Stoneworks into easily consumable formats with bots (JSON) or spreadsheets (CSV).<br />
            After clicking on shop chest/barrels in-game to see their available stock and price,
            you can upload your log file here to parse the shop inventories and prices, and convert it into JSON or CSV format.<br />
            You can either drag and drop the file into the dropzone below or click to upload.
        </p>
        <p className="text-center">Supports either .log files, or .gz archives!</p>
        {error && <div id="error-container" className="text-center" style={{ color: 'red' }}>{error}</div>}
        <div
            className="dropzone mt-4"
            id="dropzone"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('dragover'); }}
            onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('dragover');
                const file = e.dataTransfer?.files[0];
                if (file) await handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
        >
            {fileName ? (
                <div className="text-center">
                    <i className={`fas ${fileName.endsWith('.gz') ? 'fa-file-archive' : 'fa-file-alt'} fa-3x`}></i>
                    <div>{fileName}</div>
                </div>
            ) : (
                "Drop your log file here or click to upload"
            )}
        </div>
        <input
            type="file"
            id="fileInput"
            className="d-none"
            ref={fileInputRef}
            onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleFile(file);
            }}
        />
        {loading && (
            <React.Fragment>
                <div className="text-center mt-3" id="loading-spinner">
                    <div className="spinner-border" role="status">
                        <span className="sr-only">Loading...</span>
                    </div>
                </div>
            </React.Fragment>
        )}
        {parsedData && (
            <React.Fragment>
                <div className="mt-4" id="output-section"></div>
                <ul className="nav nav-tabs" id="outputTabs" role="tablist">
                    <li className="nav-item">
                        <a className={`nav-link ${activeTab === 'json' ? 'active' : ''}`} 
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
                        <a className={`nav-link ${activeTab === 'csv' ? 'active' : ''}`} 
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
                <div className="tab-content" id="outputTabsContent">
                    <div className={`tab-pane fade ${activeTab === 'json' ? 'show active' : ''}`} id="json" role="tabpanel" aria-labelledby="json-tab">
                        <div className="text-center mt-3">
                            <button className="btn btn-primary" onClick={() => handleDownload('json')}>
                                <i className="fas fa-download"></i> Download JSON
                            </button>
                            <button className="btn btn-secondary ml-2" onClick={() => handleCopy('json')}>
                                <i className="fas fa-copy"></i> Copy JSON
                            </button>
                        </div>
                        <pre className="mt-4 p-3 border"><code className="language-json" id="json-output">{JSON.stringify(parsedData, null, 2)}</code></pre>
                    </div>
                    <div className={`tab-pane fade ${activeTab === 'csv' ? 'show active' : ''}`} id="csv" role="tabpanel" aria-labelledby="csv-tab">
                        <div className="text-center mt-3">
                            <button className="btn btn-primary" onClick={() => handleDownload('csv')}>
                                <i className="fas fa-download"></i> Download CSV
                            </button>
                            <button className="btn btn-secondary ml-2" onClick={() => handleCopy('csv')}>
                                <i className="fas fa-copy"></i> Copy CSV
                            </button>
                        </div>
                        <pre className="mt-4 p-3 border"><code className="language-csv" id="csv-output">{new Parser({ header: true }).parse(parsedData.map(flattenItem))}</code></pre>
                    </div>
                </div>
            </React.Fragment>
        )}
    </React.Fragment>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));