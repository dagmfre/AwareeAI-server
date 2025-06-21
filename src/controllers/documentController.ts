import { Request, Response } from "express";
import { supabase } from "../config/supabaseClient";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { getUserFromReq } from "../middleware/authMiddleware";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// Helper to get correct bucket and path
const DOC_BUCKET = process.env.SUPABASE_BUCKET!;
if (!DOC_BUCKET) {
  throw new Error("SUPABASE_BUCKET environment variable is not set.");
}

// Upload and ingest
export const uploadDocument = async (req: Request, res: Response) => {
  /*
    req.files (from multer)
    req.body: { isPublic }
  */
  try {
    const user = await getUserFromReq(req);
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    // Save file to Supabase Storage
    const ext = file.originalname.split(".").pop();
    const supaPath = `${user.id}/${uuidv4()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(DOC_BUCKET)
      .upload(supaPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      res.status(500).json({ error: uploadError.message });
      return;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(DOC_BUCKET)
      .getPublicUrl(supaPath);

    if (!publicUrlData?.publicUrl) {
      res.status(500).json({ error: "Failed to get public URL." });
      return;
    }

    const isPublic = req.body.isPublic === "true" || req.body.isPublic === true;

    // Save to DB (post-upload)
    const docRecord = await prisma.document.create({
      data: {
        userId: user.id,
        fileName: file.originalname,
        storageUrl: publicUrlData.publicUrl,
        isPublic,
      },
    });

    // Ingest into R2R (self-hosted instance, /v3/documents/create)
    try {
      const r2rRes = await axios.post(
        process.env.R2R_URL + "/v3/documents/create",
        {
          source_type: "url",
          url: docRecord.storageUrl,
          user_id: user.id, // for doc scoping
          name: docRecord.fileName,
        },
        {
          headers: { "x-r2r-api-key": process.env.R2R_API_KEY },
        }
      );

      // Save the R2R document id for future queries
      await prisma.document.update({
        where: { id: docRecord.id },
        data: { r2rDocId: r2rRes.data.id },
      });

      res.status(201).json({
        id: docRecord.id,
        fileName: docRecord.fileName,
        storageUrl: docRecord.storageUrl,
        isPublic,
        r2rDocId: r2rRes.data.id,
      });
      return;
    } catch (e: any) {
      // You may want to log or retry ingest if R2R fails
      res.status(500).json({ error: "R2R ingest failed", details: e.message });
      return;
    }
  } catch (e: any) {
    res.status(500).json({ error: "Unexpected error", details: e.message });
    return;
  }
};

/** List all a user's docs */
export const getUserDocuments = async (req: Request, res: Response) => {
  try {
    const user = await getUserFromReq(req);
    const docs = await prisma.document.findMany({
      where: { userId: user.id },
    });
    res.json(docs);
  } catch (e: any) {
    res
      .status(500)
      .json({ error: "Failed to fetch user documents", details: e.message });
  }
};

/** List all shared (public) docs */
export const getSharedDocuments = async (_req: Request, res: Response) => {
  try {
    const docs = await prisma.document.findMany({
      where: { isPublic: true },
      include: {
        user: { select: { displayName: true, email: true, id: true } },
      },
    });
    res.json(docs); // for shared-docs page
  } catch (e: any) {
    res
      .status(500)
      .json({ error: "Failed to fetch shared documents", details: e.message });
  }
};
