import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { Prisma } from "@prisma/client";

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

const handlePrismaError = (error: any): AppError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return new AppError(
          "Duplicate entry. This record already exists.",
          409,
          "DUPLICATE_ERROR"
        );
      case "P2025":
        return new AppError("Record not found.", 404, "NOT_FOUND");
      case "P2003":
        return new AppError(
          "Foreign key constraint failed.",
          400,
          "FOREIGN_KEY_ERROR"
        );
      case "P2014":
        return new AppError("Invalid relation field.", 400, "INVALID_RELATION");
      default:
        return new AppError(
          "Database operation failed.",
          500,
          "DATABASE_ERROR"
        );
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new AppError(
      "Unknown database error occurred.",
      500,
      "UNKNOWN_DATABASE_ERROR"
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError("Invalid data provided.", 400, "VALIDATION_ERROR");
  }

  return new AppError(
    "Database connection failed.",
    500,
    "DATABASE_CONNECTION_ERROR"
  );
};

const handleSupabaseError = (error: any): AppError => {
  if (error.statusCode === 401) {
    return new AppError(
      "Authentication failed with Supabase.",
      401,
      "SUPABASE_AUTH_ERROR"
    );
  }
  if (error.statusCode === 403) {
    return new AppError(
      "Access denied by Supabase.",
      403,
      "SUPABASE_ACCESS_ERROR"
    );
  }
  return new AppError(
    `Supabase error: ${error.message}`,
    error.statusCode || 500,
    "SUPABASE_ERROR"
  );
};

const handleAxiosError = (error: any): AppError => {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.message;

    if (status >= 400 && status < 500) {
      return new AppError(
        `External API error: ${message}`,
        status,
        "EXTERNAL_API_CLIENT_ERROR"
      );
    }
    return new AppError(
      `External service unavailable: ${message}`,
      502,
      "EXTERNAL_API_SERVER_ERROR"
    );
  }

  if (error.request) {
    return new AppError(
      "External service is not responding.",
      503,
      "EXTERNAL_SERVICE_TIMEOUT"
    );
  }

  return new AppError(
    `Request configuration error: ${error.message}`,
    500,
    "REQUEST_CONFIG_ERROR"
  );
};

const handleMulterError = (error: any): AppError => {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return new AppError(
        "File size exceeds the limit.",
        400,
        "FILE_SIZE_ERROR"
      );
    case "LIMIT_UNEXPECTED_FILE":
      return new AppError(
        "Unexpected file field.",
        400,
        "UNEXPECTED_FILE_ERROR"
      );
    case "UNSUPPORTED_FILE_TYPE":
      return new AppError(
        "File type not supported.",
        400,
        "UNSUPPORTED_FILE_TYPE"
      );
    default:
      return new AppError("File upload failed.", 400, "FILE_UPLOAD_ERROR");
  }
};

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error: AppError;

  // Log error for debugging
  console.error("Error Stack:", err.stack);
  console.error("Request Info:", {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
  });

  // Handle known error types
  if (err instanceof AppError) {
    error = err;
  } else if (err.name?.includes("Prisma")) {
    error = handlePrismaError(err);
  } else if (err.name === "AxiosError" || err.isAxiosError) {
    error = handleAxiosError(err);
  } else if (
    err.code?.startsWith("LIMIT_") ||
    err.code === "UNSUPPORTED_FILE_TYPE"
  ) {
    error = handleMulterError(err);
  } else if (err.message?.includes("Supabase") || err.statusCode) {
    error = handleSupabaseError(err);
  } else if (err.name === "ValidationError") {
    error = new AppError("Validation failed.", 400, "VALIDATION_ERROR");
  } else if (err.name === "CastError") {
    error = new AppError("Invalid ID format.", 400, "INVALID_ID");
  } else if (err.code === 11000) {
    error = new AppError("Duplicate entry.", 409, "DUPLICATE_ERROR");
  } else if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token.", 401, "INVALID_TOKEN");
  } else if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired.", 401, "TOKEN_EXPIRED");
  } else {
    error = new AppError("Internal server error.", 500, "INTERNAL_ERROR");
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.code || "UNKNOWN_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      requestId: req.headers["x-request-id"] as string,
    },
  };

  // Add details in development environment
  if (process.env.NODE_ENV === "development") {
    errorResponse.error.details = {
      stack: err.stack,
      originalError: err.name,
    };
  }

  res.status(error.statusCode).json(errorResponse);
};

export default errorHandler;
