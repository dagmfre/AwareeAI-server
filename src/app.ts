import express from "express";
import cors from "cors";
import morgan from "morgan";
import config from "./config/default";
import errorHandler from "./middleware/errorHandler";

// Import routes
import auth from "./routes/auth";
import document from "./routes/documents";
import shared from "./routes/shared";
import chats from "./routes/chats";
import prisma from "./config/prismaClient";

const test = async () => {
  const newUser = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@gmail.com",
      password: "password123",
      avatarUrl: "https://example.com/avatar/alice.png",
    },
  });

  const users = await prisma.user.findMany();
  console.log("New User:", newUser);
};

// Test Prisma connection (optional, can be removed in production)
test()
  .catch((e) => {
    console.error("Error connecting to the database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (config.allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Routes
app.use("/api/auth", auth);
app.use("/api/documents", document);
app.use("/api/shared", shared);
app.use("/api/chats", chats);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Error handling middleware
app.use(errorHandler);

export default app;
