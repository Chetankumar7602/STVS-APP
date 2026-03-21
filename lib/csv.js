function escapeCsvValue(value) {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function buildCsv(rows, headers) {
  const headerLine = headers.map((header) => escapeCsvValue(header.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((header) => escapeCsvValue(row[header.key])).join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}
