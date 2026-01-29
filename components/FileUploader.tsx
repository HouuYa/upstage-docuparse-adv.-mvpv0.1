import React, { useRef, useState } from "react";
import { UploadCloud, FileText, X, RefreshCw } from "lucide-react";
import { SUPPORTED_EXTENSIONS } from "../constants";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  selectedFile,
  onClear,
  disabled,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isValid = SUPPORTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    
    if (isValid) {
      onFileSelect(file);
    } else {
      alert(`Unsupported file type. Please upload one of: ${SUPPORTED_EXTENSIONS.join(", ")}`);
    }
  };

  const handleReplace = () => {
    fileInputRef.current?.click();
  };

  if (selectedFile) {
    return (
      <div className="w-full space-y-2 animate-in fade-in slide-in-from-bottom-2">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex-shrink-0 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-[10px] text-slate-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={onClear}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {!disabled && (
           <button
             onClick={handleReplace}
             className="w-full py-2 px-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow"
           >
             <RefreshCw className="w-3.5 h-3.5" />
             Replace Document
           </button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={SUPPORTED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group
        ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/50 scale-[1.01]"
            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={SUPPORTED_EXTENSIONS.join(",")}
        onChange={handleInputChange}
        disabled={disabled}
      />
      
      <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
        <UploadCloud className={`w-6 h-6 ${isDragging ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"}`} />
      </div>
      
      <p className="text-xs font-medium text-slate-700">
        Click to upload or drag & drop
      </p>
    </div>
  );
};

export default FileUploader;