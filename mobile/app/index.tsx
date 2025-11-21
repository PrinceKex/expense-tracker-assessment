// app/index.tsx
import { Redirect } from "expo-router";
import { useAuth } from "./contexts/AuthContext";

export default function Index() {
	const { userToken } = useAuth();

	if (userToken) {
		return <Redirect href="/(app)" />;
	}

	return <Redirect href="/(auth)/login" />;
}
