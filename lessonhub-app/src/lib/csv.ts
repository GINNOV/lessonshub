// file: src/lib/csv.ts

export function parseCsv(content: string): string[][] {
  const normalizedContent = content.replace(/\uFEFF/g, '');
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;
  let quoteChar: '"' | '\u201C' | null = null;
  let nestedSmartQuotes = 0;
  const leftSmartQuote = '\u201C';
  const rightSmartQuote = '\u201D';

  for (let i = 0; i < normalizedContent.length; i++) {
    const char = normalizedContent[i];
    const next = normalizedContent[i + 1];

    const isOpeningQuote =
      !inQuotes && (char === '"' || char === leftSmartQuote) && currentField.length === 0;
    if (isOpeningQuote) {
      inQuotes = true;
      quoteChar = char === leftSmartQuote ? leftSmartQuote : '"';
      nestedSmartQuotes = 0;
      continue;
    }

    if (inQuotes && quoteChar) {
      const closingChar = quoteChar === leftSmartQuote ? rightSmartQuote : '"';
      if (quoteChar === leftSmartQuote && char === leftSmartQuote) {
        nestedSmartQuotes += 1;
        currentField += char;
        continue;
      }
      if (char === closingChar) {
        if (quoteChar === leftSmartQuote && nestedSmartQuotes > 0) {
          nestedSmartQuotes -= 1;
          currentField += char;
          continue;
        }
        if (quoteChar === '"' && next === '"') {
          currentField += '"';
          i++;
          continue;
        }
        if (next === ',' || next === '\n' || next === '\r' || next === undefined) {
          inQuotes = false;
          quoteChar = null;
          continue;
        }
      }
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && normalizedContent[i + 1] === '\n') {
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
