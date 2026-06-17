// Inspect a GrowthZone .xlsx export: prints sheet names, headers, row count,
// and a couple of sample rows so we can map columns into the DB importer.
// Usage: node scripts/inspect-gz-export.mjs "C:\\path\\to\\Export.xlsx"
import XLSX from "xlsx";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/inspect-gz-export.mjs <path-to-xlsx>");
  process.exit(1);
}

const wb = XLSX.readFile(file);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
  console.log("===== SHEET:", name, "=====");
  console.log("TOTAL ROWS (incl header):", rows.length);
  console.log("HEADERS:", JSON.stringify(rows[0]));
  console.log("SAMPLE ROW 1:", JSON.stringify(rows[1]));
  console.log("SAMPLE ROW 2:", JSON.stringify(rows[2]));
  console.log("DATA ROWS (excl header):", Math.max(0, rows.length - 1));
}
