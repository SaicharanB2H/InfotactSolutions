const { Transform } = require('stream');

/**
 * MappingStream transforms row objects by renaming keys according to a mapping configuration.
 */
class MappingStream extends Transform {
  /**
   * @param {Array<{source: string, destination: string}>} mappings 
   * @param {object} options 
   */
  constructor(mappings, options = {}) {
    // We must enable objectMode for structural object streaming
    super({ objectMode: true, ...options });
    this.mappings = mappings;
  }

  _transform(row, encoding, callback) {
    try {
      const mappedRow = {};
      
      for (const mapping of this.mappings) {
        const { source, destination } = mapping;
        if (row[source] !== undefined) {
          mappedRow[destination] = row[source];
        }
      }

      this.push(mappedRow);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = MappingStream;
