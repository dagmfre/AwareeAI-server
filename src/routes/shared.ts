import express from 'express';
import { shareDocument, getPublicDocuments, addToLibrary, getUserLibrary } from '../controllers/sharedDocsController';
import auth from '../middleware/auth';

const router = express.Router();

// Share document
router.post('/', auth, shareDocument);

// Get public documents
router.get('/public', getPublicDocuments);

// Add document to user's library
router.post('/library/:sharedDocId', auth, addToLibrary);

// Get user's library
router.get('/library', auth, getUserLibrary);

export default router;