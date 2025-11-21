import { PrismaClient } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

interface CreateExpenseRequest {
  amount: number;
  category: string;
  note?: string;
  date?: Date;
}

interface UpdateExpenseRequest {
  amount?: number;
  category?: string;
  note?: string;
  date?: Date;
}

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { amount, category, note, date }: CreateExpenseRequest = req.body;
    const userId = req.user?.id; // From auth middleware

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const expense = await prisma.expense.create({
      data: {
        amount,
        category,
        note,
        date: date || new Date(),
        userId,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        expense,
      },
    });
  } catch (error) {
    console.error('Create expense error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Error creating expense', 500);
  }
};

// In src/controllers/expense.controller.ts
export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, category, page: pageParam, limit: limitParam } = req.query;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Parse pagination parameters
    const page = parseInt(pageParam as string) || 1;
    const limit = parseInt(limitParam as string) || 10;
    const offset = (page - 1) * limit;

    // Build the where clause
    const where: any = { userId };

    // Add date filtering if dates are provided
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        // Set to start of day in UTC
        const start = new Date(startDate as string);
        start.setUTCHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (endDate) {
        // Set to end of day in UTC
        const end = new Date(endDate as string);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Add category filtering if provided
    if (category) {
      where.category = category;
    }

    // Get paginated results and total count in parallel
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.expense.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getExpense = async (req: Request, res: Response, next: any) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			throw new AppError("User not authenticated", 401);
		}

		console.log(`Fetching expense with ID: ${id} for user: ${userId}`);

		const expense = await prisma.expense.findFirst({
			where: {
				id,
				userId,
			},
		});

		if (!expense) {
			console.log(`Expense not found with ID: ${id}`);
			throw new AppError("Expense not found", 404);
		}

		console.log(`Successfully fetched expense: ${expense.id}`);

		res.status(200).json({
			status: "success",
			data: {
				expense,
			},
		});
	} catch (error) {
		console.error("Error in getExpense:", error);
		next(error);
	}
};

export const getExpenseSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const where: any = { userId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const expenses = await prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    const total = await prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: expenses,
        total: total._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Error fetching expense summary', 500);
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, category, note, date }: UpdateExpenseRequest = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Verify the expense belongs to the user
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      throw new AppError('Expense not found', 404);
    }

    if (existingExpense.userId !== userId) {
      throw new AppError('Not authorized to update this expense', 403);
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        amount,
        category,
        note,
        date,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        expense: updatedExpense,
      },
    });
  } catch (error) {
    console.error('Update expense error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Error updating expense', 500);
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Verify the expense belongs to the user
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      throw new AppError('Expense not found', 404);
    }

    if (existingExpense.userId !== userId) {
      throw new AppError('Not authorized to delete this expense', 403);
    }

    await prisma.expense.delete({
      where: { id },
    });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Error deleting expense', 500);
  }
};
