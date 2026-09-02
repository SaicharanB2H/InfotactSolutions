import csvParser from 'csv-parser';

/**
 * Creates a streaming CSV parser stream.
 * Converts raw bytes into record objects line-by-line.
 */
export function createCsvStream(options = {}) {
  return csvParser({
    strict: false,
    mapHeaders: ({ header }) => header ? header.trim() : header,
    ...options
  });
}
