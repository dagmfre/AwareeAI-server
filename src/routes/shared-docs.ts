import { Router } from "express";
import * as searchController from "../controllers/searchController";
import { authenticateToken } from "../middleware/auth";

const router = Router();
router.post("/", authenticateToken, searchController.search);
export default router;
