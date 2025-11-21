import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.routes.js';
import expenseRouter from './routes/expense.routes.js';

class App {
  public app: Application;
  public port: number;

  constructor(port: number) {
    this.app = express();
    this.port = port;

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Enhanced CORS middleware
    this.app.use((req, res, next) => {
      // Define allowed origins
      const allowedOrigins = [
        // Development URLs
        'http://localhost:19006',  // Expo web
        'http://localhost:3001',   // Default frontend
        'http://10.0.2.2:3000',    // Android emulator
        'http://localhost:3000',   // iOS simulator
        // Add production mobile app URLs here when needed
        // e.g., 'https://yourapp.com'
      ];

      // In development, allow any origin for easier testing
      const origin = req.headers.origin || '*';
      if (config.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      } else if (config.FRONTEND_URL) {
        // In production, only allow the configured frontend URL
        res.header('Access-Control-Allow-Origin', config.FRONTEND_URL);
      }

      // Standard CORS headers
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key'
      );
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      next();
    });

		// Security headers
		this.app.use(helmet());

		// Body parsing middleware
		this.app.use(express.json({ limit: "10kb" }));
		this.app.use(express.urlencoded({ extended: true, limit: "10kb" }));

		// Logging
		if (config.NODE_ENV === "development") {
			this.app.use(morgan("dev"));
		}

		// Request logging middleware
		// Replace the request logging middleware with this:
		this.app.use((req, res, next) => {
			console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

			// Log request body if it exists
			if (
				req.body &&
				typeof req.body === "object" &&
				Object.keys(req.body).length > 0
			) {
				console.log("Request body:", JSON.stringify(req.body, null, 2));
			}

			// Log query parameters if any
			if (req.query && Object.keys(req.query).length > 0) {
				console.log("Query params:", req.query);
			}

			next();
		});
	}

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use('/api/auth', authRouter);
    this.app.use('/api/expenses', expenseRouter);

    // Handle 404
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.status(404).json({
        status: 'error',
        message: 'Not Found',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`Server is running on port ${this.port}`);
    });
  }
}

const app = new App(Number(process.env.PORT) || 3000).app;
export { app };
