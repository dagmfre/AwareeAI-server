import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { getUserFromReq } from "../middleware/authMiddleware";

const prisma = new PrismaClient();

// Start a new chat (initialize with configs from UI/dashboard)
export const createChat = async (req: Request, res: Response) => {
  const { title, config } = req.body; // config: {llm, retrievalMode, topK, webSearchEnabled}
  const user = await getUserFromReq(req);
  const chat = await prisma.chat.create({
    data: {
      userId: user.id,
      title,
      // Optionally: store initial config as JSON in chat if you want persistent per-chat config
    },
  });
  res.status(201).json(chat);
};

// Get all user chats (for sidebar/history)
export const getUserChats = async (req: Request, res: Response) => {
  const user = await getUserFromReq(req);
  const chats = await prisma.chat.findMany({
    where: { userId: user.id },
    include: { messages: true },
    orderBy: { updatedAt: "desc" },
    take: 20, // for dashboard recents
  });
  res.json(chats);
};

// Handle a chat query with selected documents
export const sendMessage = async (req: Request, res: Response) => {
  /*
    req.body:
    {
      chatId,
      message,
      selectedDocIds, // array of doc ids (user docs or public)
      config: { llm, retrievalMode, numChunks, webSearchEnabled }
    }
  */
  const user = await getUserFromReq(req);
  const { chatId, message, selectedDocIds, config } = req.body;

  // Find document(s) and prepare R2R document ID refs
  const docs = await prisma.document.findMany({
    where: {
      OR: [
        { id: { in: selectedDocIds }, userId: user.id },
        { id: { in: selectedDocIds }, isPublic: true },
      ],
    },
  });
  const r2rDocIds = docs.map((d) => d.r2rDocId).filter(Boolean);

  // Prepare body for R2R RAG call
  const ragPayload = {
    query: message,
    collection_ids: r2rDocIds, // scope w/ doc selection
    user_id: user.id, // for R2R scoping
    llm: config.llm,
    retrieval_mode: config.retrievalMode,
    num_chunks: config.numChunks,
    web_search: config.webSearchEnabled,
  };

  try {
    // Call self-hosted R2R
    const r2rRes = await axios.post(
      process.env.R2R_URL + "/v3/retrieval/rag",
      ragPayload,
      { headers: { "x-r2r-api-key": process.env.R2R_API_KEY } }
    );
    // Save message (both user and AI) to chat
    await prisma.message.createMany({
      data: [
        {
          chatId,
          sender: "user",
          content: message,
        },
        {
          chatId,
          sender: "assistant",
          content: r2rRes.data.answer, // Adjust according to actual R2R response
          context: r2rRes.data, // Save RAG trace
        },
      ],
    });
    res.json({
      answer: r2rRes.data.answer,
      ragTrace: r2rRes.data, // Includes document graph/context for UI right pane
    });
  } catch (err: any) {
    res.status(500).json({ error: "R2R error", details: err.message });
    return;
  }
};
