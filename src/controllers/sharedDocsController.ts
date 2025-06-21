import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * List all public/shared documents, with uploader info
 * GET /shared-docs
 * Optional: Accepts query params for filtering by filename/uploader
 */
export const getSharedDocuments = async (req: Request, res: Response) => {
  const { search, uploader } = req.query;

  let whereClause: any = { isPublic: true };

  if (search) {
    whereClause.fileName = { contains: search as string, mode: "insensitive" };
  }
  if (uploader) {
    whereClause.user = { email: uploader };
  }

  const docs = await prisma.document.findMany({
    where: whereClause,
    include: { user: { select: { id: true, email: true, displayName: true } } },
    orderBy: { uploadedAt: "desc" },
  });
  res.json(docs);
};
