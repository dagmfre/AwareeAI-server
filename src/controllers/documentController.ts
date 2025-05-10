import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import r2r from "../config/r2r";
import User from "../models/User";
import SharedDoc from "../models/SharedDoc";
import crypto from "crypto";
import isDuplicateContent from "../utils/isDuplicate";
import { WrappedDocumentsResponse } from "r2r-js";

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

    // Check for duplicate content
    const duplicateDocId = await isDuplicateContent(filePath);
    if (duplicateDocId) {
      // If duplicate exists, add it to user's documents instead of uploading again
      await User.findByIdAndUpdate(req?.user?._id, {
        $addToSet: {
          r2rDocumentIds: duplicateDocId,
          docsLibrary: duplicateDocId, // Add to library automatically
        },
      });

      // Delete the uploaded file since we're not using it
      fs.unlinkSync(filePath);

      res.status(200).json({
        message: "Document already exists and has been added to your documents",
        documentId: duplicateDocId,
        isDuplicate: true,
      });
      return;
    }

    // Upload to R2R
    const uploadResponse = await r2r.documents.create({
      file: filePath,
      metadata: {
        title: req.file.originalname,
      },
    });

    if (!uploadResponse || !uploadResponse.results.documentId) {
      throw new Error("Failed to upload document to R2R");
    }

    const documentId = uploadResponse.results.documentId;

    // Generate content hash for duplicate detection
    const fileContent = fs.readFileSync(filePath);
    const contentHash = crypto
      .createHash("sha256")
      .update(fileContent)
      .digest("hex");

    // Update user's document IDs
    await User.findByIdAndUpdate(req?.user?._id, {
      $addToSet: {
        r2rDocumentIds: documentId,
        docsLibrary: documentId,
      },
    });

    // Extract tags and category from request body
    const { tags = [], category = "uncategorized" } = req.body;

    // Automatically create shared document entry
    const sharedDoc = new SharedDoc({
      title: req.file.originalname,
      r2rDocumentId: documentId,
      originalOwner: req?.user?._id,
      tags: tags,
      category: category,
      contentHash: contentHash,
    });

    await sharedDoc.save();

    // Delete temporary file after upload
    fs.unlinkSync(filePath);

    res.status(201).json({
      message: "Document uploaded successfully",
      documentId: documentId,
      sharedDocId: sharedDoc._id,
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

    // Check if a document with this URL already exists
    const existingDoc = await SharedDoc.findOne({ "metadata.source_url": url });
    if (existingDoc) {
      // If document with this URL exists, add it to user's documents instead of uploading again
      await User.findByIdAndUpdate(req?.user?._id, {
        $addToSet: {
          r2rDocumentIds: existingDoc.r2rDocumentId,
          docsLibrary: existingDoc.r2rDocumentId,
        },
      });

      res.status(200).json({
        message:
          "Document from this URL already exists and has been added to your documents",
        documentId: existingDoc.r2rDocumentId,
        sharedDocId: existingDoc._id,
        isDuplicate: true,
      });
      return;
    }

    // Now ask r2r to format the content properly
    const formatResult = await r2r.retrieval.agent({
      message: {
        role: "user",
        content: `Please get the content from this URL and format it. Do not summarize, paraphrase, or omit any information. Keep 100% of the original text content intact. Only improve the formatting by organizing into proper headings, paragraphs, lists, code blocks, etc. Preserve all original titles, paragraphs, bullet points, code snippets, and other structural elements exactly as they appear. Here's the URL: \n\n${url}`,
      },
      mode: "rag",
      ragTools: ["web_scrape"],
      ragGenerationConfig: {
        model: "openai/gpt-4o",
        temperature: 0,
        stream: false,
      },
    });

    // Get the formatted content
    const formattedContent =
      formatResult.results.messages[formatResult.results.messages.length - 1]
        .content;

    // Create a temporary file
    const tempFilePath = path.join(
      __dirname,
      "../../uploads/",
      `${Date.now()}-scraped-doc.txt`
    );
    fs.writeFileSync(tempFilePath, formattedContent);

    // Check for duplicate content
    const duplicateDocId = await isDuplicateContent(tempFilePath);
    if (duplicateDocId) {
      // If duplicate exists, add it to user's documents instead of uploading again
      await User.findByIdAndUpdate(req?.user?._id, {
        $addToSet: {
          r2rDocumentIds: duplicateDocId,
          docsLibrary: duplicateDocId,
        },
      });

      // Delete the temporary file
      fs.unlinkSync(tempFilePath);

      res.status(200).json({
        message: "Document already exists and has been added to your documents",
        documentId: duplicateDocId,
        isDuplicate: true,
      });
      return;
    }

    // Upload to R2R
    const uploadResponse = await r2r.documents.create({
      file: tempFilePath,
      metadata: { title: title || url, source_url: url },
    });

    const documentId = uploadResponse.results.documentId;

    // Generate content hash for duplicate detection
    const fileContent = fs.readFileSync(tempFilePath);
    const contentHash = crypto
      .createHash("sha256")
      .update(fileContent)
      .digest("hex");

    // Delete temporary file
    fs.unlinkSync(tempFilePath);

    // Update user's document IDs
    await User.findByIdAndUpdate(req?.user?._id, {
      $addToSet: {
        r2rDocumentIds: documentId,
        docsLibrary: documentId,
      },
    });

    const { tags = [], category = "uncategorized" } = req.body;

    // Automatically create shared document entry
    const sharedDoc = new SharedDoc({
      title: title || url,
      r2rDocumentId: documentId,
      originalOwner: req?.user?._id,
      tags: tags,
      category: category,
      contentHash: contentHash,
      metadata: { source_url: url },
    });

    await sharedDoc.save();

    res.status(201).json({
      message: "Document from URL uploaded successfully",
      documentId: documentId,
      sharedDocId: sharedDoc._id,
    });
  } catch (err) {
    next(err);
  }
};

// Search across user's documents
export const getAllUserDocs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = 10, offset = 0 } = req.params;

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
        limit: limit as number,
        offset: offset as number,
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
export const getSingleUserDoc = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, id } = req.query as { title?: string; id?: string };

    // Check if at least one search parameter is provided
    if (!title && !id) {
      res
        .status(400)
        .json({ message: "Either document title or id is required" });
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

    // If ID is provided, we can directly fetch the document
    if (id && user.r2rDocumentIds.includes(id)) {
      try {
        const document = await r2r.documents.retrieve({ id });
        res.json(document.results);
        return;
      } catch (error) {
        console.error(`Error retrieving document ${id}:`, error);
        res.status(404).json({ message: "Document not found" });
        return;
      }
    }

    // If only title is provided or if ID search failed, search by title
    if (title) {
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

      // Normalize the search query by trimming spaces
      const normalizedTitle = title.trim().toLowerCase();

      // Find all documents that match the title search (case-insensitive)
      const matchingDocuments = documents.filter((doc) =>
        doc.metadata.title?.toLowerCase().includes(normalizedTitle)
      );

      if (matchingDocuments.length === 0) {
        res.status(404).json({ message: "Document not found" });
        return;
      }

      // Return all matching documents
      res.json({
        documents: matchingDocuments,
        count: matchingDocuments.length,
      });
      return;
    }

    // If we reach here with an ID, it means the ID was not in the user's document list
    res.status(404).json({ message: "Document not found" });
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
      $pull: {
        r2rDocumentIds: documentId,
        docsLibrary: documentId,
      },
    });

    // Remove from shared documents if it exists
    await SharedDoc.deleteMany({ r2rDocumentId: documentId });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    next(err);
  }
};
