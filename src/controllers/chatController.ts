import { Request, Response } from 'express';
import * as chatService from '../services/chatService';
import r2rClient from '../config/r2r';
import { logger } from '../utils/logger';

export const createChat = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, selectedDocuments = [] } = req.body;
    const chat = await chatService.createChat({ title, description, userId, selectedDocuments });
    res.status(201).json({ message: 'Chat created', chat });
  } catch (error: any) {
    logger.error('Create chat error:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;
    const chats = await chatService.getUserChats(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
    res.json(chats);
  } catch (error: any) {
    logger.error('List chats error:', error);
    res.status(500).json({ error: 'Failed to retrieve chats' });
  }
};

export const get = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const chat = await chatService.getChat(id, userId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat });
  } catch (error: any) {
    logger.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to retrieve chat' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { message, selectedDocuments = [], config = {} } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const chat = await chatService.getChat(id, userId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const documents = await chatService.getDocumentsByIds(selectedDocuments, userId);
    const r2rDocIds = documents.map(doc => doc.r2rDocId).filter(Boolean);
    const ragPayload = {
      message,
      conversation_id: chat.id,
      search_settings: {
        search_mode: config.searchMode || 'advanced',
        filters: r2rDocIds.length > 0 ? { document_id: { $in: r2rDocIds } } : undefined,
        limit: config.limit || 10
      },
      rag_generation_config: {
        model: 'gemini/gemini-pro',
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1000,
        ...config.generationConfig
      },
      include_title_if_available: true
    };
    const ragResponse = await r2rClient.post('/v3/retrieval/agent', ragPayload);
    const userMessage = await chatService.addMessage({
      chatId: id,
      content: message,
      role: 'user',
      metadata: { selectedDocuments }
    });
    const assistantMessage = await chatService.addMessage({
      chatId: id,
      content: ragResponse.data.results.completion?.choices?.[0]?.message?.content || ragResponse.data.results.message,
      role: 'assistant',
      metadata: {
        sources: ragResponse.data.results.search_results,
        conversationId: ragResponse.data.results.conversation_id
      }
    });
    await chatService.updateChat(id, {
      conversationId: ragResponse.data.results.conversation_id,
      lastActivity: new Date()
    });
    res.json({
      message: 'Message sent',
      userMessage,
      assistantMessage,
      ragResponse: ragResponse.data.results
    });
  } catch (error: any) {
    logger.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { page = 1, limit = 50 } = req.query;
    const chat = await chatService.getChat(id, userId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const messages = await chatService.getChatMessages(id, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
    res.json(messages);
  } catch (error: any) {
    logger.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
};

export const updateChat = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;
    const chat = await chatService.getChat(id, userId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const updatedChat = await chatService.updateChat(id, updates);
    res.json({ message: 'Chat updated', chat: updatedChat });
  } catch (error: any) {
    logger.error('Update chat error:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
};

export const deleteChat = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const chat = await chatService.getChat(id, userId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    await chatService.deleteChat(id);
    res.json({ message: 'Chat deleted' });
  } catch (error: any) {
    logger.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};