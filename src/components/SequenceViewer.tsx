import React, { useMemo, useState } from "react";
import { ABIFData, getIupacCode } from "@/lib/abif-parser";
import { Search } from "lucide-react";

interface SequenceViewerProps {
  data: ABIFData;
  showHeterozygous: boolean;
  reverseComplement: boolean;
  setReverseComplement: (val: boolean) => void;
  hetThreshold: number;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onBaseClick: (originalIndex: number) => void;
}

export function SequenceViewer({ 
  data, 
  showHeterozygous, 
  reverseComplement, 
  setReverseComplement, 
  hetThreshold,
  searchQuery,
  setSearchQuery,
  onBaseClick
}: SequenceViewerProps) {
  const sequenceStr = useMemo(() => {
    let seq = "";
    for (let i = 0; i < data.baseCalls.length; i++) {
        const pos = data.peakPositions[i];
        if (pos === undefined) {
             seq += data.baseCalls[i];
             continue;
        }
        
        let char = data.baseCalls[i];
        if (showHeterozygous) {
            const signals = { A: data.A[pos], C: data.C[pos], G: data.G[pos], T: data.T[pos] };
            const sorted = Object.entries(signals).sort((a, b) => b[1] - a[1]);
            const primary = sorted[0];
            const secondary = sorted[1];
            if (primary[1] > 0 && (secondary[1] / primary[1]) > hetThreshold) {
                char = getIupacCode([primary[0], secondary[0]]);
            }
        }
        seq += char;
    }
    
    if (reverseComplement) {
        const comp: Record<string, string> = {
            'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C', 'N': 'N',
            'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M', 'M': 'K',
            'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D'
        };
        return seq.split('').reverse().map(base => comp[base.toUpperCase()] || base).join('');
    }
    
    return seq;
  }, [data, showHeterozygous, reverseComplement, hetThreshold]);

  // Group sequence into blocks of 10
  const blocks = useMemo(() => {
    const chars = sequenceStr.split('');
    const res = [];
    for (let i = 0; i < chars.length; i += 10) {
      res.push({
        startIndex: i + 1,
        bases: chars.slice(i, i + 10)
      });
    }
    return res;
  }, [sequenceStr]);

  const highlightIndices = useMemo(() => {
     const indices = new Set<number>();
     if (!searchQuery || searchQuery.length < 2) return indices;
     const upperQuery = searchQuery.toUpperCase().replace(/[^A-Z]/g, '');
     if (upperQuery.length === 0) return indices;

     let pos = sequenceStr.toUpperCase().indexOf(upperQuery);
     while (pos !== -1) {
        for (let i = 0; i < upperQuery.length; i++) {
           indices.add(pos + i);
        }
         pos = sequenceStr.toUpperCase().indexOf(upperQuery, pos + 1);
     }
     return indices;
  }, [sequenceStr, searchQuery]);

  return (
    <div className="flex border border-gray-800 rounded-lg p-5 bg-[#0B0E14] flex-col mt-4 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          Sequence Track
        </span>
        <div className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded flex items-center tracking-widest">{sequenceStr.length} bases</div>
        
        <div className="ml-auto flex items-center gap-6">
          <div className="relative group">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search sequence..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#1A1D23] border border-gray-700 text-xs px-3 py-1.5 pl-9 rounded focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-gray-200 placeholder:text-gray-600 transition-all w-48"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer group select-none" onClick={() => setReverseComplement(!reverseComplement)}>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${reverseComplement ? 'bg-emerald-500' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${reverseComplement ? 'right-1' : 'left-1'}`}></div>
            </div>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider group-hover:text-gray-200 transition-colors">Reverse Complement</span>
          </label>
        </div>
      </div>
      
      <div className="font-mono text-[13px] tracking-[0.2em] select-auto">
        <div 
          className="grid gap-x-2 gap-y-4 pb-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))' }}
        >
          {blocks.map((block, b_idx) => (
            <div key={b_idx} className="flex items-center">
              <span className="text-gray-600 text-[10px] tracking-normal w-[36px] shrink-0 select-none font-sans text-right mr-3 opacity-50">{block.startIndex}</span>
              <div className="flex">
                {block.bases.map((char, i) => {
                  const globalIndex = block.startIndex - 1 + i;
                  const isHighlighted = highlightIndices.has(globalIndex);
                  
                  let colorClass = "text-gray-400";
                  if (char === 'A') colorClass = "text-[#22C55E]"; // Green
                  else if (char === 'T') colorClass = "text-[#EF4444]"; // Red
                  else if (char === 'C') colorClass = "text-[#3B82F6]"; // Blue
                  else if (char === 'G') colorClass = "text-gray-300"; // Light almost white/yellow for G -> let's make it standard G color. Let's refer to the screenshot, G appears white/light gray.
                  else if (char !== 'N') colorClass = "text-amber-400 font-semibold underline decoration-amber-500/80 decoration-[2px] underline-offset-4"; // Heterozygous
                  
                  return (
                    <span key={i} className={`
                      ${colorClass} cursor-pointer hover:font-bold transition-all
                      ${isHighlighted ? 'bg-emerald-500/30 ring-1 ring-emerald-500/60 rounded px-[1px]' : ''}
                    `} onClick={() => {
                       const originalIndex = reverseComplement ? data.baseCalls.length - 1 - globalIndex : globalIndex;
                       onBaseClick(originalIndex);
                    }}>
                      {char}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
