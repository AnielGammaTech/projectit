/**
 * Shared CSV export utility.
 * Follows the quoting pattern from TimeReport.jsx for robustness.
 */

function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  // Escape double quotes by doubling them, then wrap in quotes
  return `"${str.replace(/"/g, '""')}"`;
}

function buildCsvString(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) =>
    row.map(escapeCsvCell).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

function triggerDownload(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Build a CSV from headers + rows and trigger a browser download.
 * @param {string} filename - e.g. "all-assets-2026-04-13.csv"
 * @param {string[]} headers - column header strings
 * @param {Array<Array<string|number>>} rows - array of row arrays
 */
export function downloadCSV(filename, headers, rows) {
  const csv = buildCsvString(headers, rows);
  triggerDownload(csv, filename);
}
