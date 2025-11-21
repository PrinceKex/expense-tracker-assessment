// app/contexts/ExpensesContext.tsx
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { Expense } from "../types/expense";

type ExpensesContextType = {
	expenses: Expense[];
	loading: boolean;
	error: string | null;
	addExpense: (
		expense: Omit<Expense, "id" | "createdAt" | "updatedAt">
	) => Promise<Expense>;
	updateExpense: (id: string, expense: Partial<Expense>) => Promise<Expense>;
	deleteExpense: (id: string) => Promise<void>;
	fetchExpenses: (force?: boolean) => Promise<Expense[] | undefined>;
};

const ExpensesContext = createContext<ExpensesContextType | undefined>(
	undefined
);

// Module-level variable to track last fetch time
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const ExpensesProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Helper function to process different response formats
  const processExpensesResponse = useCallback((data: any): Expense[] => {
    if (data?.data?.expenses) return data.data.expenses;
    if (Array.isArray(data?.expenses)) return data.expenses;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    console.warn('Unexpected response format:', data);
    return [];
  }, []);

  const fetchExpenses = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    const dataIsFresh = timeSinceLastFetch < CACHE_DURATION;
    
    console.log(`[${new Date().toISOString()}] Fetch check - ` +
      `Last fetch: ${timeSinceLastFetch}ms ago, ` +
      `Force: ${force}, ` +
      `Has data: ${expenses.length > 0}, ` +
      `Is fetching: ${isFetching.current}`);

    // Skip if already fetching and not forced
    if (isFetching.current && !force) {
      console.log('⏭️  Skipping fetch - already in progress');
      return;
    }

    // Use cached data if available and fresh
    if (!force && dataIsFresh && expenses.length > 0) {
      console.log(`✅ Using cached expenses (${expenses.length} items, ${timeSinceLastFetch}ms old)`);
      return expenses;
    }
    
    // Don't fetch too frequently
    if (timeSinceLastFetch < 1000 && !force) { // 1 second debounce
      console.log('⏳ Debouncing rapid requests');
      return;
    }
    
    try {
      isFetching.current = true;
      const shouldUpdateLoading = !loading;
      if (shouldUpdateLoading) setLoading(true);
      setError(null);
      
      console.log(`📡 ${force ? '[FORCE] ' : ''}Fetching expenses...`);
      
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        throw new Error('No authentication token found');
      }

      const startTime = Date.now();
      const response = await api.get("/expenses");
      const endTime = Date.now();
      
      const expensesData = processExpensesResponse(response.data);
      const fetchDuration = endTime - startTime;
      
      console.log(`✅ Fetched ${expensesData.length} expenses in ${fetchDuration}ms`);
      
      if (isMounted.current) {
        lastFetchTime = endTime; // Update with the actual response time
        setExpenses(expensesData);
        console.log(`🔄 Updated lastFetchTime to: ${new Date(lastFetchTime).toISOString()}`);
      }
      
      return expensesData;
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      
      if (isMounted.current) {
        setError(error.message || 'Failed to fetch expenses');
      }
      throw error; // Re-throw to allow error handling in components
    } finally {
      isFetching.current = false;
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [loading, processExpensesResponse, expenses]);

  const addExpense = useCallback(async (
		expense: Omit<Expense, "id" | "createdAt" | "updatedAt">
	) => {
		try {
			// Ensure date is in ISO format for the backend
			const formattedExpense = {
				...expense,
				date: new Date(expense.date).toISOString()
			};

			console.log("Adding new expense:", formattedExpense);
			const response = await api.post("/expenses", formattedExpense);
			
			// Handle different response formats
			const newExpense = response.data.expense || response.data.data?.expense || response.data;
			
			if (!newExpense?.id) {
				throw new Error("Invalid expense data received from server");
			}
			
			console.log("Expense added successfully:", newExpense);
			setExpenses((prev) => [newExpense, ...prev]);
			return newExpense;
		} catch (error: any) {
			console.error("Error adding expense:", {
				message: error.message,
				status: error.response?.status,
				data: error.response?.data,
				error: error
			});
			
			const errorMessage = error.response?.data?.message || "Failed to add expense. Please try again.";
			throw new Error(errorMessage);
		}
	}, []);

	const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
		try {
			// Format the date to ISO string if it exists in updates
			const formattedUpdates = { ...updates };
			if ('date' in formattedUpdates && formattedUpdates.date) {
				formattedUpdates.date = new Date(formattedUpdates.date).toISOString();
			}
			
			console.log(`Updating expense ${id}:`, formattedUpdates);
			const response = await api.patch(`/expenses/${id}`, formattedUpdates);
			
			// Handle different response formats
			const updatedExpense = response.data.expense || response.data.data?.expense || response.data;
			
			if (!updatedExpense?.id) {
				throw new Error("Invalid updated expense data received from server");
			}
			
			console.log("Expense updated successfully:", updatedExpense);
			setExpenses((prev) =>
				prev.map((expense) =>
					expense.id === id ? { ...expense, ...updatedExpense } : expense
				)
			);
			
			return updatedExpense;
		} catch (error: any) {
			console.error("Error updating expense:", {
				id,
				updates,
				message: error.message,
				status: error.response?.status,
				data: error.response?.data
			});
			
			const errorMessage = error.response?.data?.message || "Failed to update expense. Please try again.";
			throw new Error(errorMessage);
		}
	}, []);

	const deleteExpense = useCallback(async (id: string): Promise<void> => {
		try {
			console.log(`Deleting expense ${id}`);
			await api.delete(`/expenses/${id}`);
			
			// Optimistically remove the expense from the list
			setExpenses((prev) => {
				const newExpenses = prev.filter((expense) => expense.id !== id);
				console.log(`Expense ${id} removed, ${newExpenses.length} expenses remaining`);
				return newExpenses;
			});
		} catch (error: any) {
			console.error("Error deleting expense:", {
				id,
				message: error.message,
				status: error.response?.status,
				data: error.response?.data
			});
			
			const errorMessage = error.response?.data?.message || "Failed to delete expense. Please try again.";
			throw new Error(errorMessage);
		}
	}, []);

	useEffect(() => {
    const checkAuthAndFetch = async () => {
      const token = await SecureStore.getItemAsync("userToken");
      if (token) {
        await fetchExpenses();
      } else {
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [fetchExpenses]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    expenses,
    loading,
    error,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  }), [expenses, loading, error, fetchExpenses, addExpense, updateExpense, deleteExpense]);

  return (
    <ExpensesContext.Provider value={contextValue}>
      {children}
    </ExpensesContext.Provider>
  );
};

export const useExpenses = () => {
	const context = useContext(ExpensesContext);
	if (context === undefined) {
		throw new Error("useExpenses must be used within an ExpensesProvider");
	}
	return context;
};
