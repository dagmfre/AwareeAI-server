import dotenv from "dotenv";

dotenv.config();

export default {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/awareeAI',
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret",
  r2rApiKey: process.env.R2R_API_KEY,
  r2rBaseUrl: process.env.R2R_BASE_URL || "https://api.sciphi.ai",
  port: process.env.PORT || 5000,
  allowedOrigins: ["http://localhost:3000"],
  defaultLLM: "openai/gpt-4o",
  defaultChunkCount: 5,
  defaultRetrievalMode: "hybrid",
};
