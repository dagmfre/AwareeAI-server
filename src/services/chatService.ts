import { prisma } from "../config/database";

export const createChat = async ({
  title,
  description,
  userId,
  selectedDocuments = [],
}: any) => {
  return prisma.chat.create({
    data: {
      title,
      userId,
      documents: {
        create: selectedDocuments.map((docId: string) => ({
          document: { connect: { id: docId } },
        })),
      },
    },
    include: { documents: { include: { document: true } } },
  });
};

export const getUserChats = async (
  userId: string,
  { page = 1, limit = 10 }
) => {
  return prisma.chat.findMany({
    where: { userId },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: { documents: { include: { document: true } } },
  });
};

export const getChat = async (id: string, userId: string) => {
  return prisma.chat.findFirst({
    where: { id, userId },
    include: { documents: { include: { document: true } }, messages: true },
  });
};

export const addMessage = async ({ chatId, content, sender }: any) => {
  return prisma.message.create({
    data: {
      content,
      sender,
      chat: { connect: { id: chatId } },
    },
  });
};

export const getChatMessages = async (
  chatId: string,
  { page = 1, limit = 50 }
) => {
  return prisma.message.findMany({
    where: { chatId },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "asc" },
  });
};

export const updateChat = async (id: string, updates: any) => {
  // Handle updating selected documents if provided
  if (updates.selectedDocuments) {
    // Remove all and re-add
    await prisma.chatDocument.deleteMany({ where: { chatId: id } });
    await prisma.chatDocument.createMany({
      data: updates.selectedDocuments.map((docId: string) => ({
        chatId: id,
        documentId: docId,
      })),
    });
    delete updates.selectedDocuments;
  }
  return prisma.chat.update({ where: { id }, data: updates });
};

export const deleteChat = async (id: string) => {
  await prisma.chatDocument.deleteMany({ where: { chatId: id } });
  return prisma.chat.delete({ where: { id } });
};

export const getDocumentsByIds = async (ids: string[], userId: string) => {
  return prisma.document.findMany({ where: { id: { in: ids }, userId } });
};
