import express from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getUserDocuments,
  getSharedDocuments,
} from '../controllers/documentController';

const upload = multer(); // memory storage

const router = express.Router();

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/my', getUserDocuments);
router.get('/shared', getSharedDocuments);

export default router;
