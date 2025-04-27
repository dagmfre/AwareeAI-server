import { Request, Response, NextFunction } from "express";
import r2r from "../config/r2r";
import User from "../models/User";
import { WrappedDocumentsResponse } from "r2r-js";

// Search across user's documents
export const searchDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = 10, offset = 0 } = req.body;

    // Verify user exists and has documents
    const user = await User.findById(req?.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.r2rDocumentIds || user.r2rDocumentIds.length === 0) {
      res.json({ results: [], total: 0 });
      return;
    }

    // Fetch all documents
    try {
      const searchResults: WrappedDocumentsResponse = await r2r.documents.list({
        limit: limit,
        offset: offset,
        ids: user.r2rDocumentIds,
      });

      res.json({
        results: searchResults.results,
        total: searchResults.totalEntries,
      });
      return;
    } catch (error) {
      console.error("Error retrieving documents:", error);
      res.json({ results: [], total: 0 });
      return;
      // Results are returned in the try/catch block above
      res.json({ results: [], total: 0 });
    }
  } catch (err) {
    next(err);
  }
};

// Search for a single document by title
export const searchSingleDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title } = req.params;

    if (!title) {
      res.status(400).json({ message: "Document title is required" });
      return;
    }

    // Verify user exists and has documents
    const user = await User.findById(req?.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.r2rDocumentIds || user.r2rDocumentIds.length === 0) {
      res.json([]);
      return;
    }

    // Fetch document details from R2R
    const documents = [];

    // Retrieve all user documents
    for (const docId of user.r2rDocumentIds) {
      try {
        const document = await r2r.documents.retrieve({ id: docId });
        documents.push(document.results);
      } catch (error) {
        console.error(`Error retrieving document ${docId}:`, error);
      }
    }

    // Search by title (case-insensitive)
    const foundDocument = documents.find((doc) =>
      doc.metadata.title?.toLowerCase().includes(title.toLowerCase())
    );

    if (!foundDocument) {
      res.status(404).json({ message: "Document not found" });
      return;
    }

    res.json(foundDocument);
  } catch (err) {
    next(err);
  }
};
