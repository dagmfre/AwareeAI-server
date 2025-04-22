import { Request, Response, NextFunction } from "express";
import r2r from "../config/r2r";
import User from "../models/User";
import SharedDoc from "../models/SharedDoc";
import { WrappedDocumentsResponse } from "r2r-js";

// Search across user's documents
export const searchDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ids, limit = 10, offset = 0 } = req.body;

    // Set up search settings
    const searchFilters = {
      limit: parseInt(limit),
      offset: 0,
      ids: ids,
    };

    // Perform search
    const searchResults: WrappedDocumentsResponse = await r2r.documents.list(
      searchFilters
    );

    // Return results
    res.json({
      results: searchResults.results,
      total: searchResults.totalEntries,
    });
  } catch (err) {
    next(err);
  }
};

// Search documents by mentioning with @
export const searchInlineDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query } = req.body;

    // Get user's documents
    const user = await User.findById(req?.user?._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get shared documents
    const sharedDocs = await SharedDoc.find({
      $or: [
        { isPublic: true },
        { sharedWith: req?.user?._id },
        { originalOwner: req?.user?._id },
      ],
    }).populate("originalOwner", "name");

    // For inline search, we're searching document titles/metadata, not content
    const ownedDocs = [];

    // Get document details from R2R for owned docs
    for (const docId of user.r2rDocumentIds) {
      try {
        const doc = await r2r.documents.get({ id: docId });
        ownedDocs.push({
          id: docId,
          title: doc.metadata?.title || "Untitled",
          owner: "You",
          isOwned: true,
        });
      } catch (err) {
        console.error(`Failed to fetch document ${docId}:`, err);
      }
    }

    // Format shared docs
    const formattedSharedDocs = sharedDocs.map((doc) => ({
      id: doc.r2rDocumentId,
      title: doc.title,
      owner: doc.originalOwner.name,
      isOwned: doc.originalOwner._id.toString() === req?.user?._id.toString(),
    }));

    // Combine and filter by query
    const allDocs = [...ownedDocs, ...formattedSharedDocs];

    const filteredDocs = query
      ? allDocs.filter((doc) =>
          doc.title.toLowerCase().includes(query.toLowerCase())
        )
      : allDocs;

    // Return formatted results for inline mention
    res.json({
      documents: filteredDocs.slice(0, 10), // Limit to 10 results for inline mention
    });
  } catch (err) {
    next(err);
  }
};
