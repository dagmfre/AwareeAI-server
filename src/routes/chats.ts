import express from "express";
import {
  createChat,
  sendMessage,
  getChatHistory,
  getChat,
  updateChatSettings,
  updateChatName,
  deleteChat,
} from "../controllers/chatController";
import auth from "../middleware/auth";

const router = express.Router();

// Create new chat
router.post("/", auth, createChat);

// Send message in chat
router.post("/:chatId", auth, sendMessage);

// Get chat history
router.get("/", auth, getChatHistory);

// Get specific chat
router.get("/:chatId", auth, getChat);

// Update chat settings
router.put("/settings/:chatId", auth, updateChatSettings);

// Update chat name
router.put("/name/:chatId", auth, updateChatName);

// Delete chat
router.delete("/:chatId", auth, deleteChat);

export default router;
