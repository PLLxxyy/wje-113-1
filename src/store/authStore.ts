import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

export type UserRole = "user" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}

interface SimpleResponse {
  success: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (data: LoginData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post<AuthResponse>("/auth/login", data, {
            skipAuth: true,
          });
          localStorage.setItem("token", res.data.token);
          set({ user: res.data.user, token: res.data.token, isLoading: false });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "登录失败，请重试";
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post<AuthResponse>("/auth/register", data, {
            skipAuth: true,
          });
          localStorage.setItem("token", res.data.token);
          set({ user: res.data.user, token: res.data.token, isLoading: false });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "注册失败，请重试";
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.post<SimpleResponse>("/auth/logout");
        } catch {
        } finally {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          set({ user: null, token: null, isLoading: false });
        }
      },

      fetchMe: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.get<{ success: boolean; data: User }>("/auth/me");
          set({ user: res.data, isLoading: false });
        } catch (err) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          set({ user: null, token: null, isLoading: false });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
