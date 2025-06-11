import { Request, Response } from "express";
import prisma from "../config/prismaClient";

export const createChat = async (req: Request, res: Response) => {
  try {
    const { title, documentIds, settings } = req.body;
    const newChat = await prisma.chat.create({
      data: {
        userId: req.userId!,
        title,
        documentIds,
        messages: [],
        settings: settings ?? {}
      }
    });
    res.status(201).json(newChat);
  } catch (e) {
    res.status(400).json({ error: "Failed to create chat: " + e.message });
  }
};

export const getUserChats = async (req: Request, res: Response) => {
  try {
    const chats = await prisma.chat.findMany({ where: { userId: req.userId! } });
    res.json(chats);
  } catch (e) {
    res.status(400).json({ error: "Failed to get chats" });
  }
};

export const addMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    const chat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        messages: {
          push: message // message is expected to be { role, content, timestamp, ... }
        }
      }
    });
    res.status(200).json(chat);
  } catch (e) {
    res.status(400).json({ error: "Failed to add message: " + e.message });
  }
};