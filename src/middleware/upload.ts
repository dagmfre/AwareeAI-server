import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../uploads/"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Accept common document types
  const allowedTypes = [
    "text/plain",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html",
    "text/markdown",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // For errors, pass null as first arg and false as second arg
    // Create a custom error message on the request object or handle it elsewhere
    cb(null, false);
    // You can also trigger the error callback if available
    const error = new Error(
      "Invalid file type. Only PDF, TXT, DOC, DOCX, HTML, and MD files are allowed."
    );
    (error as any).code = "UNSUPPORTED_FILE_TYPE";
    (req as any).fileValidationError = error;
  }
};

// Configure multer middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

export default upload;
