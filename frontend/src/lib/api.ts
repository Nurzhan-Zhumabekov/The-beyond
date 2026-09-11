import type { AuthResponse } from "@/types";

/** Same-origin Next API routes keep the Supabase session cookie out of client JS. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
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
    return result;
  }
  const result = await request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
  return result;
}

export async function register(payload: { name: string; email: string; password: string }): Promise<AuthResponse> {
  if (USE_MOCKS) {
    await wait();
    if (payload.email.toLowerCase() === "exists@example.com") throw new Error("An account with this email already exists.");
    const result = { access_token: "mock-token", token_type: "bearer" };
    return result;
  }
  const result = await request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
  return result;
}
