// app/services/api.ts
import axios from "axios";
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from "react-native";

// Use 10.0.2.2 for Android emulator, localhost for iOS simulator
const BASE_URL = Platform.select({
  android: "http://10.0.2.2:3000/api",
  ios: "http://localhost:3000/api",
  default: "http://localhost:3000/api",
});

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error getting auth token:", error);
  }
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't show error for login/register requests
    if (originalRequest?.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    // Log error details
    console.error("API Error:", {
      message: error.message,
      status: error.response?.status,
      url: originalRequest?.url,
    });

    if (error.response?.status === 401) {
      // Clear auth data
      await Promise.all([
        SecureStore.deleteItemAsync('userToken'),
        SecureStore.deleteItemAsync('userInfo')
      ]);
      
      // Only redirect if not already on login page
      // Using a timeout to ensure we're not in a render phase
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login')) {
          router.replace('/(auth)/login');
        }
      }, 0);
    }

    return Promise.reject(error);
  }
);

export default api;
