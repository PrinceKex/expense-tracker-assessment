// app/(auth)/login.tsx
import { Href, Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const registerHref: Href = "/register";

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    const { success, error } = await login(email, password);
    
    if (!success) {
      Alert.alert("Login Failed", error || "Invalid email or password");
    }
    // The RootLayoutNav will handle the navigation on auth state change
  };

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Expense Tracker</Text>
			<Text style={styles.subtitle}>Login to your account</Text>

			<TextInput
				style={styles.input}
				placeholder="Email"
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
				keyboardType="email-address"
			/>

			<TextInput
				style={styles.input}
				placeholder="Password"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>

			<Button
				title={isLoading ? "Logging in..." : "Login"}
				onPress={handleLogin}
				disabled={isLoading}
			/>

			<Link href={registerHref} asChild>
				<Text style={styles.link}>Don&apos;t have an account? Register</Text>
			</Link>
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
		fontSize: 32,
		fontWeight: "bold",
		marginBottom: 10,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 18,
		marginBottom: 30,
		textAlign: "center",
		color: "#666",
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 5,
		paddingHorizontal: 15,
		marginBottom: 15,
		fontSize: 16,
	},
	link: {
		marginTop: 20,
		color: "#007AFF",
		textAlign: "center",
		fontSize: 16,
	},
});
