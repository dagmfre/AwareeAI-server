import mongoose, { Document, Schema } from "mongoose";
import { Message } from "r2r-js";
import { SearchSettings } from "r2r-js/dist/v3/clients/documents";

interface MessageTypes extends Message {
  timestamp?: Date;
  citations?: Record<string, any>[];
}

interface ChatSettings extends SearchSettings {
  model: string;
  enableWebSearch: boolean;
  stream: boolean;
  chunkCount: number;
  retrievalMode: "hybrid" | "semantic";
  temperature: number;
  maxTokens?: number;
}

interface ChatDocument extends Document {
  title: string;
  user: mongoose.Types.ObjectId;
  messages: MessageTypes[];
  documentIds: string[];
  conversationId?: string;
  settings: ChatSettings;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  role: {
    type: String,
    enum: ["user", "assistant", "system"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  citations: {
    type: [Object],
    default: [],
  },
});

const ChatSchema = new Schema({
  title: {
    type: String,
    default: "New Chat",
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  messages: {
    type: [MessageSchema],
    default: [],
  },
  documentIds: {
    type: [String],
    default: [],
    description: "R2R Document IDs used in this chat",
  },
  conversationId: {
    type: String,
    description: "R2R conversation ID for context tracking",
  },
  settings: {
    type: {
      model: {
        type: String,
        default: "openai/gpt-4o",
      },
      enableWebSearch: {
        type: Boolean,
        default: true,
      },
      stream: {
        type: Boolean,
        default: true,
      },
      chunkCount: {
        type: Number,
        default: 5,
      },
      retrievalMode: {
        type: String,
        enum: ["hybrid", "semantic"],
        default: "hybrid",
      },
      temperature: {
        type: Number,
        default: 0.7,
      },
      maxTokens: {
        type: Number,
      },
    },
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date,
  },
  updatedAt: {
    type: Date,
    default: Date,
  },
});

export default mongoose.model<ChatDocument>("Chat", ChatSchema);
