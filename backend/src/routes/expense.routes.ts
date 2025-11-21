import { NextFunction, Request, Response, Router } from 'express';
import * as expenseController from '../controllers/expense.controller.js';
import { protect } from '../middleware/auth.js';
import {
  validate,
  validateCreateExpense,
  validateExpenseId,
  validateExpenseQuery,
  validateUpdateExpense
} from '../middleware/validation.js';

const router = Router();

// Protect all routes with JWT authentication
router.use(protect);

// Create a new expense
router.post(
	"/",
	(req: Request, res: Response, next: NextFunction) => {
		console.log("Create expense route hit");
		console.log("Request body:", req.body);
		next();
	},
	validate(validateCreateExpense) as any,
	expenseController.createExpense
);

// Get all expenses with optional filtering
router.get(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Get expenses route hit');
    console.log('Query params:', req.query);
    next();
  },
  validate(validateExpenseQuery) as any,
  expenseController.getExpenses
);

// Add this route before the update and delete routes
router.get(
	"/:id",
	(req: Request, res: Response, next: NextFunction) => {
		console.log("Get single expense route hit");
		console.log("Expense ID:", req.params.id);
		next();
	},
	validate(validateExpenseId) as any,
	expenseController.getExpense
);

// Get expense summary
router.get(
  '/summary',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Get expense summary route hit');
    console.log('Query params:', req.query);
    next();
  },
  validate(validateExpenseQuery) as any,
  expenseController.getExpenseSummary
);

// Update an expense
router.patch(
  '/:id',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Update expense route hit');
    console.log('Expense ID:', req.params.id);
    console.log('Update data:', req.body);
    next();
  },
  validate(validateUpdateExpense) as any,
  expenseController.updateExpense
);

// Delete an expense
router.delete(
  '/:id',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Delete expense route hit');
    console.log('Expense ID:', req.params.id);
    next();
  },
  expenseController.deleteExpense
);

export default router;
