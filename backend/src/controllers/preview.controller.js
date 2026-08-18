const Busboy = require('busboy');
const { createCsvParserStream } = require('../streams/csv-parser.stream');
const logger = require('../utils/logger');

/**
 * Controller to extract the first 1000 rows of an uploaded CSV without saving to disk or reading the entire file.
 */
function getCsvPreview(req, res, next) {
  try {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: { message: 'Invalid Content-Type, must be multipart/form-data' } });
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1 } // Only expect one file
    });

    let columns = [];
    const rows = [];
    let responded = false;

    busboy.on('file', (fieldname, fileStream, info) => {
      logger.info('Processing streaming CSV preview...');
      
      const csvStream = createCsvParserStream();

      // Retrieve column headers as soon as they are parsed
      csvStream.on('headers', (headers) => {
        columns = headers;
      });

      csvStream.on('data', (row) => {
        if (rows.length < 1000) {
          rows.push(row);
        }

        // If we reach 1,000 rows, cut off transmission and respond
        if (rows.length >= 1000 && !responded) {
          responded = true;
          
          // CRITICAL: Unpipe and destroy stream nodes immediately to prevent V8 heap accumulation
          fileStream.unpipe(csvStream);
          csvStream.destroy();
          fileStream.destroy();
          req.unpipe(busboy);
          busboy.destroy();

          logger.info('CSV preview hit limit of 1000 rows. Aborted parsing further.');
          
          return res.status(200).json({
            columns,
            rows,
            totalPreviewRows: rows.length
          });
        }
      });

      csvStream.on('end', () => {
        if (!responded) {
          responded = true;
          res.status(200).json({
            columns,
            rows,
            totalPreviewRows: rows.length
          });
        }
      });

      csvStream.on('error', (error) => {
        logger.error({ error }, 'Error parsing CSV during preview');
        if (!responded) {
          responded = true;
          res.status(400).json({ error: { message: `CSV Parsing error: ${error.message}` } });
        }
      });

      fileStream.pipe(csvStream);
    });

    busboy.on('error', (error) => {
      logger.error({ error }, 'Busboy multipart parse error during preview');
      if (!responded) {
        responded = true;
        next(error);
      }
    });

    req.pipe(busboy);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCsvPreview
};
