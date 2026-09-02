import busboy from "busboy";
import csvParser from "csv-parser";
import { config } from "../config/env.js";

export async function previewCsv(req, res, next) {
  try {
    let bb;
    try {
      bb = busboy({
        headers: req.headers,
        limits: { files: 1 }
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: { message: "Malformed multipart upload request" }
      });
    }

    let columns = [];
    const rows = [];
    const MAX_PREVIEW_ROWS = 1000;
    let fileFound = false;

    bb.on("file", (fieldname, fileStream) => {
      if (fieldname !== "file") {
        fileStream.resume();
        return;
      }

      fileFound = true;
      const parser = csvParser();

      parser.on("headers", (headers) => {
        columns = headers;
      });

      parser.on("data", (data) => {
        if (rows.length < MAX_PREVIEW_ROWS) {
          rows.push(data);
          if (columns.length === 0 && data) {
            columns = Object.keys(data);
          }
        } else {
          fileStream.unpipe(parser);
          fileStream.resume();
        }
      });

      parser.on("error", (err) => {
        fileStream.resume();
      });

      fileStream.pipe(parser);
    });

    bb.on("finish", () => {
      if (!fileFound) {
        return res.status(400).json({
          success: false,
          error: { message: "No CSV file provided in field 'file'" }
        });
      }

      return res.status(200).json({
        success: true,
        columns,
        rows,
        totalPreviewRows: rows.length
      });
    });

    bb.on("error", (err) => {
      return res.status(500).json({
        success: false,
        error: { message: `Preview parsing error: ${err.message}` }
      });
    });

    req.pipe(bb);
  } catch (error) {
    next(error);
  }
}
