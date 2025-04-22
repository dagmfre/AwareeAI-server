export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  citations?: Array<Record<string, any>>;
}

export interface Chat {
  title: string;
  user: string; // User ID
  messages: Message[];
  documentIds: string[]; // R2R Document IDs used in this chat
  conversationId?: string; // R2R conversation ID for context tracking
  settings?: {
    model?: string;
    chunkCount?: number;
    retrievalMode?: 'semantic' | 'hybrid' | 'fulltext';
    enableWebSearch?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}