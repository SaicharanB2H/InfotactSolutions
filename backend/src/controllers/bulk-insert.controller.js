import mongoose from "mongoose";

export async function bulkInsertRecords(req, res, next) {
  try {
    const { records, jobId, destinationCollection } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "No records provided for bulk insert."
        }
      });
    }

    const collectionName = destinationCollection || (jobId ? `job_${jobId.replace(/-/g, "_")}` : "bulk_imports");
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "MongoDB database connection unavailable."
        }
      });
    }

    const collection = db.collection(collectionName);
    const bulkOps = records.map((doc) => ({
      insertOne: { document: doc }
    }));

    const result = await collection.bulkWrite(bulkOps, { ordered: false });

    return res.status(200).json({
      success: true,
      message: `${result.insertedCount || records.length} records inserted successfully into ${collectionName}.`,
      insertedCount: result.insertedCount || records.length,
      collection: collectionName
    });
  } catch (error) {
    next(error);
  }
}
