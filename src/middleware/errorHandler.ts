import { Request, Response, NextFunction } from "express";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err.message);

  // Handle specific error types
  if (err.name === "ValidationError") {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.name === "CastError") {
    res.status(400).json({ error: "Invalid ID format" });
    return;
  }

  if (err.code === 11000) {
    res.status(400).json({ error: "Duplicate key error" });
    return;
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || "Server error occurred",
  });
};

export default errorHandler;
