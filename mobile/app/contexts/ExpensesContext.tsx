// app/contexts/ExpensesContext.tsx
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { Expense } from "../types/expense";

// Debounce utility function
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: ThisParameterType<F>, ...args: Parameters<F>) {
    const context = this;
    
    return new Promise<ReturnType<F>>((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        timeout = null;
        resolve(func.apply(context, args));
      }, wait);
    });
  };
};

export type ExpenseFilters = {
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

type ExpensesContextType = {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  currentFilters: ExpenseFilters;
  addExpense: (
    expense: Omit<Expense, "id" | "createdAt" | "updatedAt">
  ) => Promise<Expense>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  fetchExpenses: (filters?: ExpenseFilters, force?: boolean) => Promise<{ data: Expense[]; pagination?: any } | undefined>;
  setFilters: (filters: ExpenseFilters) => void;
  resetFilters: () => void;
};

const ExpensesContext = createContext<ExpensesContextType | undefined>(
	undefined
);

// Removed unused lastFetchTime variable

export const ExpensesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<ExpenseFilters>({
    page: 1,
    limit: 10,
  });
  const isMounted = useRef(true);
  const isFetching = useRef(false);
  const lastFetchKey = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Helper function to process different response formats and extract expenses with pagination
  const processExpensesResponse = useCallback((data: any): { expenses: Expense[], pagination?: any } => {
    // If response follows the standard format with data.expenses and data.pagination
    if (data?.data?.expenses) {
      return {
        expenses: data.data.expenses,
        pagination: data.data.pagination
      };
    }
    
    // If response has expenses array directly
    if (Array.isArray(data?.expenses)) {
      return {
        expenses: data.expenses,
        pagination: data.pagination || {
          page: 1,
          limit: data.expenses.length,
          total: data.expenses.length,
          totalPages: 1
        }
      };
    }
    
    // Fallback for array responses
    const expenses = Array.isArray(data) ? data : [];
    return {
      expenses,
      pagination: {
        page: 1,
        limit: expenses.length,
        total: expenses.length,
        totalPages: 1
      }
    };
  }, []);

  // Create a debounced version of the fetch function with simplified deduplication
  const debouncedFetchExpenses = useMemo(
    () => 
      debounce(async (filters: ExpenseFilters = {}, force = false) => {
        const mergedFilters = { ...currentFilters, ...filters };
        const fetchKey = JSON.stringify(mergedFilters);
        
        // Only skip if it's the exact same request and we're already processing it
        if (isFetching.current && lastFetchKey.current === fetchKey && !force) {
          console.log('⏭️  Skipping duplicate request');
          return;
        }

        console.log('🔄 Fetching expenses with filters:', mergedFilters);
        setLoading(true);
        setError(null);
        isFetching.current = true;
        lastFetchKey.current = fetchKey;

        try {
          const { page = 1, limit = 10, ...filterParams } = mergedFilters;
          const queryParams = new URLSearchParams({
            ...filterParams,
            page: page.toString(),
            limit: limit.toString(),
          });

          const token = await SecureStore.getItemAsync("userToken");
          if (!token) {
            throw new Error("No authentication token found");
          }

          const response = await api.get(`/expenses?${queryParams.toString()}`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
          });
          
          const { expenses: expensesData, pagination } = processExpensesResponse(response.data);
          
          if (!isMounted.current) return { data: expensesData, pagination };
          
          console.log('✅ Received expenses:', {
            count: expensesData.length,
            page: pagination?.page,
            total: pagination?.total
          });
          
          setExpenses(prevExpenses => 
            page > 1 ? [...prevExpenses, ...expensesData] : expensesData
          );
          
          if (pagination) {
            setCurrentPage(pagination.page || page);
            setTotalPages(pagination.totalPages || 1);
            setTotalItems(pagination.total || expensesData.length);
          }
          
          // Update the last fetch key after successful update
          lastFetchKey.current = fetchKey;
          setCurrentFilters(mergedFilters);
          
          return { data: expensesData, pagination };
        } catch (error) {
          console.error('Error fetching expenses:', error);
          if (isMounted.current) {
            setError(error instanceof Error ? error.message : 'Failed to fetch expenses');
          }
          throw error;
        } finally {
          if (isMounted.current) {
            setLoading(false);
            isFetching.current = false;
          }
        }
      }, 300), // 300ms debounce time
    [currentFilters, isMounted, processExpensesResponse]
  );

  // Use the debounced version as the main fetch function
  const fetchExpenses = useCallback(async (
    filters: ExpenseFilters = {}, 
    force = false
  ): Promise<{ data: Expense[]; pagination?: any } | undefined> => {
    if (!isMounted.current) return;
    
    // Create a stable filters object with defaults
    const stableFilters = {
      page: 1,
      limit: 10,
      ...filters
    };
    
    const fetchKey = JSON.stringify(stableFilters);
    
    // Skip if already fetching with the same filters and not forced
    if ((isFetching.current && !force) || (lastFetchKey.current === fetchKey && !force)) {
      console.log('⏭️  Skipping fetch - already in progress or same filters');
      return;
    }
    
    isFetching.current = true;
    lastFetchKey.current = fetchKey;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await debouncedFetchExpenses(stableFilters, force);
      
      if (isMounted.current && result) {
        const { data: expensesData, pagination } = result;
        const page = stableFilters.page;
        
        // Only update state if the data has changed
        setExpenses(prevExpenses => {
          const newExpenses = page > 1 ? [...prevExpenses, ...expensesData] : expensesData;
          // Check if the data has actually changed
          if (JSON.stringify(prevExpenses) === JSON.stringify(newExpenses)) {
            return prevExpenses;
          }
          return newExpenses;
        });
        
        if (pagination) {
          setCurrentPage(prev => pagination.page === prev ? prev : pagination.page);
          setTotalPages(prev => pagination.totalPages === prev ? prev : pagination.totalPages);
          setTotalItems(prev => pagination.total === prev ? prev : pagination.total);
        }
        
        // Only update filters if they've actually changed
        setCurrentFilters(prev => {
          return JSON.stringify(prev) === JSON.stringify(stableFilters) 
            ? prev 
            : { ...stableFilters };
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error in fetchExpenses:', error);
      if (isMounted.current) {
        setError(error instanceof Error ? error.message : 'Failed to fetch expenses');
      }
      throw error;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [debouncedFetchExpenses]);
  
  // Update filters and refetch
  const setFilters = useCallback((filters: ExpenseFilters) => {
    setCurrentFilters(prev => {
      // Check if filters have actually changed
      const hasChanged = Object.entries(filters).some(([key, value]) => 
        prev[key as keyof ExpenseFilters] !== value
      );
      
      // Only update if something actually changed
      if (!hasChanged) return prev;
      
      return {
        ...prev,
        ...filters,
        page: 1, // Reset to first page when filters change
      };
    });
    fetchExpenses({
      ...currentFilters,
      ...filters,
      page: 1,
    }, true);
  }, [currentFilters, fetchExpenses]);
  
  // Reset all filters
  const resetFilters = useCallback(() => {
    const defaultFilters = { page: 1, limit: 10 };
    setCurrentFilters(defaultFilters);
    fetchExpenses(defaultFilters, true);
  }, [fetchExpenses]);

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
    currentPage,
    totalPages,
    totalItems,
    currentFilters,
    addExpense,
    updateExpense,
    deleteExpense,
    fetchExpenses,
    setFilters,
    resetFilters,
  }), [
    expenses,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    currentFilters,
    addExpense,
    updateExpense,
    deleteExpense,
    fetchExpenses,
    setFilters,
    resetFilters,
  ]);

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
