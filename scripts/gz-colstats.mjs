// Column statistics for a GrowthZone .xlsx export — fill rates, distinct counts,
// and value distributions for key columns. Does NOT print individual PII rows.
// Usage: node scripts/gz-colstats.mjs "C:\\path\\to\\Export.xlsx" [distributionColumn ...]
import XLSX from "xlsx";

const file = process.argv[2];
const distCols = process.argv.slice(3);
const wb = XLSX.readFile(file, { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
console.log("FILE:", file);
console.log("DATA ROWS:", rows.length);
const cols = Object.keys(rows[0] || {});

console.log("\nCOLUMN FILL / CARDINALITY:");
for (const c of cols) {
  let filled = 0;
  const distinct = new Set();
  for (const r of rows) {
    const s = r[c] === null || r[c] === undefined ? "" : String(r[c]).trim();
    if (s !== "") filled++;
    distinct.add(s);
  }
  console.log(`- ${c}: filled ${filled}/${rows.length}, distinct ${distinct.size}`);
}

for (const col of distCols) {
  const dist = {};
  for (const r of rows) {
    const k = (r[col] === null || r[col] === undefined ? "" : String(r[col]).trim()) || "(blank)";
    dist[k] = (dist[k] || 0) + 1;
  }
  console.log(`\nDISTRIBUTION — ${col}:`);
  for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${v.toString().padStart(4)}  ${k}`);
  }
}
