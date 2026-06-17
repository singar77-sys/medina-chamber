// Verify two GrowthZone exports join on a shared key column.
// Usage: node scripts/gz-join-check.mjs <fileA.xlsx> <fileB.xlsx> <keyColumn>
import XLSX from "xlsx";

function load(file, key) {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const set = new Set();
  let blank = 0;
  for (const r of rows) {
    const v = String(r[key] ?? "").trim();
    if (v === "") blank++;
    else set.add(v);
  }
  return { rows: rows.length, set, blank };
}

const [a, b, key] = process.argv.slice(2);
const A = load(a, key);
const B = load(b, key);
let inB = 0;
const missing = [];
for (const k of A.set) {
  if (B.set.has(k)) inB++;
  else if (missing.length < 10) missing.push(k);
}
console.log("KEY:", key);
console.log("A:", a, "\n  rows", A.rows, "| distinct keys", A.set.size, "| blank", A.blank);
console.log("B:", b, "\n  rows", B.rows, "| distinct keys", B.set.size, "| blank", B.blank);
console.log(`A keys found in B: ${inB} / ${A.set.size}`);
console.log("A keys NOT found in B (sample):", JSON.stringify(missing));
