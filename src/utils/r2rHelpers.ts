import { r2rClient } from 'r2r-js';
import config from '../config/default';
import { R2RDocument, R2RResponse } from '../types/r2r.types';

// Initialize R2R client
const r2r = new r2rClient({
  baseURL: config.r2rBaseUrl,
  apiKey: config.r2rApiKey,
});

// Helper function to upload a document to R2R
export const uploadDocumentToR2R = async (filePath: string): Promise<R2RResponse> => {
  try {
    const response = await r2r.documents.create({ filePath });
    return response;
  } catch (error) {
    throw new Error(`Failed to upload document: ${error.message}`);
  }
};

// Helper function to retrieve a document from R2R
export const getDocumentFromR2R = async (documentId: string): Promise<R2RDocument> => {
  try {
    const document = await r2r.documents.get({ id: documentId });
    return document;
  } catch (error) {
    throw new Error(`Failed to retrieve document: ${error.message}`);
  }
};

// Helper function to delete a document from R2R
export const deleteDocumentFromR2R = async (documentId: string): Promise<void> => {
  try {
    await r2r.documents.delete({ id: documentId });
  } catch (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};