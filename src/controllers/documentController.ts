import { Request, Response } from "express";
import * as documentService from "../services/documentService";
import r2rClient from "../config/r2r";
import { logger } from "../utils/logger";
import FormData from "form-data";

export const upload = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const file = req.file;
    const { title, description, isPublic } = req.body;
    if (!file) return;
    res.status(400).json({ error: "File required" });

    const formData = new FormData();
    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    formData.append("metadata", JSON.stringify({ title, description, userId }));
    formData.append("ingestion_mode", "hi-res");

    const r2rResponse = await r2rClient.post("/v3/documents", formData, {
      headers: formData.getHeaders(),
    });
    const document = await documentService.createDocument({
      title: title || file.originalname,
      description,
      userId,
      r2rDocumentId: r2rResponse.data.results.document_id,
      isPublic: isPublic === "true" || isPublic === true,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: "processing",
    });

    res.status(201).json({
      message: "Document uploaded",
      document,
      r2rResponse: r2rResponse.data,
    });
  } catch (error: any) {
    logger.error("Document upload error:", error);
    res.status(500).json({ error: error.message || "Document upload failed" });
  }
};

export const uploadByUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { url, title, description, isPublic } = req.body;
    if (!url) res.status(400).json({ error: "URL required" });

    const r2rResponse = await r2rClient.post("/v3/documents", {
      raw_text: `URL: ${url}`,
      metadata: JSON.stringify({
        title: title || "URL Document",
        description,
        userId,
        sourceUrl: url,
        type: "url",
      }),
      ingestion_mode: "hi-res",
    });

    const document = await documentService.createDocument({
      title: title || "URL Document",
      description,
      userId,
      r2rDocumentId: r2rResponse.data.results.document_id,
      isPublic: isPublic === "true" || isPublic === true,
      sourceUrl: url,
      status: "processing",
    });

    res.status(201).json({
      message: "Document from URL added",
      document,
      r2rResponse: r2rResponse.data,
    });
  } catch (error: any) {
    logger.error("URL document error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to add document from URL" });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, search } = req.query;
    const documents = await documentService.getUserDocuments(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
    });
    res.json(documents);
  } catch (error: any) {
    logger.error("List documents error:", error);
    res.status(500).json({ error: "Failed to retrieve documents" });
  }
};

export const get = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const document = await documentService.getDocument(id, userId);
    if (!document) return;
    res.status(404).json({ error: "Document not found" });
    try {
      const r2rDocument = await r2rClient.get(
        `/v3/documents/${document.r2rDocId}`
      );
      (document as any).r2rData = r2rDocument.data.results;
    } catch (r2rError) {
      logger.warn("Failed to get R2R document details:", r2rError);
    }
    res.json({ document });
  } catch (error: any) {
    logger.error("Get document error:", error);
    res.status(500).json({ error: "Failed to retrieve document" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;
    const document = await documentService.updateDocument(id, userId, updates);
    if (!document) return;
    res.status(404).json({ error: "Document not found" });
    res.json({ message: "Document updated", document });
  } catch (error: any) {
    logger.error("Update document error:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const document = await documentService.getDocument(id, userId);
    if (!document) return;
    res.status(404).json({ error: "Document not found" });
    try {
      await r2rClient.delete(`/v3/documents/${document.r2rDocId}`);
    } catch (r2rError) {
      logger.warn("Failed to delete from R2R:", r2rError);
    }
    await documentService.deleteDocument(id, userId);
    res.json({ message: "Document deleted" });
  } catch (error: any) {
    logger.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
};

export const download = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const document = await documentService.getDocument(id, userId);
    if (!document) return;
    res.status(404).json({ error: "Document not found" });
    const response = await r2rClient.get(
      `/v3/documents/${document.r2rDocId}/download`,
      { responseType: "stream" }
    );
    // Use mimeType if present, otherwise default to 'application/octet-stream'
    const mimeType = (document as any).mimeType || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.fileName}"`
    );
    response.data.pipe(res);
  } catch (error: any) {
    logger.error("Download document error:", error);
    res.status(500).json({ error: "Failed to download document" });
  }
};
