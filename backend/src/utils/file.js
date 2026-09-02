import fs from 'fs';
import path from 'path';

/**
 * Ensure required directories exist synchronously on app startup
 */
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Sanitize user uploaded filenames to prevent path traversal
 */
export function sanitizeFileName(filename) {
  if (!filename) return `file_${Date.now()}`;
  // Remove directory traversal tokens and non-alphanumeric chars except dots/dashes
  const basename = path.basename(filename);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Extract file extension safely
 */
export function getFileExtension(filename) {
  if (!filename) return '';
  const ext = path.extname(filename).toLowerCase();
  return ext ? ext.substring(1) : '';
}

/**
 * Remove file safely without throwing if missing
 */
export async function removeFileSafely(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    // Ignore error if file doesn't exist
  }
}
