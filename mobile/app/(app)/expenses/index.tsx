// app/(app)/expenses/index.tsx
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from "@react-navigation/native";
import { format, subMonths } from "date-fns";
import { Link, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ExpenseFilters, useExpenses } from "../../contexts/ExpensesContext";
import { Expense } from "../../types/expense";

// Mock categories - replace with your actual categories
const CATEGORIES = [
  'Food', 'Transportation', 'Housing', 'Entertainment', 
  'Utilities', 'Shopping', 'Healthcare', 'Other'
];

export default function ExpensesScreen() {
  const { 
    expenses, 
    loading, 
    fetchExpenses, 
    currentFilters, 
    setFilters, 
    resetFilters,
    currentPage,
    totalPages,
    deleteExpense
  } = useExpenses();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<ExpenseFilters>({
    ...currentFilters,
    startDate: currentFilters.startDate || format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    endDate: currentFilters.endDate || format(new Date(), 'yyyy-MM-dd')
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const initialLoadRef = useRef(false);
  const isFetchingRef = useRef(false);
  const listRef = useRef<FlatList>(null);

  // Memoize the current filters to prevent unnecessary re-renders
  const currentFiltersRef = useRef(currentFilters);
  currentFiltersRef.current = currentFilters;

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
      // Reset to first page on refresh
      await fetchExpenses({ ...currentFiltersRef.current, page: 1 }, true);
      console.log('✅ Refresh completed successfully');
    } catch (error) {
      console.error("❌ Error refreshing expenses:", error);
    } finally {
      if (isFetchingRef.current) {
        isFetchingRef.current = false;
        setRefreshing(false);
      }
    }
  }, [fetchExpenses, refreshing]);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      if (!initialLoadRef.current) {
        initialLoadRef.current = true;
        try {
          await fetchExpenses({ page: 1, limit: 10 });
        } catch (error) {
          console.error('Failed to load initial data:', error);
        }
      }
    };
    
    loadInitialData();
    
    return () => {
      // Cleanup if needed
    };
  }, [fetchExpenses]);

  // Handle focus events with debouncing and cooldown
  const lastFocusTime = useRef(0);
  const FOCUS_COOLDOWN = 5000; // 5 seconds cooldown
  
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      
      // Only refresh if it's been more than FOCUS_COOLDOWN ms since last refresh
      if (now - lastFocusTime.current > FOCUS_COOLDOWN) {
        lastFocusTime.current = now;
        console.log('🔄 Refreshing on focus');
        
        // Use a small delay to allow the UI to settle
        const timeoutId = setTimeout(() => {
          fetchExpenses(currentFiltersRef.current, true).catch(error => {
            console.error('❌ Error refreshing on focus:', error);
          });
        }, 300);
        
        return () => clearTimeout(timeoutId);
      }
      
      return undefined;
    }, [fetchExpenses])
  );

  // Handle infinite scroll and pagination
  const handleLoadMore = useCallback(() => {
    const hasMore = currentPage < totalPages;
    if (loading || !hasMore) return;
    
    const nextPage = currentPage + 1;
    fetchExpenses({ ...currentFiltersRef.current, page: nextPage });
  }, [loading, currentPage, totalPages, fetchExpenses]);
  
  // Filter changes are handled directly in applyFilters
  // Apply filters
  const applyFilters = () => {
    setFilters(localFilters);
    setShowFilters(false);
  };
  
  // Reset all filters
  const resetAllFilters = () => {
    resetFilters();
    setLocalFilters({
      page: 1,
      limit: 10,
      startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    });
  };
  
  // Render loading footer for pagination
  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  };
  
  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFilters}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter Expenses</Text>
          
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPill,
                  localFilters.category === category && styles.selectedCategory
                ]}
                onPress={() => setLocalFilters(prev => ({
                  ...prev,
                  category: prev.category === category ? undefined : category
                }))}
              >
                <Text style={[
                  styles.categoryText,
                  localFilters.category === category && styles.selectedCategoryText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.filterLabel}>Date Range</Text>
          <View style={styles.dateRangeContainer}>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text>{localFilters.startDate || 'Start Date'}</Text>
              <MaterialIcons name="date-range" size={20} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.dateSeparator}>to</Text>
            
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text>{localFilters.endDate || 'End Date'}</Text>
              <MaterialIcons name="date-range" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          {(showStartDatePicker || showEndDatePicker) && (
            <DateTimePicker
              value={new Date(showStartDatePicker ? localFilters.startDate || new Date() : localFilters.endDate || new Date())}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                const selectedDate = date || new Date();
                const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                
                if (showStartDatePicker) {
                  setLocalFilters(prev => ({
                    ...prev,
                    startDate: formattedDate
                  }));
                  setShowStartDatePicker(false);
                } else {
                  setLocalFilters(prev => ({
                    ...prev,
                    endDate: formattedDate
                  }));
                  setShowEndDatePicker(false);
                }
              }}
            />
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.resetButton]} 
              onPress={resetAllFilters}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.applyButton]} 
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseItemContent}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.description}
          </Text>
          <Text style={styles.expenseAmount}>${item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.expenseMeta}>
          <Text style={styles.expenseCategory}>{item.category}</Text>
          <Text style={styles.expenseDate}>
            {format(new Date(item.date), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>
      <View style={styles.expenseActions}>
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
          <AntDesign name="delete" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with title and filter button */}
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <MaterialIcons name="filter-list" size={24} color="#007AFF" />
          <Text style={styles.filterButtonText}>
            {Object.values(currentFilters).filter(Boolean).length > 2 ? 'Filters *' : 'Filters'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Filter summary */}
      {(currentFilters.category || currentFilters.startDate || currentFilters.endDate) && (
        <View style={styles.filterSummary}>
          <Text style={styles.filterSummaryText}>
            {[
              currentFilters.category && `Category: ${currentFilters.category}`,
              currentFilters.startDate && `From: ${format(new Date(currentFilters.startDate), 'MMM d, yyyy')}`,
              currentFilters.endDate && `To: ${format(new Date(currentFilters.endDate), 'MMM d, yyyy')}`
            ].filter(Boolean).join(' • ')}
          </Text>
          <TouchableOpacity onPress={resetAllFilters}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Expenses list */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={64} color="#DDD" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>
                  {Object.values(currentFilters).filter(Boolean).length > 2 
                    ? 'No expenses match your filters'
                    : 'No expenses found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {Object.values(currentFilters).filter(Boolean).length > 2 
                    ? 'Try adjusting your filters or clear them to see all expenses.' 
                    : 'Add your first expense by tapping the + button'}
                </Text>
                
                {Object.values(currentFilters).filter(Boolean).length > 2 && (
                  <TouchableOpacity 
                    style={styles.clearFiltersButton}
                    onPress={resetAllFilters}
                  >
                    <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
                  </TouchableOpacity>
                )}
                
                {expenses.length === 0 && Object.values(currentFilters).filter(Boolean).length <= 2 && (
                  <TouchableOpacity 
                    style={styles.addFirstButton}
                    onPress={() => router.push('/(app)/add-expense')}
                  >
                    <AntDesign name="plus" size={20} color="#007AFF" />
                    <Text style={styles.addFirstButtonText}>Add Your First Expense</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      </View>
      
      {/* Add expense button */}
      <Link href="/(app)/add-expense" asChild>
        <TouchableOpacity style={styles.addButton}>
          <AntDesign name="plus" size={24} color="white" />
        </TouchableOpacity>
      </Link>
      
      {/* Filter modal */}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
  },
  filterButtonText: {
    marginLeft: 4,
    color: '#007AFF',
    fontWeight: '500',
  },
  filterSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  filterSummaryText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  clearFiltersText: {
    color: '#007AFF',
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: '500',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  dateSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  applyButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  resetButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  expenseItemContent: {
    flex: 1,
    marginRight: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  expenseCategory: {
    fontSize: 14,
    color: "#666",
    marginRight: 12,
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  expenseDate: {
    fontSize: 12,
    color: "#999",
  },
  expenseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 20,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  clearFiltersButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  addFirstButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFirstButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
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
});
