// app/types/expense.ts
export type Expense = {
	id: string;
	amount: number;
	description: string;
	category: string;
	date: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
};

export type ExpenseFormData = {
	amount: string;
	description: string;
	category: string;
	date: string;
	userId: string;
};
