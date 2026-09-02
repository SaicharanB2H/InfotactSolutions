import split2 from 'split2';
import { Transform } from 'node:stream';

/**
 * Creates a streaming JSON / NDJSON parser stream.
 * Processes items line-by-line using split2 backpressure.
 */
export function createJsonStream() {
  const lineSplitter = split2();
  
  const objectParser = new Transform({
    objectMode: true,
    transform(line, encoding, callback) {
      let trimmed = line.toString().trim();
      if (!trimmed) return callback();

      // Clean leading [ or trailing ] or trailing commas if JSON array format
      if (trimmed.startsWith('[')) trimmed = trimmed.substring(1).trim();
      if (trimmed.endsWith(']')) trimmed = trimmed.substring(0, trimmed.length - 1).trim();
      if (trimmed.endsWith(',')) trimmed = trimmed.substring(0, trimmed.length - 1).trim();

      if (!trimmed) return callback();

      try {
        const obj = JSON.parse(trimmed);
        if (typeof obj === 'object' && obj !== null) {
          this.push(obj);
        }
        callback();
      } catch (err) {
        // Skip malformed individual line without crashing stream
        callback();
      }
    }
  });

  lineSplitter.pipe(objectParser);

  // Return composable stream pair
  return {
    writable: lineSplitter,
    readable: objectParser
  };
}
