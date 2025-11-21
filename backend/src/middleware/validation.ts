import { NextFunction, Request, Response } from 'express';
import { body, param, query, ValidationChain, ValidationError, validationResult } from 'express-validator';
import { AppError } from './errorHandler.js';

type ErrorFormatter = (error: ValidationError) => { field: string; message: string };

const errorFormatter: ErrorFormatter = (error) => {
  if ('param' in error && 'msg' in error) {
    return { 
      field: error.param as string, 
      message: error.msg as string 
    };
  }
  return { field: 'unknown', message: 'Validation error' };
};

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log('Validating request...');
    
    try {
      // Run all validations
      await Promise.all(validations.map(validation => validation.run(req)));

      // Check for validation errors
      const errors = validationResult(req);
      console.log('Validation errors:', errors.array());

      if (!errors.isEmpty()) {
        const errorMessages = errors.formatWith(errorFormatter).array();
        const error = new AppError('Validation failed', 400);
        error.errors = errorMessages;
        return next(error);
      }

      console.log('Validation passed');
      next();
    } catch (error) {
      console.error('Error in validation middleware:', error);
      next(error);
    }
  };
};

export const validateUserRegistration = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name').notEmpty().withMessage('Name is required'),
];

export const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Expense validations
export const validateCreateExpense = [
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('note')
    .optional()
    .trim(),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO8601 format'),
];

export const validateUpdateExpense = [
  body('amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('note')
    .optional()
    .trim(),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO8601 format'),
];

export const validateExpenseQuery = [
  query('category')
    .optional()
    .trim(),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format. Use ISO8601 format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format. Use ISO8601 format'),
];

export const validateExpense = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('description')
    .isLength({ min: 3 })
    .withMessage('Description must be at least 3 characters long'),
  body('category').notEmpty().withMessage('Category is required'),
  body('date').isISO8601().withMessage('Please provide a valid date'),
];

// In src/middleware/validation.ts
export const validateExpenseId = [
  param('id')
    .isUUID()
    .withMessage('Invalid expense ID format')
];

// Export body for use in route files
export { body };
