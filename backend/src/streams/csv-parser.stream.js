const csvParser = require('csv-parser');

/**
 * Creates a stream that parses raw CSV binary/string data into objects.
 * @param {object} options - Custom options for csv-parser
 * @returns {Transform} A stream transforming text chunks to parsed row objects
 */
function createCsvParserStream(options = {}) {
  return csvParser({
    // Enable custom configurations if needed (delimiters, strict modes, headers)
    skipComments: true,
    ...options
  });
}

module.exports = {
  createCsvParserStream
};
