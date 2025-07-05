import { prisma } from '../config/database';

export const createDocument = async (data: any) => {
  return prisma.document.create({ data });
};

export const getUserDocuments = async (userId: string, { page = 1, limit = 10, search = '' }) => {
  return prisma.document.findMany({
    where: {
      userId,
      ...(search && { fileName: { contains: search, mode: 'insensitive' } })
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { uploadedAt: 'desc' }
  });
};

export const getDocument = async (id: string, userId: string) => {
  return prisma.document.findFirst({ where: { id, userId } });
};

export const updateDocument = async (id: string, userId: string, updates: any) => {
  return prisma.document.update({ where: { id, userId }, data: updates });
};

export const deleteDocument = async (id: string, userId: string) => {
  return prisma.document.delete({ where: { id, userId } });
};
