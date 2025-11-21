// app/(app)/index.tsx
import { useRouter } from "expo-router";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function HomeScreen() {
  const { userInfo, logout } = useAuth();
  const router = useRouter();

  const handleViewExpenses = () => {
    console.log("Navigating to expenses...");
    router.push("/expenses");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {userInfo?.name || "User"}!</Text>
      <Text style={styles.subtitle}>Track your expenses easily</Text>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={styles.button} 
          onPress={handleViewExpenses}
          accessibilityLabel="View your expenses"
        >
          <Text style={styles.buttonText}>View Expenses</Text>
        </Pressable>

        <Button 
          title="Logout" 
          onPress={logout} 
          accessibilityLabel="Logout from the app"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		padding: 20,
		backgroundColor: "#fff",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 10,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 16,
		marginBottom: 30,
		textAlign: "center",
		color: "#666",
	},
	buttonContainer: {
		gap: 15,
	},
	button: {
		backgroundColor: "#007AFF",
		padding: 15,
		borderRadius: 5,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});
