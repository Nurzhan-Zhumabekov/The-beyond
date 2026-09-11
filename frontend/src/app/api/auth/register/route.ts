import { NextRequest, NextResponse } from "next/server";
import { accessCookie, config, refreshCookie, requireSameOrigin, sessionCookieOptions } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ detail: "Invalid request origin" }, { status: 403 }); }
  const { name, email, password } = await request.json() as { name?: string; email?: string; password?: string };
  if (!name || !email || !password) return NextResponse.json({ detail: "Name, email and password are required" }, { status: 400 });
  const { url, anonKey } = config();
  const upstream = await fetch(`${url}/auth/v1/signup`, {
    method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { display_name: name } }),
  });
  const body = await upstream.json();
  if (!upstream.ok) return NextResponse.json({ detail: body.msg || body.message || "Registration failed" }, { status: upstream.status });
  const response = NextResponse.json({ ok: true, confirmationRequired: !body.session });
  if (body.session?.access_token && body.session?.refresh_token) {
    response.cookies.set(accessCookie, body.session.access_token, sessionCookieOptions(body.session.expires_in || 3600));
    response.cookies.set(refreshCookie, body.session.refresh_token, sessionCookieOptions(60 * 60 * 24 * 7));
  }
  return response;
}
