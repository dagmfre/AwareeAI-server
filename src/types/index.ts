// Placeholder for type definitions
export interface User {
  id: string;
  email: string;
  displayName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  userId: string;
  r2rDocumentId: string;
  isPublic: boolean;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  sourceUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  title: string;
  description?: string;
  userId: string;
  conversationId?: string;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  role: string;
  metadata?: any;
  createdAt: string;
  userId: string;
}
