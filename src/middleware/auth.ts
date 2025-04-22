import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/default";
import User from "../models/User";

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    res
      .status(401)
      .json({ message: "Authorization denied, no token provided" });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ message: "Token is invalid or expired" });
  }
};

export default authMiddleware;
