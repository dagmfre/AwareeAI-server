import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import r2r from "../config/r2r";
import User from "../models/User";
import SharedDoc from "../models/SharedDoc";
import { url } from "inspector";

// Upload document to SciPhi Cloud
export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const filePath = req.file.path;

    // Upload to R2R
    const uploadResponse = await r2r.documents.create({
      file: filePath,
    });

    if (!uploadResponse || !uploadResponse.results.documentId) {
      throw new Error("Failed to upload document to R2R");
    }

    // Update user's document IDs
    await User.findByIdAndUpdate(req?.user?._id, {
      $push: { r2rDocumentIds: uploadResponse.results.documentId },
    });

    // Delete temporary file after upload
    fs.unlinkSync(filePath);

    res.status(201).json({
      message: "Document uploaded successfully",
      documentId: uploadResponse.results.documentId,
    });
  } catch (err) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

export const uploadDocumentFromUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { url, title } = req.body;

    if (!url) {
      res.status(400).json({ message: "URL is required" });
      return;
    }

    // Use R2R's web_scrape function through the agent interface
    const scrapeResult = await r2r.retrieval.agent({
      message: {
        role: "user",
        content: `Please get the content from this URL: ${url}`,
      },
      mode: "rag",
      ragTools: ["web_scrape"],
      ragGenerationConfig: {
        model: "openai/gpt-4o",
        temperature: 0,
        stream: false,
      },
    });

    // Extract the content from the response
    const content =
      scrapeResult.results.messages[scrapeResult.results.messages.length - 1]
        .content;

    // Create a temporary file
    const tempFilePath = path.join(
      __dirname,
      "../uploads/",
      `${Date.now()}-scraped-doc.txt`
    );
    fs.writeFileSync(tempFilePath, content);

    // Upload to R2R
    const uploadResponse = await r2r.documents.create({
      file: tempFilePath,
      metadata: { title: title || url, source_url: url },
    });

    // Delete temporary file
    fs.unlinkSync(tempFilePath);

    // Update user's document IDs
    await User.findByIdAndUpdate(req?.user?._id, {
      $push: { r2rDocumentIds: uploadResponse.results.documentId },
    });

    res.status(201).json({
      message: "Document from URL uploaded successfully",
      documentId: uploadResponse.results.documentId,
    });
  } catch (err) {
    next(err);
  }
};

// Get user documents
export const getUserDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
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

    for (const docId of user.r2rDocumentIds) {
      try {
        const docDetails = await r2r.documents.retrieve({ id: docId });
        documents.push(docDetails);
      } catch (err) {
        console.error(`Failed to fetch document ${docId}:`, err);
        // Continue with next document even if one fails
      }
    }

    res.json(documents);
  } catch (err) {
    next(err);
  }
};

// Delete user document
export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { documentId } = req.params;

    // Check if document exists
    const user = await User.findById(req?.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.r2rDocumentIds.includes(documentId)) {
      res
        .status(404)
        .json({ message: "Document not found or not owned by user" });
      return;
    }

    // Delete from R2R
    await r2r.documents.delete({ id: documentId });

    // Update user's document IDs
    await User.findByIdAndUpdate(req?.user?._id, {
      $pull: { r2rDocumentIds: documentId },
    });

    // Remove from shared documents if it exists
    await SharedDoc.deleteMany({ r2rDocumentId: documentId });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    next(err);
  }
};
