import express from 'express';
import { createChat, sendMessage, getChatHistory, getChat, updateChatSettings, deleteChat } from '../controllers/chatController';
import auth from '../middleware/auth';

const router = express.Router();

// Create new chat
router.post('/', auth, createChat);

// Send message in chat
router.post('/:chatId/messages', auth, sendMessage);

// Get chat history
router.get('/', auth, getChatHistory);

// Get specific chat
router.get('/:chatId', auth, getChat);

// Update chat settings
router.put('/:chatId/settings', auth, updateChatSettings);

// Delete chat
router.delete('/:chatId', auth, deleteChat);

export default router;