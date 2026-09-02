import { Router } from "express";
import { previewCsv } from "../controllers/preview.controller.js";

const router = Router();

router.post("/", previewCsv);

export default router;
