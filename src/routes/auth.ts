import express from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
import auth from '../middleware/auth';

const router = express.Router();

// Register user
router.post('/register', register);

// Login user
router.post('/login', login);

// Get current user
router.get('/me', auth, getCurrentUser);

export default router;