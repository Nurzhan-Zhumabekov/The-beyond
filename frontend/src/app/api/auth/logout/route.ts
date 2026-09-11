import { NextResponse } from "next/server";
import { accessCookie, refreshCookie, requireSameOrigin, sessionCookieOptions } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ detail: "Invalid request origin" }, { status: 403 }); }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessCookie, "", sessionCookieOptions(0));
  response.cookies.set(refreshCookie, "", sessionCookieOptions(0));
  return response;
}
