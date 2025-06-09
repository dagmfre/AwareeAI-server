import express from "express";
import {
  // shareDoc,
  getPublicDocs,
  getDocCategories,
  getDocTags,
  addToLibrary,
  removeFromLibrary,
  getUserLibrary,
  isInLibrary,
  searchPublicDoc,
  searchUserLibrary,
} from "../controllers/sharedDocsController";
import auth from "../middleware/auth";

const router = express.Router();

// Share doc (kept for manual sharing if needed)
// router.post("/", auth, shareDoc);

// Get public docs
router.get("/public", getPublicDocs);

// Get doc categories and tags
router.get("/categories", getDocCategories);
router.get("/tags", getDocTags);

// Get specific shared doc
router.get("/search-public", searchPublicDoc);

// Library management
router.get("/library", auth, getUserLibrary);
router.get("/search-library", auth, searchUserLibrary);
router.post("/library/:sharedDocId", auth, addToLibrary);
router.delete("/library/:documentId", auth, removeFromLibrary);
router.get("/library/check/:documentId", auth, isInLibrary);

export default router;
