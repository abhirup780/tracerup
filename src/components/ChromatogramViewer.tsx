import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { ABIFData, getIupacCode } from "@/lib/abif-parser";
import type { Layout } from "plotly.js";
import { Maximize, Minimize, AlignJustify, AlignLeft } from "lucide-react";

interface ChromatogramViewerProps {
  data: ABIFData;
  showQuality: boolean;
  showHeterozygous: boolean;
  hetThreshold: number;
  searchQuery: string;
  reverseComplement: boolean;
  focusedBaseIndex: number | null;
  onBaseClick?: (index: number) => void;
}

export function ChromatogramViewer({ data, showQuality, showHeterozygous, hetThreshold, searchQuery, reverseComplement, focusedBaseIndex, onBaseClick }: ChromatogramViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [xRange, setXRange] = useState<[number, number]>([0, Math.min(data.A.length, 1200)]);
  const BASES_PER_LINE = 80;

  React.useEffect(() => {
    if (focusedBaseIndex !== null && data.peakPositions[focusedBaseIndex] !== undefined) {
      const pos = data.peakPositions[focusedBaseIndex];
      // Zoom around this pos, window of 250 frames
      setXRange([Math.max(0, pos - 125), Math.min(data.A.length, pos + 125)]);
      setIsMultiline(false);
    }
  }, [focusedBaseIndex, data]);

  // Auto-focus on search query if exactly one match
  React.useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) return;
    let query = searchQuery.toUpperCase().replace(/[^A-Z]/g, '');
    if (query.length === 0) return;
    
    if (reverseComplement) {
        const comp: Record<string, string> = {
            'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C', 'N': 'N',
            'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M', 'M': 'K',
            'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D'
        };
        query = query.split('').reverse().map(base => comp[base] || base).join('');
    }

    const seqStr = data.baseCalls.toUpperCase();
    let pos = seqStr.indexOf(query);
    const matches = [];
    
    while (pos !== -1) {
       matches.push(pos);
       pos = seqStr.indexOf(query, pos + 1);
    }
    
    if (matches.length > 0) {
      // Zoom to the first match
      const matchIndex = matches[0];
      const middleBaseIndex = matchIndex + Math.floor(query.length / 2);
      if (data.peakPositions[middleBaseIndex] !== undefined) {
        const peakPos = data.peakPositions[middleBaseIndex];
        setXRange([Math.max(0, peakPos - 150), Math.min(data.A.length, peakPos + 150)]);
      }
    }
  }, [searchQuery, data, reverseComplement]);

  const analyzedBases = useMemo(() => {
    const bases = [];
    for (let i = 0; i < data.baseCalls.length; i++) {
      const pos = data.peakPositions[i];
      if (pos === undefined || pos < 0 || pos >= data.A.length) continue;
      
      const signals = {
        A: data.A[pos],
        C: data.C[pos],
        G: data.G[pos],
        T: data.T[pos],
      };
      
      const sorted = Object.entries(signals).sort((a, b) => b[1] - a[1]);
      const primary = sorted[0];
      const secondary = sorted[1];
      
      let isAmbiguous = false;
      let computedBase = primary[0];
      
      // Fixed threshold dynamically provided
      if (primary[1] > 0 && (secondary[1] / primary[1]) > hetThreshold) {
        if (showHeterozygous) {
          isAmbiguous = true;
          computedBase = getIupacCode([primary[0], secondary[0]]);
        }
      }
      
      bases.push({
        position: pos,
        index: i,
        base: data.baseCalls[i],
        quality: data.qualities[i] || 0,
        computedBase,
        isAmbiguous,
        signals
      });
    }
    return bases;
  }, [data, showHeterozygous, hetThreshold]);

  const highlightShapes = useMemo(() => {
     if (!searchQuery || searchQuery.length < 2) return [];
     let query = searchQuery.toUpperCase().replace(/[^A-Z]/g, '');
     if (query.length === 0) return [];
     
     if (reverseComplement) {
        const comp: Record<string, string> = {
            'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C', 'N': 'N',
            'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M', 'M': 'K',
            'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D'
        };
        query = query.split('').reverse().map(base => comp[base] || base).join('');
     }

     const seqStr = data.baseCalls.toUpperCase();
     let pos = seqStr.indexOf(query);
     const shapes = [];
     
     while (pos !== -1) {
        const startBase = analyzedBases.find(b => b.index === pos);
        const endBase = analyzedBases.find(b => b.index === pos + query.length - 1);
        if (startBase && endBase) {
           shapes.push({
              type: 'rect',
              xref: 'x',
              yref: 'paper',
              x0: startBase.position - 4,
              x1: endBase.position + 4,
              y0: 0,
              y1: 1,
              fillcolor: 'rgba(16, 185, 129, 0.15)', // emerald
              line: { width: 1, color: 'rgba(16, 185, 129, 0.5)' }
           });
        }
        pos = seqStr.indexOf(query, pos + 1);
     }
     return shapes;
  }, [searchQuery, analyzedBases, data.baseCalls, reverseComplement]);

  const x_array = Array.from({ length: data.A.length }, (_, i) => i);
  
  const traces: any[] = [
    {
      x: x_array,
      y: data.G,
      type: 'scatter',
      mode: 'lines',
      name: 'G',
      line: { color: '#94A3B8', width: 1.2 },
      opacity: 0.9,
      hoverinfo: 'none'
    },
    {
      x: x_array,
      y: data.A,
      type: 'scatter',
      mode: 'lines',
      name: 'A',
      line: { color: '#22C55E', width: 1.2 },
      opacity: 0.9,
      hoverinfo: 'none'
    },
    {
      x: x_array,
      y: data.T,
      type: 'scatter',
      mode: 'lines',
      name: 'T',
      line: { color: '#EF4444', width: 1.2 },
      opacity: 0.9,
      hoverinfo: 'none'
    },
    {
      x: x_array,
      y: data.C,
      type: 'scatter',
      mode: 'lines',
      name: 'C',
      line: { color: '#3B82F6', width: 1.2 },
      opacity: 0.9,
      hoverinfo: 'none'
    }
  ];

  const yMaxA = Math.max(...data.A);
  const yMaxC = Math.max(...data.C);
  const yMaxG = Math.max(...data.G);
  const yMaxT = Math.max(...data.T);
  const globalMax = Math.max(yMaxA, yMaxC, yMaxG, yMaxT);

  if (showQuality && data.qualities && data.qualities.length === data.baseCalls.length) {
    traces.unshift({
      x: analyzedBases.map(b => b.position),
      y: analyzedBases.map(b => b.quality),
      type: 'bar',
      xaxis: 'x2',
      yaxis: 'y2',
      width: 11,
      marker: { 
        color: analyzedBases.map(b => {
          if (b.quality >= 30) return 'rgba(34, 197, 94, 0.1)'; // emerald
          if (b.quality >= 20) return 'rgba(234, 179, 8, 0.1)';  // yellow
          return 'rgba(239, 68, 68, 0.1)'; // red
        })
      },
      name: 'Quality',
      hoverinfo: 'none'
    });
  }

  // Heterozygous highlighting shapes
  const hetShapes: any[] = analyzedBases.filter(b => b.isAmbiguous).map(b => ({
    type: 'rect',
    xref: 'x',
    yref: 'paper',
    x0: b.position - 3,
    x1: b.position + 3,
    y0: 0,
    y1: 1,
    fillcolor: 'rgba(234, 179, 8, 0.15)', // yellow-500 with opacity
    line: { width: 1, color: 'rgba(234, 179, 8, 0.4)', dash: 'dot' }
  }));

  const allShapes = [...hetShapes, ...highlightShapes];

  const baseAnnotations = {
    x: analyzedBases.map(b => b.position),
    y: analyzedBases.map(b => -globalMax * 0.05),
    xaxis: 'x2',
    mode: 'text',
    text: analyzedBases.map(b => b.computedBase),
    customdata: analyzedBases.map(b => b.index),
    textfont: {
      family: 'monospace',
      size: 11,
      color: analyzedBases.map(b => {
        if (b.isAmbiguous) return '#EAB308'; // yellow-500
        if (b.computedBase === 'A') return '#22C55E';
        if (b.computedBase === 'T') return '#EF4444';
        if (b.computedBase === 'C') return '#3B82F6';
        return '#94A3B8';
      })
    },
    name: 'Bases',
    hoverinfo: 'none'
  };

  const plotData = [...traces, baseAnnotations] as any;

  const layout: Partial<Layout> = {
    plot_bgcolor: 'transparent', 
    paper_bgcolor: 'transparent',
    autosize: true,
    margin: { t: 10, r: 10, l: 50, b: 20 },
    xaxis: {
      showgrid: false,
      zeroline: false,
      tickfont: { color: '#64748b' },
      range: xRange,
      rangeslider: {
        visible: true,
        thickness: 0.1,
        bgcolor: '#0F131A',
        bordercolor: '#1E293B'
      }
    },
    xaxis2: {
      overlaying: 'x',
      matches: 'x',
      showgrid: false,
      zeroline: false,
      showticklabels: false
    },
    yaxis: {
      showgrid: true,
      gridcolor: 'rgba(255, 255, 255, 0.05)',
      fixedrange: true,
      zeroline: false,
      range: [-globalMax * 0.1, globalMax * 1.1],
      title: 'Fluorescence (RFU)',
      titlefont: { color: '#64748b', size: 10 },
      tickfont: { color: '#64748b', size: 10 }
    },
    yaxis2: {
      overlaying: 'y',
      side: 'right',
      range: [-8, 88],
      showgrid: false,
      zeroline: false,
      showticklabels: false,
      fixedrange: true
    },
    shapes: allShapes,
    showlegend: false,
    dragmode: 'pan',
    hovermode: 'closest'
  };

  const handlePlotClick = (e: any) => {
    if (e.points && e.points.length > 0) {
        const point = e.points.find((p: any) => p.data.name === 'Bases');
        if (point && point.customdata !== undefined) {
             const baseIndex = point.customdata;
             if (onBaseClick) onBaseClick(baseIndex);
             const pos = point.x;
             setXRange([Math.max(0, pos - 125), Math.min(data.A.length, pos + 125)]);
             setIsMultiline(false);
        }
    }
  };

  const renderContent = () => {
    if (!isMultiline) {
       return (
          <Plot
            onClick={handlePlotClick}
            onHover={(e) => {
               if (e.points && e.points.some((p: any) => p.data.name === 'Bases')) {
                   document.body.classList.add('force-pointer');
               }
            }}
            onUnhover={() => {
                document.body.classList.remove('force-pointer');
            }}
            data={plotData}
            layout={layout}
            onRelayout={(e) => {
              if (e['xaxis.range[0]'] !== undefined && e['xaxis.range[1]'] !== undefined) {
                 setXRange([e['xaxis.range[0]'], e['xaxis.range[1]']]);
              }
            }}
            config={{ 
              responsive: true, 
              displayModeBar: true,
              modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian'],
              displaylogo: false,
            }}
            style={{ width: '100%', height: '100%', flex: 1, minHeight: isFullscreen ? '0' : '100%' }}
            useResizeHandler={true}
          />
       );
    }

    const chunks = [];
    for (let i = 0; i < analyzedBases.length; i += BASES_PER_LINE) {
       chunks.push(analyzedBases.slice(i, i + BASES_PER_LINE));
    }

    const firstChunkStart = Math.max(0, chunks[0][0].position - 20);
    const firstChunkEnd = chunks[0][chunks[0].length - 1].position + 20;
    const chunkRangeLength = firstChunkEnd - firstChunkStart;

    return (
       <div className="flex-1 w-full overflow-y-auto pt-16 pb-4 px-2 sm:px-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {chunks.map((chunk, idx) => {
             const startPos = Math.max(0, chunk[0].position - 20);
             const endPos = startPos + chunkRangeLength;
             
             const chunkShapes = allShapes.filter(s => 
               s.x0 <= endPos && s.x1 >= startPos
             );
             
             const chunkLayout = {
                ...layout,
                dragmode: false,
                xaxis: {
                    ...layout.xaxis,
                    range: [startPos, endPos],
                    rangeslider: { visible: false },
                    showticklabels: false,
                },
                margin: { t: 5, r: 10, l: 40, b: 5 },
                shapes: chunkShapes,
             };

             return (
                <div key={idx} className="w-full h-[180px] 2xl:h-[220px] mb-4 2xl:mb-6 border-b border-gray-800/50 pb-4 shrink-0">
                   <div className="text-[10px] text-gray-500 font-mono mb-1 ml-10">Bases {chunk[0].index + 1} - {chunk[chunk.length - 1].index + 1}</div>
                   <Plot
                     onClick={handlePlotClick}
                     onHover={(e) => {
                        if (e.points && e.points.some((p: any) => p.data.name === 'Bases')) {
                            document.body.classList.add('force-pointer');
                        }
                     }}
                     onUnhover={() => {
                         document.body.classList.remove('force-pointer');
                     }}
                     data={plotData}
                     layout={chunkLayout as any}
                     config={{ 
                        responsive: true, 
                        displayModeBar: false,
                        displaylogo: false,
                     }}
                     style={{ width: '100%', height: 'calc(100% - 20px)' }}
                     useResizeHandler={true}
                   />
                </div>
             );
          })}
       </div>
    );
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-[#0E1117] flex flex-col p-4 md:p-8" : "w-full flex flex-col min-h-[350px] xl:min-h-[450px] 2xl:min-h-[600px] relative rounded-lg"}>
      <div className={`w-full h-full flex flex-col relative bg-[#090B0F] border ${isFullscreen ? 'border-gray-700 shadow-2xl flex-1 rounded-xl overflow-hidden' : 'border-gray-800 min-h-[350px] xl:min-h-[450px] 2xl:min-h-[600px] rounded-lg overflow-hidden'}`}>
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          <div className="flex items-center gap-2 sm:gap-3 bg-[#0B0E14]/90 backdrop-blur border border-gray-800 px-2 sm:px-3 py-1.5 rounded text-[10px] sm:text-[11px] 2xl:text-xs uppercase font-bold tracking-wider text-gray-400">
             <span className="flex items-center gap-1"><span className="w-2 h-2 2xl:w-2.5 2xl:h-2.5 rounded bg-[#22C55E]"></span>A <span className="lowercase font-normal text-gray-600 hidden sm:inline">(Ade)</span></span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 2xl:w-2.5 2xl:h-2.5 rounded bg-[#3B82F6]"></span>C <span className="lowercase font-normal text-gray-600 hidden sm:inline">(Cyto)</span></span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 2xl:w-2.5 2xl:h-2.5 rounded bg-[#94A3B8]"></span>G <span className="lowercase font-normal text-gray-600 hidden sm:inline">(Gua)</span></span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 2xl:w-2.5 2xl:h-2.5 rounded bg-[#EF4444]"></span>T <span className="lowercase font-normal text-gray-600 hidden sm:inline">(Thy)</span></span>
          </div>
          <button 
            type="button"
            onClick={() => setIsMultiline(!isMultiline)} 
            className={`bg-[#0B0E14]/90 backdrop-blur border border-gray-800 p-1.5 2xl:p-2 rounded hover:bg-gray-800 transition-colors cursor-pointer ${isMultiline ? 'text-emerald-400' : 'text-gray-400 hover:text-white'}`}
            title={isMultiline ? "Single Line View" : "Multiline View"}
          >
            {isMultiline ? <AlignLeft className="w-4 h-4 2xl:w-5 2xl:h-5" /> : <AlignJustify className="w-4 h-4 2xl:w-5 2xl:h-5" />}
          </button>
          <button 
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="bg-[#0B0E14]/90 backdrop-blur border border-gray-800 p-1.5 2xl:p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 2xl:w-5 2xl:h-5" /> : <Maximize className="w-4 h-4 2xl:w-5 2xl:h-5" />}
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
