import { Request, Response, NextFunction } from "express";
import SharedDoc from "../models/SharedDoc";
import User from "../models/User";
import r2r from "../config/r2r";

// Share a document
export const shareDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { documentId, title, description, isPublic, tags, category } =
      req.body;

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

    // Create shared document record
    const sharedDoc = new SharedDoc({
      title,
      description,
      r2rDocumentId: documentId,
      originalOwner: req?.user?._id,
      isPublic,
      tags: tags || [],
      category,
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

// Get all public shared documents
export const getPublicDocuments = async (
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
    const filter: { isPublic: boolean; category?: any; tags?: any } = {
      isPublic: true,
    };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.tag) {
      filter.tags = Array.isArray(req.query.tag)
        ? req.query.tag
        : [req.query.tag];
    }

    // Get shared documents
    const sharedDocs = await SharedDoc.find(filter)
      .populate("originalOwner", "name email")
      .sort({ dateShared: -1 })
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
      },
    });
  } catch (err) {
    next(err);
  }
};

// Add document to user's library
export const addToLibrary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sharedDocId } = req.params;

    // Find the shared doc
    const sharedDoc = await SharedDoc.findById(sharedDocId);
    if (!sharedDoc) {
      res.status(404).json({ message: "Shared document not found" });
      return;
    }

    // Check if it's public or shared with this user
    const userHasAccess =
      sharedDoc.isPublic ||
      sharedDoc.sharedWith.includes(req?.user?._id) ||
      sharedDoc.originalOwner.equals(req?.user?._id);

    if (!userHasAccess) {
      res
        .status(403)
        .json({ message: "You do not have access to this document" });
      return;
    }

    // Add to user's shared documents
    await User.findByIdAndUpdate(req?.user?._id, {
      $addToSet: { sharedWithMe: sharedDocId },
    });

    // Also add user to shared with array if not already there
    if (
      !sharedDoc.sharedWith.includes(req?.user?._id) &&
      !sharedDoc.originalOwner.equals(req?.user?._id)
    ) {
      sharedDoc.sharedWith.push(req?.user?._id);
      await sharedDoc.save();
    }

    res.json({ message: "Document added to your library" });
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
    const user = await User.findById(req?.user?._id).populate({
      path: "sharedWithMe",
      populate: {
        path: "originalOwner",
        select: "name email",
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      library: user.sharedWithMe,
    });
  } catch (err) {
    next(err);
  }
};
