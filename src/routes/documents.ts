import express from "express";
import auth from "../middleware/auth";
import upload from "../middleware/upload";
import {
  uploadDocument,
  getUserDocuments,
  deleteDocument,
  uploadDocumentFromUrl,
} from "../controllers/documentController";

const router = express.Router();

// Upload document file
router.post("/upload", auth, upload.single("document"), uploadDocument);

// Upload document file from URL
router.post("/upload-url", auth, uploadDocumentFromUrl);

// Get user documents
router.get("/", auth, getUserDocuments);

// Delete document
router.delete("/:documentId", auth, deleteDocument);

export default router;
