// file: src/lib/csv.ts

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (!inQuotes && currentField.length === 0) {
        inQuotes = true;
        continue;
      }
      if (inQuotes && next === '"') {
        currentField += '"';
        i++;
        continue;
      }
      if (inQuotes && (next === ',' || next === '\n' || next === '\r' || next === undefined)) {
        inQuotes = false;
        continue;
      }
      currentField += '"';
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((field) => field.trim().length));
}
