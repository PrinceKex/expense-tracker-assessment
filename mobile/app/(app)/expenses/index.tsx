// app/(app)/expenses/index.tsx
import { AntDesign } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import { Link, router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useExpenses } from "../../contexts/ExpensesContext";
import { Expense } from "../../types/expense";

export default function ExpensesScreen() {
  const { 
    expenses, 
    loading, 
    error: _, // Explicitly mark as unused with _
    fetchExpenses, 
    deleteExpense 
  } = useExpenses();
  
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Handle pull-to-refresh with debouncing
  const onRefresh = useCallback(async () => {
    if (refreshing || isFetchingRef.current) {
      console.log('⏭️  Refresh already in progress, skipping');
      return;
    }
    
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    isFetchingRef.current = true;
    
    try {
      await fetchExpenses(true); // Force refresh
      console.log('✅ Refresh completed successfully');
    } catch (error) {
      console.error("❌ Error refreshing expenses:", error);
      // Consider showing an error toast to the user here
    } finally {
      isFetchingRef.current = false;
      setRefreshing(false);
    }
  }, [fetchExpenses, refreshing]); // Added refreshing back to deps to fix lint

  // Memoize the fetchExpenses function to prevent recreation
  const memoizedFetchExpenses = useCallback(() => {
    return fetchExpenses();
  }, [fetchExpenses]);

  // Handle initial load and focus events with debouncing
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let timeoutId: ReturnType<typeof setTimeout>;
      
      const loadExpenses = async () => {
        // Prevent multiple simultaneous fetches
        if (isFetchingRef.current) {
          console.log('⏭️  Fetch already in progress, skipping');
          return;
        }
        
        // Only fetch if we haven't loaded before or if we have no data
        const shouldFetch = !initialLoadRef.current || expenses.length === 0;
        
        if (shouldFetch) {
          isFetchingRef.current = true;
          try {
            console.log('🔍 Loading expenses...');
            await memoizedFetchExpenses();
            if (isActive) {
              initialLoadRef.current = true;
              console.log('✅ Initial load completed');
            }
          } catch (error) {
            console.error('❌ Error loading expenses:', error);
          } finally {
            isFetchingRef.current = false;
          }
        } else {
          console.log('ℹ️  Using cached data, no fetch needed');
        }
      };

      // Add a small delay to batch rapid focus events
      timeoutId = setTimeout(() => {
        void loadExpenses();
      }, 100); // 100ms debounce
      
      return () => {
        isActive = false;
        clearTimeout(timeoutId);
      };
    }, [expenses.length, memoizedFetchExpenses]) // Include memoized function in deps
  );

	const renderExpenseItem = ({ item }: { item: Expense }) => (
  <View style={styles.expenseItem}>
    <View style={styles.expenseInfo}>
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>
          ${parseFloat(item.amount.toString()).toFixed(2)}
        </Text>
        <Text style={styles.category}>{item.category}</Text>
      </View>
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <Text style={styles.date}>
        {format(new Date(item.date), "MMM dd, yyyy")}
      </Text>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity 
        onPress={() => router.push(`/expenses/edit-expense?id=${item.id}`)}
        style={styles.editButton}
      >
        <AntDesign name="edit" size={20} color="#007AFF" />
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => deleteExpense(item.id)}
        style={styles.deleteButton}
      >
        <AntDesign name="delete" size={20} color="#ff3b30" />
      </TouchableOpacity>
    </View>
  </View>
);

	if (loading && !refreshing) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={expenses}
				renderItem={renderExpenseItem}
				keyExtractor={(item) => item.id}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>No expenses yet</Text>
						<Link href="/(app)/add-expense" asChild>
							<Text style={styles.addExpenseLink}>Add your first expense</Text>
						</Link>
					</View>
				}
			/>
			<Link href="/(app)/add-expense" style={styles.addButton} asChild>
				<AntDesign name="plus-circle" size={56} color="#007AFF" />
			</Link>
		</View>
	);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  expenseItem: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseInfo: {
    flex: 1,
    marginRight: 10,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: "#888",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  date: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  errorText: {
    color: "#ff3b30",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 16,
  },
  addExpenseLink: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
});
