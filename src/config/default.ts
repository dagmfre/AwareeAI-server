export default {
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/docrag',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key',
  r2rApiKey: process.env.R2R_API_KEY,
  r2rBaseUrl: process.env.R2R_BASE_URL || 'https://api.sciphi.ai',
  port: process.env.PORT || 5000,
  allowedOrigins: ['http://localhost:3000'],
  defaultLLM: 'openai/gpt-4o',
  defaultChunkCount: 5,
  defaultRetrievalMode: 'hybrid'
};