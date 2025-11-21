// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ExpensesProvider } from "./contexts/ExpensesContext";

// This component will handle the auth state and routing
function RootLayoutNav() {
  const { userToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!userToken && !inAuthGroup) {
      // User is not signed in and the initial segment is not in (auth) group
      router.replace('/(auth)/login');
    } else if (userToken && inAuthGroup) {
      // User is signed in and the initial segment is in (auth) group
      router.replace('/(app)');
    }
  }, [userToken, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // For file-based routing, we don't need to manually define screens
  // The Stack will automatically handle all routes based on the file structure
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ExpensesProvider>
            <RootLayoutNav />
          </ExpensesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
