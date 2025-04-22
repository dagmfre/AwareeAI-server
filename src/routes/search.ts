import express from 'express';
import { searchDocuments, searchInlineDocuments } from '../controllers/searchController';
import auth from '../middleware/auth';

const router = express.Router();

// Search documents
router.post('/', auth, searchDocuments);

// Search for inline document mention
router.post('/inline', auth, searchInlineDocuments);

export default router;