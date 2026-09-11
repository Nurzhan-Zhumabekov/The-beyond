import { cookies } from "next/headers";

const accessCookie = "ai_content_factory_access";
const refreshCookie = "ai_content_factory_refresh";

function config() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  return { url: url.replace(/\/$/, ""), anonKey };
}

export async function authHeaders(): Promise<{ url: string; headers: HeadersInit; userId: string }> {
  const { url, anonKey } = config();
  const token = (await cookies()).get(accessCookie)?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("UNAUTHORIZED");
  const user = await response.json() as { id?: string };
  if (!user.id) throw new Error("UNAUTHORIZED");
  return { url, userId: user.id, headers: { apikey: anonKey, Authorization: `Bearer ${token}` } };
}

export async function supabaseFetch(path: string, init: RequestInit = {}) {
  const { url, headers } = await authHeaders();
  return fetch(`${url}${path}`, {
    ...init,
    headers: { ...headers, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
}

export function sessionCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

/** Reject browser cross-origin writes while still allowing non-browser clients. */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("CSRF_ORIGIN_MISMATCH");
}

export { accessCookie, refreshCookie, config };
