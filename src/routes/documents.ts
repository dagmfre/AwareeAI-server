import express from "express";
import auth from "../middleware/auth";
import upload from "../middleware/upload";
import {
  uploadDocument,
  deleteDocument,
  uploadDocumentFromUrl,
  getSingleUserDoc,
  getAllUserDocs,
} from "../controllers/documentController";

const router = express.Router();

// Upload document file
router.post("/upload", auth, upload.single("file"), uploadDocument);

// Upload document file from URL
router.post("/upload-url", auth, uploadDocumentFromUrl);

// Search all user documents
router.get("/all-docs", auth, getAllUserDocs);

// Search for inline document mention
router.get("/single-doc", auth, getSingleUserDoc);

// Delete document
router.delete("/:documentId", auth, deleteDocument);

export default router;
