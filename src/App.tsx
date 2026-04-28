import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, Download, Copy, Share2, Menu, AudioWaveform, ToggleLeft, ToggleRight, X, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { parseABIF, ABIFData, getReverseComplement } from "@/lib/abif-parser";
import { FileUploader } from "@/components/FileUploader";
import { ChromatogramViewer } from "@/components/ChromatogramViewer";
import { SequenceViewer } from "@/components/SequenceViewer";

export default function App() {
  const [data, setData] = useState<ABIFData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  
  // Settings
  const [showHeterozygous, setShowHeterozygous] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [reverseComplement, setReverseComplement] = useState(false);
  const [hetThreshold, setHetThreshold] = useState<number>(0.30);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedBaseIndex, setFocusedBaseIndex] = useState<number | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const handleFileLoaded = useCallback((file: File, buffer: ArrayBuffer) => {
    try {
      const parsed = parseABIF(buffer);
      if (!parsed.A || parsed.A.length === 0) {
        throw new Error("No trace traces found in file.");
      }
      setData(parsed);
      setFileName(file.name);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to parse ABIF file.");
      setData(null);
    }
  }, []);

  const resetData = () => {
    setData(null);
    setFileName("");
    setError("");
  };

  const stats = useMemo(() => {
    if (!data) return null;
    const length = data.baseCalls.length;
    let gcCount = 0;
    let q20Count = 0;
    let q30Count = 0;
    let sumQ = 0;
    
    // Count heterozygous peaks based on current threshold
    let hetCount = 0;
    for (let i = 0; i < length; i++) {
        const b = data.baseCalls[i].toUpperCase();
        if (b === 'G' || b === 'C') gcCount++;
        const q = data.qualities[i] || 0;
        if (q >= 20) q20Count++;
        if (q >= 30) q30Count++;
        sumQ += q;
        
        const pos = data.peakPositions[i];
        if (pos !== undefined) {
             const signals = [data.A[pos], data.C[pos], data.G[pos], data.T[pos]];
             signals.sort((a, b) => b - a);
             if (signals[0] > 0 && (signals[1] / signals[0]) > hetThreshold) hetCount++;
        }
    }
    
    return {
        length,
        tracePoints: data.A.length,
        gcContent: (gcCount / length * 100).toFixed(1) + '%',
        avgQuality: (sumQ / length).toFixed(1),
        q20: (q20Count / length * 100).toFixed(1) + '%',
        q30: (q30Count / length * 100).toFixed(1) + '%',
        hetCount
    }
  }, [data, hetThreshold]);

  return (
    <div className="flex h-screen w-full bg-[#0E1117] text-gray-100 font-sans overflow-hidden selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="w-72 border-r border-[#1e293b] bg-[#090B0F] hidden md:flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <AudioWaveform className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-gray-200 tracking-wide">Tracerup</h1>
        </div>

        <div className="px-5 pb-6 flex flex-col gap-8 flex-1">
          {/* Load File Widget */}
          <div className="pt-2">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Load File</h2>
            <FileUploader onFileLoaded={handleFileLoaded} compact={true} />
          </div>

          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Display Options</h2>
            <div className="space-y-4">
              <ToggleSetting 
                label="Quality Scores" 
                subtext="Overlay Phred scores"
                enabled={showQuality} 
                onChange={() => setShowQuality(!showQuality)} 
              />
              <ToggleSetting 
                label="Heterozygous Markers" 
                subtext="Detect mixed bases"
                enabled={showHeterozygous} 
                onChange={() => setShowHeterozygous(!showHeterozygous)} 
              />
            </div>
          </div>
          
          {showHeterozygous && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Het. Threshold</h2>
                <span className="text-xs text-gray-400 font-mono">{hetThreshold.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.1" max="0.5" step="0.05" 
                value={hetThreshold} 
                onChange={(e) => setHetThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="text-[9px] text-gray-600 mt-1">Secondary/Primary peak ratio</div>
            </div>
          )}

          {data && (
            <div className="pt-2">
               <button className="w-full bg-[#1A1D23] border border-gray-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 text-[11px] py-2.5 rounded flex items-center px-4 gap-3 transition-colors font-semibold shadow-sm"
                 onClick={() => {
                   const selection = window.getSelection()?.toString();
                   let seqToBlast = "";
                   const fullSeq = reverseComplement ? getReverseComplement(data.baseCalls) : data.baseCalls;
                   
                   if (selection && selection.length > 0) {
                     const cleanSelection = selection.replace(/[^A-Za-z]/g, '').toUpperCase();
                     if (cleanSelection.length > 0) {
                       seqToBlast = cleanSelection;
                     }
                   }
                 
                   if (!seqToBlast) {
                     seqToBlast = fullSeq;
                   }

                   if (seqToBlast.length < 11) {
                      alert("Selected sequence is too short for a meaningful BLAST search (minimum 11 bases).");
                      return;
                   }

                   const blastUrl = `https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=blastn&PAGE_TYPE=BlastSearch&LINK_LOC=blasthome&QUERY=${seqToBlast}`;
                   window.open(blastUrl, '_blank', 'noopener,noreferrer');
                 }}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> BLAST on NCBI
                </button>
            </div>
          )}

          {data && (
            <div className="pt-2">
               <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Export</h2>
               <div className="flex flex-col gap-2">
                 <button className="w-full bg-[#1A1D23] border border-gray-700 hover:border-gray-500 hover:bg-[#1E232A] text-gray-300 text-[11px] py-2.5 rounded flex items-center px-4 gap-3 transition-colors"
                   onClick={() => {
                     const selection = window.getSelection()?.toString();
                     let textToCopy = "";
                     let message = "";
                     const fullSeq = reverseComplement ? getReverseComplement(data.baseCalls) : data.baseCalls;
                     
                     if (selection && selection.length > 0) {
                       const cleanSelection = selection.replace(/[^A-Za-z]/g, '');
                       if (cleanSelection.length > 0) {
                         textToCopy = cleanSelection.toUpperCase();
                         message = "Copied selection";
                       }
                     }
                   
                     if (!textToCopy) {
                       textToCopy = fullSeq;
                       message = "Copied full sequence";
                     }
                   
                     navigator.clipboard.writeText(textToCopy);
                     setCopyMessage(message);
                     setTimeout(() => setCopyMessage(null), 2500);
                   }}
                 >
                   <Copy className="w-3.5 h-3.5 text-gray-400" /> Copy Sequence
                 </button>
                 <button className="w-full bg-[#1A1D23] border border-gray-700 hover:border-gray-500 hover:bg-[#1E232A] text-gray-300 text-[11px] py-2.5 rounded flex items-center px-4 gap-3 transition-colors"
                   onClick={() => {
                     const seqRaw = reverseComplement ? getReverseComplement(data.baseCalls) : data.baseCalls;
                     const text = `>${fileName}\n${seqRaw}`;
                     const blob = new Blob([text], {type: "text/plain"});
                     const a = document.createElement('a');
                     a.href = URL.createObjectURL(blob);
                     a.download = `${fileName}.fasta`;
                     a.click();
                   }}
                 >
                   <Download className="w-3.5 h-3.5 text-gray-400" /> Download FASTA
                 </button>
                 <button className="w-full bg-[#1A1D23] border border-gray-700 hover:border-gray-500 hover:bg-[#1E232A] text-gray-300 text-[11px] py-2.5 rounded flex items-center px-4 gap-3 transition-colors"
                  onClick={() => {
                    const text = reverseComplement ? getReverseComplement(data.baseCalls) : data.baseCalls;
                    const blob = new Blob([text], {type: "text/plain"});
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${fileName}.txt`;
                    a.click();
                  }}
                 >
                   <Download className="w-3.5 h-3.5 text-gray-400" /> Download TXT
                 </button>
               </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0E1117] h-full overflow-y-auto">
        {/* Header content only visible when data is loaded */}
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {!data && !error && (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] opacity-70">
              <AudioWaveform className="w-16 h-16 text-gray-800 mb-4" />
              <p className="text-gray-500">Upload a trace file from the sidebar to begin</p>
            </div>
          )}

          {data && stats && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-500">
               {/* Head section */}
               <div className="flex justify-between items-start">
                 <div>
                   <h1 className="text-xl font-bold flex items-center gap-3">
                     <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 
                     {fileName}
                   </h1>
                   <div className="text-sm text-gray-500 mt-1 ml-5">
                     {stats.length} bases • {stats.tracePoints.toLocaleString()} trace points
                   </div>
                 </div>
               </div>

               {/* File Information Cards */}
               <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-5">
                 <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   File Information
                 </div>
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                   <StatCard label="SAMPLE" value={fileName.split('.')[0]} />
                   <StatCard label="LENGTH" value={`${stats.length} bp`} />
                   <StatCard label="TRACE POINTS" value={stats.tracePoints.toLocaleString()} />
                   <StatCard label="GC CONTENT" value={stats.gcContent} />
                   <StatCard label="AVG QUALITY" value={stats.avgQuality} />
                   <StatCard label=">Q20" value={stats.q20} />
                   <StatCard label=">Q30" value={stats.q30} />
                   <StatCard label="INSTRUMENT" value="ABIF Sequence Trace" />
                 </div>
               </div>

               {/* Electropherogram Plot */}
               <div className="w-full">
                  <ChromatogramViewer 
                    data={data} 
                    showQuality={showQuality}
                    showHeterozygous={showHeterozygous}
                    hetThreshold={hetThreshold}
                    searchQuery={searchQuery}
                    reverseComplement={reverseComplement}
                    focusedBaseIndex={focusedBaseIndex}
                  />
               </div>

               <SequenceViewer 
                 data={data} 
                 showHeterozygous={showHeterozygous}
                 reverseComplement={reverseComplement}
                 setReverseComplement={setReverseComplement}
                 hetThreshold={hetThreshold}
                 searchQuery={searchQuery}
                 setSearchQuery={setSearchQuery}
                 onBaseClick={setFocusedBaseIndex}
               />
            </div>
          )}
        </div>
      </main>
      
      {copyMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1D23] text-gray-200 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide shadow-2xl z-50 flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {copyMessage}
        </div>
      )}
    </div>
  );
}

function ToggleSetting({ label, subtext, enabled, onChange }: { label: string, subtext?: string, enabled: boolean, onChange: () => void }) {
  return (
    <div className="flex items-center justify-between cursor-pointer group" onClick={onChange}>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-gray-200 group-hover:text-white transition-colors">{label}</span>
        {subtext && <span className="text-[10px] text-gray-500 leading-tight block mt-0.5">{subtext}</span>}
      </div>
      <div className={`w-9 h-5 rounded-full relative transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-700'}`}>
        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${enabled ? 'right-1' : 'left-1'}`}></div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="bg-[#12161E] rounded-md p-3 border border-gray-800/60 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider w-full">{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-200 truncate" title={typeof value === 'string' ? value : undefined}>{value}</div>
    </div>
  );
}

