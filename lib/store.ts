import { create } from 'zustand';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api';

interface User {
  userId: string;
  email: string;
  role: 'ADMIN' | 'ENSEIGNANT' | 'PARENT';
  prenom?: string;
  nom?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loginAdmin: (email: string, password: string) => Promise<void>;
  loginUser: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  loginAdmin: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.loginAdmin(email, password);
      const { accessToken, refreshToken, userId, role, email: userEmail } =
        response.data;

      Cookies.set('token', accessToken, { expires: 7 });
      Cookies.set('auth_token', accessToken, { expires: 7 });
      if (refreshToken)
        Cookies.set('refresh_token', refreshToken, { expires: 7 });
      set({
        token: accessToken,
        user: { userId, email: userEmail, role },
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  loginUser: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.loginUser(email, password);
      const { accessToken, refreshToken, userId, role, email: userEmail } =
        response.data;

      Cookies.set('token', accessToken, { expires: 7 });
      Cookies.set('auth_token', accessToken, { expires: 7 });
      if (refreshToken)
        Cookies.set('refresh_token', refreshToken, { expires: 7 });
      set({
        token: accessToken,
        user: { userId, email: userEmail, role },
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    set({ user: null, token: null });
    void apiClient.logout();
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  setToken: (token: string | null) => {
    set({ token });
  },

  initializeAuth: () => {
    const token = Cookies.get('token');
    if (token) {
      set({ token });
    }
  },
}));

