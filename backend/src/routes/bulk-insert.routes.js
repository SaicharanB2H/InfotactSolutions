import { Router } from "express";
import { bulkInsertRecords } from "../controllers/bulk-insert.controller.js";

const router = Router();

router.post("/", bulkInsertRecords);

export default router;
