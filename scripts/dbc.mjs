/* A reader for the vanilla DBC client database format.
 *
 * Every .dbc is a flat table: a 20-byte header, fixed-size records of 4-byte
 * fields, then one string block. A field holding text stores a byte offset
 * into that block. Column meanings are not in the file — they are in
 * `doll-build.mjs`, pinned against real rows rather than a doc.
 */

import { readFileSync } from "node:fs";

export function readDbc(path) {
  const b = readFileSync(path);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== "WDBC") throw new Error(`${path}: not a DBC (magic ${JSON.stringify(magic)})`);

  const nRec = dv.getUint32(4, true);
  const nField = dv.getUint32(8, true);
  const recSize = dv.getUint32(12, true);
  const sbSize = dv.getUint32(16, true);
  const sbOff = 20 + nRec * recSize;

  // A real string offset lands just past a NUL. Small integers in numeric
  // columns can look like valid offsets, so callers must know which columns
  // hold text — this only guards against reading off the end.
  const str = (off) => {
    if (off <= 0 || off >= sbSize) return "";
    let s = "";
    for (let i = sbOff + off; i < b.length; i++) {
      const c = dv.getUint8(i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  const rows = [];
  for (let r = 0; r < nRec; r++) {
    const o = 20 + r * recSize;
    const f = new Array(nField);
    for (let c = 0; c < nField; c++) f[c] = dv.getUint32(o + c * 4, true);
    rows.push(f);
  }
  return { nRec, nField, recSize, rows, str };
}
