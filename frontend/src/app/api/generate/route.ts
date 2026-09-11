import { NextRequest, NextResponse } from "next/server";
import { authHeaders, requireSameOrigin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const { url, headers } = await authHeaders();
    const body = await request.text();
    const response = await fetch(`${url}/functions/v1/generate-content`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error && error.message === "CSRF_ORIGIN_MISMATCH") return NextResponse.json({ detail: "Invalid request origin" }, { status: 403 });
    return NextResponse.json({ detail: error instanceof Error && error.message === "UNAUTHORIZED" ? "Please sign in" : "Could not start generation" }, { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
