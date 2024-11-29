
import React, { useRef } from 'react';

interface DropzoneProps {
  onFileUpload: (file: File) => void;
  fileName: string | null;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFileUpload, fileName }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileUpload(file);
    }
  };

  return (
    <div
      className="dropzone mt-4"
      id="dropzone"
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
      onDragLeave={(e) => { e.currentTarget.classList.remove('dragover'); }}
      onDrop={async (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const file = e.dataTransfer?.files[0];
        if (file) await onFileUpload(file);
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
      <input
        type="file"
        id="fileInput"
        className="d-none"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default Dropzone;