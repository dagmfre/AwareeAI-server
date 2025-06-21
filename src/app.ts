import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes";
import documentRoutes from "./routes/documentRoutes";
import sharedDocsRoutes from "./routes/sharedDocsRoutes";
import errorHandler from "./middleware/errorHandler";
import { NotFoundError } from "./utils/errors";

const app = express();

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers["x-request-id"] =
    req.headers["x-request-id"] || Math.random().toString(36).substring(2, 15);
  next();
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Welcome to AwareeAI API!",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/document", documentRoutes);
app.use("/shared-docs", sharedDocsRoutes);

// 404 Handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError("API endpoint not found"));
});

// Global Error Handler (must be last)
app.use(errorHandler);

export default app;
