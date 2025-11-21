import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useExpenses } from "../../contexts/ExpensesContext";
import { Expense } from "../../types/expense";

type ExpenseData = {
  amount: string;
  category: string;
  description: string;
  date: string;
};

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { expenses, updateExpense } = useExpenses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState<ExpenseData>({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
  });

  // Load expense data when component mounts or when expense is found
  useEffect(() => {
    if (id) {
      const expense = expenses.find((e: Expense) => e.id === id);
      if (expense) {
        setFormData({
          amount: expense.amount.toString(),
          category: expense.category,
          description: expense.description || "",
          date: expense.date.split('T')[0],
        });
        setHasUnsavedChanges(false);
      }
    }
  }, [id, expenses]);

  const handleInputChange = (field: keyof ExpenseData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  // Handle hardware back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (hasUnsavedChanges) {
          Alert.alert(
            "Discard changes?",
            "You have unsaved changes. Are you sure you want to discard them?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Discard", 
                style: "destructive",
                onPress: () => router.back() 
              }
            ]
          );
          return true; // Prevent default behavior
        }
        return false; // Use default behavior
      };

      // Add event listener
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      // Cleanup
      return () => subscription.remove();
    }, [hasUnsavedChanges])
  );

  const handleUpdateExpense = async () => {
    if (!formData.amount || !formData.category || !formData.date) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const updateData = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
      };
      
      await updateExpense(id!, updateData);
      
      // Reset form state and navigate back
      setHasUnsavedChanges(false);
      router.back();
    } catch (error: any) {
      console.error("Error updating expense:", {
        id,
        updates: formData,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      const errorMessage = error.response?.data?.message || "Failed to update expense. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Discard", 
            style: "destructive",
            onPress: () => router.back() 
          }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Edit Expense</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount*</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={formData.amount}
            onChangeText={(text) => handleInputChange('amount', text.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Category*</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Food, Transport"
            value={formData.category}
            onChangeText={(text) => handleInputChange('category', text)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Add a note (optional)"
            value={formData.description}
            onChangeText={(text) => handleInputChange('description', text)}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date*</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{formData.date}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(formData.date) || new Date()}
              mode="date"
              display="default"
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  handleInputChange('date', selectedDate.toISOString().split('T')[0]);
                }
              }}
            />
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleUpdateExpense}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Expense</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
