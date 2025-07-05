import { Router } from 'express';
import * as documentController from '../controllers/documentController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);
router.post('/upload', upload.single('file'), documentController.upload);
router.post('/upload-url', documentController.uploadByUrl);
router.get('/my', documentController.list);
router.get('/:id', documentController.get);
router.put('/:id', documentController.update);
router.delete('/:id', documentController.remove);
router.get('/:id/download', documentController.download);

export default router;