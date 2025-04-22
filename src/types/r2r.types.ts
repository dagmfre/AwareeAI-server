// backend/src/types/r2r.types.ts

export interface R2RDocument {
    id: string;
    title: string;
    description?: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface R2RUploadResponse {
    document_id: string;
    message: string;
}

export interface R2RSearchResult {
    documentId: string;
    score: number;
    content: string;
}

export interface R2RConversation {
    id: string;
    messages: R2RMessage[];
}

export interface R2RMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export interface R2RSettings {
    model: string;
    chunkCount: number;
    retrievalMode: 'semantic' | 'hybrid' | 'fulltext';
    enableWebSearch: boolean;
}