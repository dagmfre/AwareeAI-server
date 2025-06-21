import { Response } from "express";

interface SuccessResponse {
  success: true;
  message?: string;
  data?: any;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export const sendSuccess = (
  res: Response,
  statusCode: number = 200,
  message: string = "Success",
  data?: any,
  meta?: any
): void => {
  const response: SuccessResponse = {
    success: true,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  res.status(statusCode).json(response);
};
