// One-time/manual CLI import: node scripts/import-standards.js <path-to-xlsx>
// The same parsing logic backs the in-app "Update from spreadsheet" upload
// on the Reference > Codes tab, so this script is only needed if you'd
// rather import from the command line than the browser.
import fs from 'fs';
import db from '../lib/db.js';
import { parseStandardsWorkbook } from '../lib/standardsImport.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/import-standards.js <path-to-xlsx>');
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const rows = parseStandardsWorkbook(buffer);
if (rows.length === 0) {
  console.error('No recognizable data found in that spreadsheet.');
  process.exit(1);
}

const insert = db.prepare(`
  INSERT INTO standards (source, category, code, title, detail, priority, link, sort_order)
  VALUES (@source, @category, @code, @title, @detail, @priority, @link, @sort_order)
`);
const replaceAll = db.transaction((items) => {
  db.prepare('DELETE FROM standards').run();
  for (const item of items) insert.run(item);
});
replaceAll(rows);

console.log(`Imported ${rows.length} entries from ${filePath}.`);
const bySource = {};
for (const r of rows) bySource[r.source] = (bySource[r.source] || 0) + 1;
for (const [source, count] of Object.entries(bySource)) console.log(`  ${source}: ${count}`);
