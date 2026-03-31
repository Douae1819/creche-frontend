import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'ENSEIGNANT' | 'PARENT';
  nom?: string;
  prenom?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),
      setToken: (token) => {
        set({ token });
        if (token) {
          Cookies.set('auth_token', token, { expires: 7 });
        } else {
          Cookies.remove('auth_token');
        }
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            }
          );

          if (!response.ok) {
            throw new Error('Identifiants invalides');
          }

          const data = await response.json();
          set({
            user: data.user,
            token: data.token,
            isLoading: false,
          });
          Cookies.set('auth_token', data.token, { expires: 7 });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Erreur de connexion';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        void apiClient.logout();
      },

      initializeAuth: () => {
        const token = Cookies.get('auth_token');
        if (token) {
          set({ token });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);

