import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

type ValidationError = Joi.ValidationError;

export interface IAppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number;
  keyValue?: Record<string, any>;
  errors?: Record<string, any>;
  path?: string;
  value?: string;
  message: string;
  stack?: string;
}

export const errorHandler = (
  err: IAppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (error.name === 'CastError') {
    const message = `Resource not found. Invalid: ${error.path}`;
    error = createError(message, 400);
  }

  // Duplicate key error
  if (error.code === 11000) {
    const message = `Duplicate field value: ${JSON.stringify(error.keyValue)}`;
    error = createError(message, 400);
  }

  // Joi Validation error
  if (Joi.isError(err)) {
    const message = err.details
      .map((detail) => detail.message)
      .join('. ');
    error = createError(message, 400);
  }
  
  // Mongoose validation error
  if (error.name === 'ValidationError' && error.errors) {
    const messages = Object.values(error.errors)
      .map((val: any) => val.message);
    error = createError(messages.join('. '), 400);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    error = createError('Invalid token. Please log in again!', 401);
  }

  if (error.name === 'TokenExpiredError') {
    error = createError('Your token has expired! Please log in again.', 401);
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    status: error.status,
    message: error.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const createError = (message: string, statusCode: number): IAppError => {
  const error = new Error(message) as IAppError;
  error.statusCode = statusCode;
  error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  error.isOperational = true;
  return error;
};

export class AppError extends Error implements IAppError {
  statusCode: number;
  status: string;
  isOperational: boolean;
  errors?: any[];

  constructor(message: string, statusCode: number, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}
