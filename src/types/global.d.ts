import { IUser } from "models/User";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      file?: Express.Multer.File; // Add file directly to Request interface if needed
    }
  }
}
