import mongoose, { Document, Schema } from 'mongoose';

interface ISharedDoc extends Document {
  title: string;
  description?: string;
  r2rDocumentId: string;
  originalOwner: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  isPublic: boolean;
  dateShared: Date;
  tags?: string[];
  category?: string;
  thumbnailUrl?: string;
}

const SharedDocSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  r2rDocumentId: {
    type: String,
    required: true,
  },
  originalOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isPublic: {
    type: Boolean,
    default: false,
  },
  dateShared: {
    type: Date,
    default: Date.now,
  },
  tags: [{
    type: String,
  }],
  category: {
    type: String,
  },
  thumbnailUrl: {
    type: String,
  },
});

export default mongoose.model<ISharedDoc>('SharedDoc', SharedDocSchema);