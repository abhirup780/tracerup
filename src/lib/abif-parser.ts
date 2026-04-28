export interface ABIFData {
  A: number[];
  T: number[];
  G: number[];
  C: number[];
  baseCalls: string;
  peakPositions: number[];
  qualities: number[];
}

export function parseABIF(buffer: ArrayBuffer): ABIFData {
  const dataView = new DataView(buffer);
  
  // 1. Check signature
  const sig = String.fromCharCode(
    dataView.getUint8(0), dataView.getUint8(1),
    dataView.getUint8(2), dataView.getUint8(3)
  );
  if (sig !== 'ABIF') throw new Error("Invalid ABIF file signature. Make sure this is a valid .ab1 file.");
  
  // 2. Read Root DirEntry from header (offset 6)
  // DirEntry is 28 bytes
  const entrySize = dataView.getInt16(6 + 10);
  const numEntries = dataView.getInt32(6 + 12);
  let dirOffset = dataView.getInt32(6 + 20); // DataOffset
  
  const entries: {name: string, number: number, type: number, size: number, numElements: number, dataSize: number, offset: number, dataOffset: number}[] = [];
  
  for (let i = 0; i < numEntries; i++) {
    const offset = dirOffset + i * entrySize;
    if (offset + 28 > dataView.byteLength) break;

    const name = String.fromCharCode(
      dataView.getUint8(offset), dataView.getUint8(offset+1),
      dataView.getUint8(offset+2), dataView.getUint8(offset+3)
    );
    const number = dataView.getInt32(offset + 4);
    const type = dataView.getInt16(offset + 8);
    const elementSize = dataView.getInt16(offset + 10);
    const numElements = dataView.getInt32(offset + 12);
    const dataSize = dataView.getInt32(offset + 16);
    const doffset = dataView.getInt32(offset + 20);
    
    entries.push({
      name, number, type, size: elementSize, numElements, dataSize, offset, dataOffset: doffset
    });
  }

  // Helpers to read data
  const readArray = (entry: any) => {
    let actualOffset = entry.dataSize <= 4 ? entry.offset + 20 : entry.dataOffset;
    if (actualOffset < 0 || actualOffset >= dataView.byteLength) return [];

    if (entry.type === 4) { // short
      const res = new Array(entry.numElements);
      for(let i=0; i<entry.numElements; i++) {
        if (actualOffset + i*2 + 2 <= dataView.byteLength) {
          res[i] = dataView.getInt16(actualOffset + i*2);
        } else {
          res[i] = 0;
        }
      }
      return res;
    }
    if (entry.type === 2 || entry.type === 1) { // char or byte
       const res = new Array(entry.numElements);
      for(let i=0; i<entry.numElements; i++) {
         if (actualOffset + i + 1 <= dataView.byteLength) {
          res[i] = dataView.getUint8(actualOffset + i);
         } else {
          res[i] = 0;
         }
      }
      return res;
    }
    return [];
  };

  const readString = (entry: any) => {
    const arr = readArray(entry);
    return arr.map(c => String.fromCharCode(c)).join('');
  }

  // Extract FWO_ 1 for order of bases
  const fwoEntry = entries.find(e => e.name === 'FWO_' && e.number === 1);
  const fwo = fwoEntry ? readString(fwoEntry) : "GATC"; // Default is usually GATC

  const data9 = entries.find(e => e.name === 'DATA' && e.number === 9);
  const data10 = entries.find(e => e.name === 'DATA' && e.number === 10);
  const data11 = entries.find(e => e.name === 'DATA' && e.number === 11);
  const data12 = entries.find(e => e.name === 'DATA' && e.number === 12);

  const traces = [
    data9 ? readArray(data9) : [],
    data10 ? readArray(data10) : [],
    data11 ? readArray(data11) : [],
    data12 ? readArray(data12) : [],
  ];

  const abifData: ABIFData = { A: [], T: [], G: [], C: [], baseCalls: '', peakPositions: [], qualities: [] };

  for (let i = 0; i < 4; i++) {
    let base = fwo.charAt(i).toUpperCase();
    if (base === 'A') abifData.A = traces[i];
    if (base === 'G') abifData.G = traces[i];
    if (base === 'C') abifData.C = traces[i];
    if (base === 'T') abifData.T = traces[i];
  }

  const pbas1 = entries.find(e => e.name === 'PBAS' && e.number === 1) || entries.find(e => e.name === 'PBAS' && e.number === 2);
  if (pbas1) abifData.baseCalls = readString(pbas1);

  const ploc1 = entries.find(e => e.name === 'PLOC' && e.number === 1) || entries.find(e => e.name === 'PLOC' && e.number === 2);
  if (ploc1) abifData.peakPositions = readArray(ploc1);

  const pcon1 = entries.find(e => e.name === 'PCON' && e.number === 1) || entries.find(e => e.name === 'PCON' && e.number === 2);
  if (pcon1) abifData.qualities = readArray(pcon1);

  return abifData;
}

export function getIupacCode(bases: string[]): string {
    const set = new Set(bases);
    if (set.has('A') && set.has('C') && set.has('G') && set.has('T')) return 'N';
    if (set.has('A') && set.has('G') && set.has('T')) return 'D';
    if (set.has('A') && set.has('C') && set.has('T')) return 'H';
    if (set.has('A') && set.has('C') && set.has('G')) return 'V';
    if (set.has('C') && set.has('G') && set.has('T')) return 'B';
    if (set.has('A') && set.has('G')) return 'R';
    if (set.has('C') && set.has('T')) return 'Y';
    if (set.has('G') && set.has('C')) return 'S';
    if (set.has('A') && set.has('T')) return 'W';
    if (set.has('G') && set.has('T')) return 'K';
    if (set.has('A') && set.has('C')) return 'M';
    if (bases.length === 1) return bases[0];
    return 'N';
}

export function getReverseComplement(sequence: string): string {
    const complement: Record<string, string> = {
        'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C', 'N': 'N',
        'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M', 'M': 'K',
        'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D'
    };
    return sequence.split('').reverse().map(base => complement[base.toUpperCase()] || base).join('');
}
