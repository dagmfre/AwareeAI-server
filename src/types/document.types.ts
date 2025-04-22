export interface Document {
  id: string;
  title: string;
  description?: string;
  r2rDocumentId: string;
  originalOwner: string; // User ID of the original owner
  sharedWith: string[]; // Array of User IDs with whom the document is shared
  isPublic: boolean;
  dateShared: Date;
  tags?: string[];
  category?: string;
  thumbnailUrl?: string;
}

export interface DocumentUploadResponse {
  message: string;
  documentId: string;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  owner: string; // User ID of the document owner
  isOwned: boolean; // Indicates if the current user owns the document
}