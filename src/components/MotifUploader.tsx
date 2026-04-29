import React, { useRef, useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, Info, Download, AlertTriangle, CheckCircle2, ChevronDown, FileText } from "lucide-react";

export interface Motif {
  sequence: string;
  direction: 'F' | 'R';
  annotation: string;
}

interface MotifUploaderProps {
  onMotifSelect: (motif: Motif) => void;
  selectedMotif: Motif | null;
}

export function MotifUploader({ onMotifSelect, selectedMotif }: MotifUploaderProps) {
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateSequence = (seq: string) => {
    if (!seq || typeof seq !== 'string') return false;
    const clean = seq.toUpperCase().trim();
    if (clean.length < 5 || clean.length > 20) return false;
    // IUPAC DNA characters
    const validRegex = /^[ACGTRYSWKMBDHVN]+$/;
    return validRegex.test(clean);
  };

  const parseFile = (file: File) => {
    setWarning(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv' || extension === 'txt') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data);
        },
        error: (error) => {
          setWarning(`Parse error: ${error.message}`);
        }
      });
    } else if (extension === 'xls' || extension === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          processParsedData(jsonData);
        } catch (err: any) {
          setWarning(`Parse error: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setWarning('Unsupported file format. Please upload CSV, TXT, XLS, or XLSX.');
    }
  };

  const processParsedData = (data: any[]) => {
    const validMotifs: Motif[] = [];
    let invalidCount = 0;

    data.forEach((row, idx) => {
      // Normalize keys, trim spaces
      const normalizedRow: Record<string, string> = {};
      Object.keys(row).forEach(k => {
        normalizedRow[k.trim().toLowerCase()] = String(row[k]).trim();
      });

      const seq = normalizedRow['sequence'];
      const dirInput = normalizedRow['direction']?.toUpperCase();
      const ann = normalizedRow['annotation'];

      if (!seq) {
        invalidCount++;
        return;
      }

      if (validateSequence(seq)) {
        const direction = (dirInput === 'R') ? 'R' : 'F';
        validMotifs.push({
          sequence: seq.toUpperCase(),
          direction,
          annotation: ann || 'Unknown Annotation'
        });
      } else {
        invalidCount++;
      }
    });

    if (validMotifs.length > 0) {
      setMotifs(validMotifs);
      setIsOpen(false);
      if (invalidCount > 0) {
         setWarning(`Loaded ${validMotifs.length} motifs. Skipped ${invalidCount} invalid rows.`);
         setTimeout(() => setWarning(null), 5000);
      }
    } else {
      setWarning("No valid motifs found in the uploaded file.");
      setTimeout(() => setWarning(null), 5000);
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadDemo = () => {
    const csvContent = "sequence,direction,annotation\nATGCGT,F,Example mutation\nCGTACG,R,Reverse binding site";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'motifs_demo.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredMotifs = motifs.filter(m => 
    m.sequence.toLowerCase().includes(searchFilter.toLowerCase()) || 
    m.annotation.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleSelect = (motif: Motif) => {
    setIsOpen(false);
    setSearchFilter('');
    onMotifSelect(motif);
  };

  return (
    <div className="flex items-center gap-2 relative">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => { if (motifs.length > 0) setIsOpen(!isOpen); else fileInputRef.current?.click(); }}
          className="flex items-center gap-2 bg-[#1A1D23] border border-gray-700 hover:border-emerald-500 text-xs px-3 py-1.5 rounded transition-all text-gray-200 min-w-[140px] justify-between"
          title={motifs.length === 0 ? "Upload Motifs File" : "Select Motif"}
        >
          {motifs.length === 0 ? (
            <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5 text-gray-400" /> Upload Motifs</span>
          ) : (
            <span className="truncate max-w-[120px]">{selectedMotif ? selectedMotif.annotation : 'Select Motif...'}</span>
          )}
          {motifs.length > 0 && <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </button>

        {isOpen && motifs.length > 0 && (
          <div className="absolute top-full left-0 md:left-auto md:right-0 mt-1 w-64 bg-[#1A1D23] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
             <div className="p-2 border-b border-gray-800">
               <input 
                 type="text" 
                 placeholder="Search motif..." 
                 value={searchFilter}
                 onChange={(e) => setSearchFilter(e.target.value)}
                 className="w-full bg-[#0B0E14] border border-gray-700 text-xs px-2 py-1.5 rounded text-gray-200 focus:outline-none focus:border-emerald-500/50"
                 onClick={(e) => e.stopPropagation()}
               />
             </div>
             <div className="max-h-60 overflow-y-auto w-full">
                {filteredMotifs.length === 0 ? (
                  <div className="p-3 text-xs text-center text-gray-500">No motifs found.</div>
                ) : (
                  filteredMotifs.map((m, idx) => (
                    <div 
                      key={idx}
                      className="p-2 hover:bg-[#252A33] border-b border-gray-800 last:border-0 cursor-pointer flex flex-col gap-1"
                      onClick={() => handleSelect(m)}
                    >
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-200">
                        <span>{m.annotation}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${m.direction === 'F' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>{m.direction}</span>
                      </div>
                      <div className="text-[10px] font-mono text-gray-500">{m.sequence}</div>
                    </div>
                  ))
                )}
             </div>
             <div className="p-2 bg-[#12161E] border-t border-gray-700 flex justify-between items-center">
                 <span className="text-xs text-gray-500">{motifs.length} motifs loaded</span>
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                 >
                   Load New
                 </button>
             </div>
          </div>
        )}
      </div>

      <button 
        type="button" 
        onClick={() => setShowInfo(true)}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) parseFile(file);
        }}
        accept=".csv,.txt,.xls,.xlsx"
        className="hidden"
      />

      {/* Warning Toast */}
      {warning && (
        <div className="absolute top-full -right-2 mt-2 w-64 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-2 rounded text-xs z-50 shadow-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{warning}</p>
        </div>
      )}

      {/* Info Dialog */}
      {showInfo && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#0B0E14] border border-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" /> Motif File Format
              </h2>
              <div className="space-y-4 text-sm text-gray-400">
                <p>Upload a file (.csv, .xls, .xlsx, .txt) with known DNA sequence motifs to search tracks automatically.</p>
                <div className="bg-[#1A1D23] p-3 rounded-lg border border-gray-800 font-mono text-xs">
                   <div className="text-gray-500 font-bold border-b border-gray-700 pb-1 mb-1">sequence,direction,annotation</div>
                   <div className="text-gray-300">ATGCGT,F,Example mutation</div>
                   <div className="text-gray-300">CGTACG,R,Reverse binding site</div>
                </div>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Required columns:</strong> sequence, direction, annotation</li>
                  <li><strong>Sequence length:</strong> 5 to 20 bases</li>
                  <li><strong>Allowed bases:</strong> Standard DNA/IUPAC codes</li>
                  <li><strong>Direction:</strong> F (Forward) or R (Reverse)</li>
                  <li>Invalid sequences will be skipped automatically.</li>
                </ul>
              </div>
              <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-800">
                <button 
                  onClick={handleDownloadDemo}
                  className="text-xs flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition"
                >
                  <Download className="w-4 h-4" /> Download Demo CSV
                </button>
                <button 
                  onClick={() => setShowInfo(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-1.5 rounded text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
