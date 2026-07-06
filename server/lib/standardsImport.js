import XLSX from 'xlsx';

// Parses a substation code/standards reference spreadsheet (one tab per code
// family - IEEE/NESC/NERC/etc - each with a title row, a description row, a
// header row, then data rows) into a flat list of rows ready for the
// `standards` table. Column layout varies slightly per tab (NESC has no
// Priority column; the Acronym sheet has neither Category nor Priority), so
// columns are located by header text rather than fixed position, and the
// "START HERE" overview tab (pure narrative, no tabular data) is skipped.
function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

function findHeaderRowIndex(rows) {
  for (let i = 0; i < rows.length; i++) {
    const norm = rows[i].map(normalize);
    if (norm.includes('reference link') || norm.includes('source')) return i;
  }
  return -1;
}

function colIndexOf(headerRow, candidates) {
  const norm = headerRow.map(normalize);
  for (const c of candidates) {
    const idx = norm.indexOf(c);
    if (idx !== -1) return idx;
  }
  return -1;
}

function cellLink(sheet, r, c) {
  if (c === -1) return null;
  const addr = XLSX.utils.encode_cell({ r, c });
  return sheet[addr]?.l?.Target || null;
}

export function parseStandardsWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const results = [];
  let sortOrder = 0;

  for (const sheetName of wb.SheetNames) {
    if (normalize(sheetName) === 'start here') continue;
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headerIdx = findHeaderRowIndex(rows);
    if (headerIdx === -1) continue;
    const header = rows[headerIdx];

    const idx = {
      category: colIndexOf(header, ['category']),
      code: colIndexOf(header, ['standard #', 'nesc part / section', 'acronym']),
      title: colIndexOf(header, ['title / subject', 'meaning']),
      covers: colIndexOf(header, ['covers']),
      why: colIndexOf(header, ['why it matters on site']),
      notes: colIndexOf(header, ['notes']),
      priority: colIndexOf(header, ['priority']),
      link: colIndexOf(header, ['reference link', 'source']),
    };

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.every(v => String(v).trim() === '')) continue;

      const code = idx.code !== -1 ? String(row[idx.code] || '').trim() : '';
      const rawTitle = idx.title !== -1 ? String(row[idx.title] || '').trim() : '';
      // NESC-style sheets have no separate title column - the code/section
      // name doubles as the title.
      const title = rawTitle || code;
      if (!title) continue;

      const detailParts = [];
      if (idx.covers !== -1 && row[idx.covers]) detailParts.push(String(row[idx.covers]).trim());
      if (idx.why !== -1 && row[idx.why]) detailParts.push(String(row[idx.why]).trim());
      if (idx.notes !== -1 && row[idx.notes]) detailParts.push(`Notes: ${String(row[idx.notes]).trim()}`);

      results.push({
        source: sheetName,
        category: idx.category !== -1 ? (String(row[idx.category] || '').trim() || null) : null,
        code: code || null,
        title,
        detail: detailParts.join('\n\n') || null,
        priority: idx.priority !== -1 ? (String(row[idx.priority] || '').trim().toUpperCase() || null) : null,
        link: cellLink(sheet, r, idx.link),
        sort_order: sortOrder++,
      });
    }
  }

  return results;
}
