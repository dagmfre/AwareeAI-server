import express from "express";
import { getSharedDocuments } from "../controllers/documentController";

const router = express.Router();

// GET /shared-docs   - List all public/shared documents with uploader info
router.get("/", getSharedDocuments);

export default router;
