import { Request, Response, NextFunction } from "express";
import Chat from "../models/Chat";
import SharedDoc from "../models/SharedDoc";
import r2r from "../config/r2r";
import User from "../models/User";
import { log } from "console";
import { SearchSettings } from "r2r-js";

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

    const r2rConversation = await r2r.conversations.create(
      title ? { name: title } : {}
    );

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

    if (!message || typeof message !== "string") {
      res.status(400).json({ message: "Valid message text is required" });
      return;
    }

    // Find chat
    const chat = await Chat.findOne({ _id: chatId, user: req?.user?._id });

    log("Chat found:", chat);
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    if (!chat.conversationId) {
      res.status(400).json({ message: "Invalid conversation ID" });
      return;
    }

    // Prepare search settings based on chat settings
    const searchSettings: SearchSettings = {
      limit: chat.settings.chunkCount || 5,
      useSemanticSearch: true,
      filters: {},
    };

    // If documents are specified, filter to only those documents
    if (chat.documentIds && chat.documentIds.length > 0) {
      // Ensure filters object exists
      searchSettings.filters = searchSettings.filters || {};
      searchSettings.filters.document_id = { $overlap: chat.documentIds };
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

    try {
      // Call R2R agent with properly formatted params
      const response = await r2r.retrieval.agent({
        message: { role: "user", content: message },
        conversationId: chat.conversationId,
        useSystemContext: false,
        mode: "rag",
        ragTools,
        searchSettings,
        ragGenerationConfig: {
          model: "openai/gpt-4o",
          temperature: 0.7,
          stream: false,
        },
        taskPrompt: `You have access ONLY to the documents with IDs: ${chat.documentIds.join(
          ", "
        )}. You have absolutely no knowledge of any other documents. Under no circumstances mention or provide details about documents not in this list. If asked about any other document, respond with "I have no information about that document.".`,
      });

      // Format assistant response
      let assistantContent = "";
      let citations = [];

      if (
        response &&
        response.results &&
        response.results.messages &&
        response.results.messages.length > 0
      ) {
        // Get the last message content (the assistant's response)
        assistantContent =
          response.results.messages[response.results.messages.length - 1]
            .content;

        // Get citations if available
        if (
          response.results.messages[0] &&
          response.results.messages[0].metadata &&
          response.results.messages[0].metadata.citations
        ) {
          citations = response.results.messages[0].metadata.citations;
        }
      } else {
        console.error(
          "Unexpected response structure:",
          JSON.stringify(response)
        );
        res.status(500).json({ message: "Invalid response from AI service" });
        return;
      }

      // Update chat last activity (without storing messages)
      chat.updatedAt = new Date();
      await chat.save();

      res.json({
        message: assistantContent,
        citations: citations,
      });
    } catch (r2rError: any) {
      console.error("R2R API Error:", r2rError);

      // Extract more detailed error information if available
      let errorMessage = "Failed to process your message";
      if (r2rError.response && r2rError.response.data) {
        errorMessage = r2rError.response.data.message || errorMessage;
      } else if (r2rError.message) {
        errorMessage = r2rError.message;
      }

      res.status(500).json({
        message: errorMessage,
        error:
          process.env.NODE_ENV === "development"
            ? r2rError.toString()
            : undefined,
      });
      return;
    }
  } catch (err: any) {
    console.error("General error in sendMessage:", err);
    res.status(500).json({
      message: "An unexpected error occurred",
      error:
        process.env.NODE_ENV === "development" ? err.toString() : undefined,
    });
    return;
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

    // Find the chat in our database
    const chat = await Chat.findOne({ _id: chatId, user: req?.user?._id });
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    // Get conversation details from R2R
    const r2rConversation = await r2r.conversations.retrieve({
      id: chat.conversationId as string,
    });

    // Combine MongoDB chat data with R2R conversation data
    const combinedChat = {
      ...chat.toObject(),
      messages: r2rConversation.results[0].message || [],
    };

    res.json(combinedChat);
  } catch (err) {
    next(err);
  }
};

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

// Update chat settings
export const updateChatName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;

    const chat = await Chat.findOne({ _id: chatId, user: req?.user?._id });
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    // Update R2R conversation name if title is provided
    if (title) {
      await r2r.conversations.update({
        id: chat.conversationId as string,
        name: title,
      });
      chat.title = title;
    }

    await chat.save();

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
