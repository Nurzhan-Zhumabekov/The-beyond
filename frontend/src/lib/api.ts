import type { AuthResponse } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("access_token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("access_token");
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/auth/login";
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    let message = "API request failed";
    try {
      const body = await response.json();
      message = body.detail || body.message || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  if (USE_MOCKS) {
    await wait();
    if (payload.password === "wrongpass") throw new Error("Incorrect email or password.");
    const result = { access_token: "mock-token", token_type: "bearer" };
    saveToken(result.access_token);
    return result;
  }
  const result = await request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
  saveToken(result.access_token);
  return result;
}

export async function register(payload: { name: string; email: string; password: string }): Promise<AuthResponse> {
  if (USE_MOCKS) {
    await wait();
    if (payload.email.toLowerCase() === "exists@example.com") throw new Error("An account with this email already exists.");
    const result = { access_token: "mock-token", token_type: "bearer" };
    saveToken(result.access_token);
    return result;
  }
  const result = await request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
  saveToken(result.access_token);
  return result;
}
