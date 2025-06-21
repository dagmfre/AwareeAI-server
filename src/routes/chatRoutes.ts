import express from 'express';
import {
  createChat,
  getUserChats,
  sendMessage
} from '../controllers/chatController';

const router = express.Router();

// POST /chat/new           - Create a chat (with optional config)
router.post('/new', createChat);

// GET /chat/list           - Get this user's chat histories
router.get('/list', getUserChats);

// POST /chat/send          - Send a message to AI, receive RAG response
router.post('/send', sendMessage);

export default router;