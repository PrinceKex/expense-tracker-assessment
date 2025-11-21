// app/contexts/AuthContext.tsx
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import axiosInstance from "../services/api";
// Alert is kept for potential future use
// Imported for type definitions and potential future API calls

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  isLoading: boolean;
  userToken: string | null;
  userInfo: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  
  useEffect(() => {
    // Check if user is logged in on app start
    const bootstrapAsync = async () => {
      try {
        const [token, userInfoStr] = await Promise.all([
          SecureStore.getItemAsync("userToken"),
          SecureStore.getItemAsync("userInfo")
        ]);

        if (token && userInfoStr) {
          setUserInfo(JSON.parse(userInfoStr));
          setUserToken(token);
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      // Handle different response formats
      let token: string | undefined;
      
      // Get token from response
      if (response.data.token) {
        // Format: { token } or { data: { token } }
        token = response.data.token;
      } else if (response.data.data?.token) {
        // Format: { data: { token } }
        token = response.data.data.token;
      } else if (response.data.accessToken) {
        // Format: { accessToken }
        token = response.data.accessToken;
      }

      if (!token) {
        console.error('No token found in response:', response.data);
        throw new Error('No authentication token received');
      }

      // Decode the JWT token to get user info
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const decodedToken = JSON.parse(atob(tokenParts[1]));
      const user = {
        id: decodedToken.id,
        email: decodedToken.email,
        name: decodedToken.name || email.split('@')[0] // Default name to email prefix if not in token
      };

      // Store token and user info
      await Promise.all([
        SecureStore.setItemAsync("userToken", token),
        SecureStore.setItemAsync("userInfo", JSON.stringify(user))
      ]);
      
      // Update state
      setUserToken(token);
      setUserInfo(user);
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { 
        success: false, 
        error: (error as any)?.response?.data?.message || "Could not log in. Please check your credentials." 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/auth/register', { 
        name, 
        email, 
        password 
      });
      
      console.log('Registration response:', response.data);
      
      // Handle different response formats
      let token, user;
      
      if (response.data.token && response.data.user) {
        // Format: { token, user }
        ({ token, user } = response.data);
      } else if (response.data.data) {
        // Format: { data: { token, user } }
        ({ token, user } = response.data.data);
      } else {
        // Try to extract token and user from the response
        token = response.data.token || response.data.accessToken;
        user = response.data.user || {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name
        };
      }

      if (!token || !user) {
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response format from server');
      }

      // Store token and user info
      await Promise.all([
        SecureStore.setItemAsync("userToken", token),
        SecureStore.setItemAsync("userInfo", JSON.stringify(user))
      ]);
      
      // Update state
      setUserToken(token);
      setUserInfo(user);
      
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { 
        success: false, 
        error: (error as any)?.response?.data?.message || "Registration failed. Please try again." 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Clear auth data
      await Promise.all([
        SecureStore.deleteItemAsync("userToken"),
        SecureStore.deleteItemAsync("userInfo")
      ]);
      
      // Update state
      setUserToken(null);
      setUserInfo(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      const userInfoStr = await SecureStore.getItemAsync("userInfo");

      if (userInfoStr) {
        setUserInfo(JSON.parse(userInfoStr));
      }
      setUserToken(token);
      return token !== null;
    } catch (e) {
      console.error("isLoggedIn error:", e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        userToken,
        userInfo,
        login,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
