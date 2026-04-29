import React, { useState, useRef } from "react";
import { UploadCloud, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileLoaded: (file: File, buffer: ArrayBuffer) => void;
  compact?: boolean;
}

export function FileUploader({ onFileLoaded, compact = false }: FileUploaderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        onFileLoaded(file, result);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovered(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-6 border border-dashed rounded-lg transition-all cursor-pointer group w-full",
            isHovered ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-[#0F131A] hover:border-slate-500 hover:bg-[#151921]"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
          onDragLeave={() => setIsHovered(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input type="file" accept=".ab1" className="hidden" ref={inputRef} onChange={handleFileChange} />
          <div className="bg-[#1A1D24] p-2 rounded-full mb-3 group-hover:bg-[#1A2320] transition-colors border border-slate-700/50">
            <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <span className="text-xs text-slate-300 font-medium">Drop .ab1 file here</span>
          <span className="text-xs text-slate-500 mt-1">or click to browse</span>
        </div>
      </div>
    );
  }

  // Large version (fallback, but primarily we will use compact in the sidebar)
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto mt-[-10vh]">
      <div 
        className={cn(
          "flex flex-col items-center justify-center p-12 border border-dashed rounded-lg transition-all cursor-pointer group w-full",
          isHovered ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-[#1A1D23] hover:border-slate-500 hover:bg-[#1f2229]"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
        onDragLeave={() => setIsHovered(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input 
          type="file" 
          accept=".ab1"
          className="hidden" 
          ref={inputRef} 
          onChange={handleFileChange}
        />
        <div className="bg-[#0B0E14] border border-gray-800 p-4 rounded-full group-hover:scale-110 transition-transform duration-300">
          <UploadCloud className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="mt-6 text-[15px] font-bold text-gray-200 tracking-wide uppercase">Upload your .ab1 file</h3>
        <p className="text-gray-500 text-xs mt-2 text-center max-w-sm">
          Drag and drop your Sanger sequencing trace file here, or click to browse.
        </p>
      </div>
    </div>
  );
}
