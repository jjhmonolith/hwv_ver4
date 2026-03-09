"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Teacher {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  teacher: Teacher | null;
  token: string | null;
}

const API_BASE =
  process.env.NEXT_PUBLIC_EXPRESS_API_URL || "http://localhost:4010";

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    teacher: null,
    token: null,
  });

  const validateToken = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setState({
          isLoading: false,
          isAuthenticated: true,
          teacher: data.teacher,
          token,
        });
      } else {
        localStorage.removeItem("teacherToken");
        setState({
          isLoading: false,
          isAuthenticated: false,
          teacher: null,
          token: null,
        });
      }
    } catch {
      localStorage.removeItem("teacherToken");
      setState({
        isLoading: false,
        isAuthenticated: false,
        teacher: null,
        token: null,
      });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("teacherToken");
    if (token) {
      validateToken(token);
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [validateToken]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "로그인 실패");
    }

    const data = await res.json();
    localStorage.setItem("teacherToken", data.token);
    setState({
      isLoading: false,
      isAuthenticated: true,
      teacher: data.teacher,
      token: data.token,
    });

    return data;
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "회원가입 실패");
      }

      const data = await res.json();
      localStorage.setItem("teacherToken", data.token);
      setState({
        isLoading: false,
        isAuthenticated: true,
        teacher: data.teacher,
        token: data.token,
      });

      return data;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("teacherToken");
    setState({
      isLoading: false,
      isAuthenticated: false,
      teacher: null,
      token: null,
    });
    router.push("/teacher/login");
  }, [router]);

  return {
    ...state,
    login,
    register,
    logout,
  };
}
