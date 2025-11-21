// app/(app)/add-expense.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useExpenses } from "../contexts/ExpensesContext";
import { ExpenseFormData } from "../types/expense";
import { useFocusEffect } from '@react-navigation/native';

const categories = [
	"Food",
	"Transportation",
	"Housing",
	"Utilities",
	"Entertainment",
	"Shopping",
	"Healthcare",
	"Education",
	"Other",
];

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { expenses, addExpense, updateExpense } = useExpenses();
  const { userInfo } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: "",
    description: "",
    category: categories[0],
    date: new Date().toISOString().split("T")[0],
    userId: userInfo?.id || "",
  });

  // Reset form when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset form when mounting/refocusing
      if (!id) {
        setFormData({
          amount: "",
          description: "",
          category: categories[0],
          date: new Date().toISOString().split("T")[0],
          userId: userInfo?.id || "",
        });
        setHasUnsavedChanges(false);
      }
    }, [id, userInfo?.id])
  );

  // Load expense data if in edit mode
  useEffect(() => {
    if (id) {
      const expense = expenses.find((e) => e.id === id);
      if (expense) {
        setFormData({
          amount: expense.amount.toString(),
          description: expense.description || "",
          category: expense.category,
          date: expense.date.split("T")[0],
          userId: expense.userId,
        });
        setHasUnsavedChanges(false);
      }
    } else {
      // Reset form with current user ID when adding a new expense
      setFormData(prev => ({
        ...prev,
        amount: "",
        description: "",
        category: categories[0],
        date: new Date().toISOString().split("T")[0],
        userId: userInfo?.id || "",
      }));
      setHasUnsavedChanges(false);
    }
  }, [id, expenses, userInfo?.id]);

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate form
      if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
        Alert.alert("Error", "Please enter a valid amount");
        return;
      }

      const expenseData = {
        ...formData,
        amount: Number(formData.amount),
        date: new Date(formData.date).toISOString(),
      };

      if (id) {
        await updateExpense(id, expenseData);
        Alert.alert("Success", "Expense updated successfully!");
      } else {
        await addExpense(expenseData);
        Alert.alert("Success", "Expense added successfully!");
      }

      // Reset form and navigate back
      setHasUnsavedChanges(false);
      router.back();
    } catch (error) {
      console.error("Error saving expense:", error);
      Alert.alert("Error", "Failed to save expense. Please try again.");
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          value={formData.amount}
          onChangeText={(text) => 
            handleInputChange('amount', text.replace(/[^0-9.]/g, ''))
          }
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What was this expense for?"
          value={formData.description}
          onChangeText={(text) => 
            handleInputChange('description', text)
          }
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={formData.category}
            onValueChange={(itemValue) =>
              handleInputChange('category', itemValue)
            }>
            {categories.map((category) => (
              <Picker.Item key={category} label={category} value={category} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => {
            setShowDatePicker(true);
            setHasUnsavedChanges(true);
          }}>
          <Text>{formData.date}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(formData.date)}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                handleInputChange('date', selectedDate.toISOString().split("T")[0]);
              }
            }}
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {id ? 'Update' : 'Add'} Expense
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  dateInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    height: 50,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: 'center',
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#8E8E93",
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: "#007AFF",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
});
