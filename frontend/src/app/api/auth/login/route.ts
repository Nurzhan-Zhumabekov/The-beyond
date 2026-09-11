import { NextRequest, NextResponse } from "next/server";
import { accessCookie, config, refreshCookie, requireSameOrigin, sessionCookieOptions } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ detail: "Invalid request origin" }, { status: 403 }); }
  const { email, password } = await request.json() as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
  const { url, anonKey } = config();
  const upstream = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  const body = await upstream.json();
  if (!upstream.ok) return NextResponse.json({ detail: body.error_description || "Invalid email or password" }, { status: upstream.status });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessCookie, body.access_token, sessionCookieOptions(body.expires_in || 3600));
  response.cookies.set(refreshCookie, body.refresh_token, sessionCookieOptions(60 * 60 * 24 * 7));
  return response;
}
