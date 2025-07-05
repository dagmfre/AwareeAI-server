import { Request, Response } from 'express';
import { prisma } from '../config/database';

export const listPublic = async (req: Request, res: Response) => {
  try {
    const docs = await prisma.document.findMany({
      where: { isPublic: true },
      orderBy: { uploadedAt: 'desc' },
      include: { user: { select: { id: true, displayName: true } } }
    });
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch shared docs' });
  }
};
