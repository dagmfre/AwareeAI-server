import { Request, Response, NextFunction } from "express";
import SharedDoc from "../models/SharedDoc";
import User from "../models/User";

// Share a document (may still be useful for manually updating sharing status)
export const shareDoc = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { documentId, title, tags, category } = req.body;

    // Verify that the user owns this document
    const user = await User.findById(req?.user?._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.r2rDocumentIds.includes(documentId)) {
      res.status(403).json({ message: "You can only share documents you own" });
      return;
    }

    // Check if document is already shared
    const existingSharedDoc = await SharedDoc.findOne({
      r2rDocumentId: documentId,
    });

    if (existingSharedDoc) {
      // Update existing shared document
      existingSharedDoc.title = title || existingSharedDoc.title;
      existingSharedDoc.tags = tags || existingSharedDoc.tags;
      existingSharedDoc.category = category || existingSharedDoc.category;
      existingSharedDoc.updatedAt = new Date();

      await existingSharedDoc.save();

      res.status(200).json({
        message: "Shared document updated successfully",
        sharedDoc: existingSharedDoc,
      });
      return;
    }

    // Create shared document record
    const sharedDoc = new SharedDoc({
      title,
      r2rDocumentId: documentId,
      originalOwner: req?.user?._id,
      tags: tags || [],
      category: category || "uncategorized",
    });

    await sharedDoc.save();

    res.status(201).json({
      message: "Document shared successfully",
      sharedDoc,
    });
  } catch (err) {
    next(err);
  }
};

// Get all shared documents
export const getPublicDocs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter: { category?: any; tags?: any; title?: any } = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.tag) {
      filter.tags = Array.isArray(req.query.tag)
        ? { $in: req.query.tag }
        : { $in: [req.query.tag] };
    }

    // Search by title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }

    // Get shared documents
    const sharedDocs = await SharedDoc.find(filter)
      .populate("originalOwner", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalDocs = await SharedDoc.countDocuments(filter);

    res.json({
      documents: sharedDocs,
      pagination: {
        total: totalDocs,
        page,
        pages: Math.ceil(totalDocs / limit),
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get document categories for filtering
export const getDocCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await SharedDoc.distinct("category");
    res.json({ categories });
  } catch (err) {
    next(err);
  }
};

// Get document tags for filtering
export const getDocTags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tags = await SharedDoc.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags" } },
      { $project: { _id: 0, tag: "$_id" } },
    ]);

    res.json({ tags: tags.map((item) => item.tag) });
  } catch (err) {
    next(err);
  }
};

// Get a specific shared document
export const getSinglePublicDoc = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, id } = req.query as { title?: string; id?: string };

    // If ID is provided and not "search", find by ID or r2rDocumentId
    if (id && id !== "search") {
      let document = await SharedDoc.findById(id).populate(
        "originalOwner",
        "name email"
      );

      if (!document) {
        // If not found by ID, check if it's possibly a r2rDocumentId
        document = await SharedDoc.findOne({
          r2rDocumentId: id,
        }).populate("originalOwner", "name email");
      }

      if (document) {
        res.json({ document });
        return;
      }
    }

    // If title is provided, search by title
    if (title) {
      // Normalize the search query by trimming spaces
      const normalizedTitle = title.trim();

      // Find all documents that match the title search
      const documents = await SharedDoc.find({
        title: { $regex: normalizedTitle, $options: "i" },
      }).populate("originalOwner", "name email");

      if (documents && documents.length > 0) {
        // Return multiple documents if multiple matches are found
        res.json({
          documents,
          count: documents.length,
        });
        return;
      }
    }

    res.status(404).json({ message: "Document not found" });
  } catch (err) {
    next(err);
  }
};

// Add shared document to user's library
export const addToLibrary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sharedDocId } = req.params;

    // Find the shared document
    const sharedDoc = await SharedDoc.findById(sharedDocId);

    if (!sharedDoc) {
      res.status(404).json({ message: "Shared document not found" });
      return;
    }

    // Add the document to the user's library
    await User.findByIdAndUpdate(req?.user?._id, {
      $addToSet: { docsLibrary: sharedDoc.r2rDocumentId },
    });

    res.status(200).json({
      message: "Document added to library successfully",
      documentId: sharedDoc.r2rDocumentId,
    });
  } catch (err) {
    next(err);
  }
};

// Remove document from user's library
export const removeFromLibrary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { documentId } = req.params;

    // Remove the document from the user's library
    const user = await User.findByIdAndUpdate(
      req?.user?._id,
      { $pull: { docsLibrary: documentId } },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      message: "Document removed from library successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Get user's library
export const getUserLibrary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get user with library
    const user = await User.findById(req?.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.docsLibrary || user.docsLibrary.length === 0) {
      res.json({
        documents: [],
        pagination: {
          total: 0,
          page,
          pages: 0,
          limit,
        },
      });
      return;
    }

    // Get the paginated set of document IDs
    const paginatedIds = user.docsLibrary.slice(skip, skip + limit);

    // Get document details from SharedDoc
    const libraryDocs = await SharedDoc.find({
      r2rDocumentId: { $in: paginatedIds },
    }).populate("originalOwner", "name email");

    // Count total documents
    const totalDocs = user.docsLibrary.length;

    res.json({
      documents: libraryDocs,
      pagination: {
        total: totalDocs,
        page,
        pages: Math.ceil(totalDocs / limit),
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Check if a document is in user's library
export const isInLibrary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { documentId } = req.params;

    const user = await User.findById(req?.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isInLibrary = user.docsLibrary.includes(documentId);

    res.json({ isInLibrary });
  } catch (err) {
    next(err);
  }
};
