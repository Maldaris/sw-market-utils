import { cleanupLogFile, parseShopData, flattenItem, ShopItem } from '../common';
import { Parser } from '@json2csv/plainjs';

declare global {
  interface Prism {
    highlightAll(): void;
  }

  const Prism: Prism;
}

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
const jsonOutput = document.getElementById('json-output');
const csvOutput = document.getElementById('csv-output');
const errorContainer = document.getElementById('error-container') as HTMLDivElement;
const loadingSpinner = document.getElementById('loading-spinner');
const outputSection = document.getElementById('output-section');
errorContainer.style.color = 'red';
document.body.prepend(errorContainer);

let parsedData: ShopItem[] | null = null;

if (!dropzone) {
  errorContainer.textContent = 'Error: Dropzone element not found.';
  if (outputSection) outputSection.style.display = 'none';
} else if (!jsonOutput || !csvOutput || !loadingSpinner || !outputSection || !fileInput) {
  errorContainer.textContent = 'Error: Output elements not found.';
  if (outputSection) outputSection.style.display = 'none';
} else {
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', async (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    const file = event.dataTransfer?.files[0];
    if (file) {
      await handleFile(file);
    }
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await handleFile(file);
    }
  });

  document.getElementById('download-json')?.addEventListener('click', () => {
    if (parsedData) {
      try {
        const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.json';
        a.click();
        URL.revokeObjectURL(url);
      } catch (err: unknown) {
        if (err instanceof Error) {
          errorContainer.textContent = `Error downloading JSON: ${err.message}`;
        }
      }
    }
  });

  document.getElementById('download-csv')?.addEventListener('click', () => {
    if (parsedData) {
      try {
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
      } catch (err: unknown) {
        if (err instanceof Error) {
          errorContainer.textContent = `Error downloading CSV: ${err.message}`;
        }
      }
    }
  });

  document.getElementById('json-tab')?.addEventListener('click', () => {
    switchTab('json');
  });

  document.getElementById('csv-tab')?.addEventListener('click', () => {
    switchTab('csv');
  });
}

async function handleFile(file: File) {
  try {
    if (loadingSpinner) loadingSpinner.style.display = 'block';
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
      processContent(content);
    } else {
      content = await file.text();
      processContent(content);
    }
    updateDropzone(file.name);
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorContainer.textContent = `Error processing file: ${err.message}`;
      if (outputSection) outputSection.style.display = 'none';
    }
  } finally {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

function processContent(content: string) {
  const lines = content.split("\n");
  const cleanedLines = cleanupLogFile(lines.filter(line => line.includes("[CHAT]")));
  parsedData = parseShopData(cleanedLines);
  if (jsonOutput && csvOutput && outputSection) {
    jsonOutput.textContent = JSON.stringify(parsedData, null, 2);
    const flatData = parsedData.map(flattenItem);
    const parser = new Parser({ header: true });
    csvOutput.textContent = parser.parse(flatData);
    Prism.highlightAll();
    outputSection.style.display = 'block';
  } else {
    errorContainer.textContent = 'Error: Output elements not found.';
    if (outputSection) outputSection.style.display = 'none';
  }
}

function switchTab(tab: 'json' | 'csv') {
  const jsonTab = document.getElementById('json-tab');
  const csvTab = document.getElementById('csv-tab');
  const jsonPane = document.getElementById('json');
  const csvPane = document.getElementById('csv');

  if (jsonTab && csvTab && jsonPane && csvPane) {
    if (tab === 'json') {
      jsonTab.classList.add('active');
      csvTab.classList.remove('active');
      jsonPane.classList.add('show', 'active');
      csvPane.classList.remove('show', 'active');
    } else {
      csvTab.classList.add('active');
      jsonTab.classList.remove('active');
      csvPane.classList.add('show', 'active');
      jsonPane.classList.remove('show', 'active');
    }
    setTimeout(() => Prism.highlightAll(), 0);
  }
}

function updateDropzone(fileName: string) {
  if (dropzone) {
    const fileIcon = fileName.endsWith('.gz') ? '<i class="fas fa-file-archive"></i>' : '<i class="fas fa-file-alt"></i>';
    dropzone.innerHTML = `${fileIcon}&nbsp;${fileName}`;
  }
  if (fileInput) {
    fileInput.value = ''; // Reset the file input to allow re-uploading the same file
  }
}