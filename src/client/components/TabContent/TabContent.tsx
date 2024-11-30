
import React from 'react';
import { Parser } from '@json2csv/plainjs';
import { ShopItem, flattenItem } from '../../../common';

interface TabContentProps {
  activeTab: 'json' | 'csv';
  parsedData: ShopItem[];
  handleDownload: (type: 'json' | 'csv') => void;
  handleCopy: (type: 'json' | 'csv') => void;
}

const TabContent: React.FC<TabContentProps> = ({ activeTab, parsedData, handleDownload, handleCopy }) => {
  return (
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
  );
};

export default TabContent;