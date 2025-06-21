import express from "express";
import { register, login, me } from "../controllers/authController";

const router = express.Router();

// POST /auth/register  - Register new user
router.post("/register", register);

// POST /auth/login     - Login existing user
router.post("/login", login);

// GET /auth/me         - Get current user info (token required)
router.get("/me", me);

export default router;
