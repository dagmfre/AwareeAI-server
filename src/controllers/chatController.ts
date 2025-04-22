import { Request, Response, NextFunction } from "express";
import Chat from "../models/Chat";
import SharedDoc from "../models/SharedDoc";
import r2r from "../config/r2r";
import User from "../models/User";

// Create a new chat
export const createChat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, documentIds, settings } = req.body;

    // Validate user access to documents
    if (documentIds && documentIds.length > 0) {
      const user = await User.findById(req?.user?._id);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Check if user has access to all selected documents
      for (const docId of documentIds) {
        // Check if user owns this document
        const ownedByUser = user.r2rDocumentIds.includes(docId);

        if (!ownedByUser) {
          // Check if document is shared with user
          const sharedDoc = await SharedDoc.findOne({
            r2rDocumentId: docId,
            $or: [
              { isPublic: true },
              { sharedWith: req?.user?._id },
              { originalOwner: req?.user?._id },
            ],
          });

          if (!sharedDoc) {
            res.status(403).json({ message: `No access to document ${docId}` });
            return;
          }
        }
      }
    }

    // Create R2R conversation
    const r2rConversation = await r2r.conversations.create();

    // Create chat in MongoDB
    const chat = new Chat({
      title: title || "New Chat",
      user: req?.user?._id,
      documentIds: documentIds || [],
      conversationId: r2rConversation.results.id,
      settings: settings || {},
    });

    await chat.save();

    res.status(201).json(chat);
  } catch (err) {
    next(err);
  }
};

// Send message in chat
export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    // Find chat
    const chat = await Chat.findOne({ _id: chatId, user: req?.user?._id });
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    // Prepare search settings based on chat settings
    const searchSettings = chat.settings;

    // If documents are specified, filter to only those documents
    if (chat.documentIds && chat.documentIds.length > 0) {
      // Ensure filters object exists
      if (!searchSettings.filters) {
        searchSettings.filters = {};
      }
      searchSettings.filters.documentId = { $in: chat.documentIds };
    }

    const ragTools = [
      "search_file_descriptions",
      "search_file_knowledge",
      "get_file_content",
    ];

    // Add web search if enabled
    if (chat.settings.enableWebSearch) {
      ragTools.push("web_search");
    }

    // Call R2R agent
    const response = await r2r.retrieval.agent({
      message: { role: "user", content: message },
      conversationId: chat.conversationId,
      mode: "rag",
      ragTools,
      searchSettings,
      ragGenerationConfig: {
        model: chat.settings.model || "openai/gpt-4o",
        temperature: 0.7,
        stream: chat.settings.stream,
      },
    });

    // Format assistant response
    const assistantMessage = {
      role: "assistant",
      content:
        response.results.messages[response.results.messages.length - 1].content,
      citations: response.results.messages[0].metadata.citations || [],
    };

    // Add messages to chat
    chat.messages.push({ role: "user", content: message });

    // Update chat last activity
    chat.updatedAt = new Date();

    await chat.save();

    res.json({
      message: assistantMessage.content,
      citations: assistantMessage.citations,
    });
  } catch (err) {
    next(err);
  }
};

// Get chat history
export const getChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const chats = await Chat.find({ user: req?.user?._id })
      .sort({ updatedAt: -1 })
      .select("title updatedAt");

    res.json(chats);
  } catch (err) {
    next(err);
  }
};

// Get specific chat
export const getChat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({ _id: chatId, user: req?.user?._id });
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    res.json(chat);
  } catch (err) {
    next(err);
  }
};

// Update chat settings
export const updateChatSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chatId } = req.params;
    const { settings } = req.body;

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, user: req?.user?._id },
      { settings },
      { new: true }
    );

    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    res.json(chat);
  } catch (err) {
    next(err);
  }
};

// Delete chat
export const deleteChat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOneAndDelete({
      _id: chatId,
      user: req?.user?._id,
    });
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    // Try to delete the R2R conversation as well
    try {
      if (chat.conversationId) {
        await r2r.conversations.delete({ id: chat.conversationId });
      }
    } catch (r2rErr) {
      console.error("Failed to delete R2R conversation:", r2rErr);
      // Continue despite R2R error
    }

    res.json({ message: "Chat deleted successfully" });
  } catch (err) {
    next(err);
  }
};
