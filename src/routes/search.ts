import express from "express";
import {
  searchDocuments,
  searchSingleDocument,
} from "../controllers/searchController";
import auth from "../middleware/auth";

const router = express.Router();

// Search documents
router.post("/", auth, searchDocuments);

// Search for inline document mention
router.get("/:title", auth, searchSingleDocument);

export default router;
