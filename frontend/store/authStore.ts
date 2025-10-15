import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  user_id: string;
  user_type: 'Foodie' | 'Restaurant';
  profile_name: string;
  handle: string;
  avatar_base64?: string;
  email?: string;
  bio?: string;
  followers?: string[];
  following?: string[];
  restaurant_details?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

// Storage helper for cross-platform support
const storage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setToken: async (token) => {
    if (token) {
      await storage.setItem('authToken', token);
    } else {
      await storage.removeItem('authToken');
    }
    set({ token });
  },
  logout: async () => {
    await storage.removeItem('authToken');
    set({ user: null, token: null });
  },
  loadAuth: async () => {
    try {
      const token = await storage.getItem('authToken');
      if (token) {
        set({ token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      set({ isLoading: false });
    }
  },
}));
