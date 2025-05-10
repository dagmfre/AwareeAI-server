import mongoose, { Document, Schema } from "mongoose";

interface ISharedDoc extends Document {
  title: string;
  r2rDocumentId: string;
  summary?: string;
  originalOwner: mongoose.Types.ObjectId;
  tags?: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  contentHash?: string;
  metadata?: Record<string, any>;
}

const SharedDocSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
  },
  r2rDocumentId: {
    type: String,
    required: true,
  },
  originalOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  summary: {
    type: String,
  },
  contentHash: {
    type: String,
    unique: true,
    index: true,
  },
  tags: [
    {
      type: String,
    },
  ],
  category: {
    type: String,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<ISharedDoc>("SharedDoc", SharedDocSchema);
