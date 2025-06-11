import { Request, Response } from "express";
import prisma from "../config/prismaClient";

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { title, r2rDocumentId, summary, tags, category } = req.body;
    // Handle file via middleware if using file upload (supabase, s3, etc.)

    const newDoc = await prisma.sharedDoc.create({
      data: {
        title,
        r2rDocumentId,
        summary,
        tags,
        category,
        originalOwnerId: req.userId!,
      }
    });
    res.status(201).json(newDoc);
  } catch (e) {
    res.status(400).json({ error: "Failed to upload document: " + e.message });
  }
};

export const getUserDocuments = async (req: Request, res: Response) => {
  try {
    const docs = await prisma.sharedDoc.findMany({
      where: { originalOwnerId: req.userId! }
    });
    res.json(docs);
  } catch (e) {
    res.status(400).json({ error: "Failed to get documents" });
  }
};

export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const doc = await prisma.sharedDoc.findUnique({
      where: { id: req.params.documentId }
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: "Failed to get document" });
  }
};