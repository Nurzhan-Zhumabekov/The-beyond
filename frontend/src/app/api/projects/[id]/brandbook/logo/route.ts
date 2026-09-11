import { NextRequest, NextResponse } from "next/server";
import { authHeaders, requireSameOrigin } from "@/lib/supabase-server";

const allowedTypes = new Set(["image/png", "image/svg+xml"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file"); const variant = form.get("variant");
    if (!(file instanceof File) || (variant !== "light" && variant !== "dark") || !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ detail: "Upload a PNG/SVG logo up to 10 MB" }, { status: 400 });
    }
    const { url, headers, userId } = await authHeaders();
    const extension = file.type === "image/png" ? "png" : "svg";
    const path = `${userId}/${id}/logo-${variant}.${extension}`;
    const upload = await fetch(`${url}/storage/v1/object/brand-assets/${path}`, { method: "POST", headers: { ...headers, "Content-Type": file.type, "x-upsert": "true" }, body: await file.arrayBuffer() });
    if (!upload.ok) return NextResponse.json({ detail: "Could not upload logo" }, { status: 400 });
    return NextResponse.json({ path });
  } catch (error) { return NextResponse.json({ detail: error instanceof Error && error.message === "CSRF_ORIGIN_MISMATCH" ? "Invalid request origin" : "Please sign in" }, { status: error instanceof Error && error.message === "CSRF_ORIGIN_MISMATCH" ? 403 : 401 }); }
}
