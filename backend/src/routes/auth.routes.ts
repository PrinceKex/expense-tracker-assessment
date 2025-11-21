import { NextFunction, Request, Response, Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import {
  body,
  validate
} from "../middleware/validation.js";

const router = Router();

// Test endpoint
router.get("/test", (req: Request, res: Response) => {
	console.log("✅ Test endpoint hit");
	res.json({ success: true, message: "Test endpoint works" });
});

// Register route with debug logging
router.post(
  '/register',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('1. Register route hit');
    console.log('Request body:', req.body);
    next();
  },
  // Use the validate middleware with the validation chains
  validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    console.log('3. After validate middleware');
    next();
  },
	(req: Request, res: Response, next: NextFunction) => {
		console.log("3. After validate middleware");
		next();
	},
	authController.register
);

// Login route with debug logging
router.post(
  "/login",
  (req: Request, res: Response, next: NextFunction) => {
    console.log('1. Login route hit');
    console.log('Request body:', req.body);
    next();
  },
  // Use the validate middleware with validation chains
  validate([
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    console.log('2. After validate middleware');
    next();
  },
  authController.login
);

export default router;
