import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/default";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatarUrl?: string;
  dateJoined: Date;
  r2rDocumentIds: string[];
  sharedWithMe: mongoose.Types.ObjectId[];
  comparePassword(password: string): Promise<boolean>;
  generateToken(): string;
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatarUrl: {
    type: String,
  },
  dateJoined: {
    type: Date,
    default: Date.now,
  },
  r2rDocumentIds: [
    {
      type: String,
      description: "Document IDs stored in R2R",
    },
  ],
  sharedWithMe: [
    {
      type: Schema.Types.ObjectId,
      ref: "SharedDoc",
    },
  ],
});

// Hash password before saving
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as mongoose.CallbackError);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Generate JWT token
UserSchema.methods.generateToken = function (): string {
  return jwt.sign({ id: this._id }, config.jwtSecret, { expiresIn: "7d" });
};

export default mongoose.model<IUser>("User", UserSchema);
