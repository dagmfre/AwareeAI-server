import mongoose from "mongoose";
import config from "./default";

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("MongoDB Connected...");
  } catch (error: unknown) {
    console.error(
      "MongoDB connection error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

export default connectDB;
