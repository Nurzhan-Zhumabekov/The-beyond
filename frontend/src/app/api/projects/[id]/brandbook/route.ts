import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin, supabaseFetch } from "@/lib/supabase-server";

const select = "project_id,brand_name,light_logo_path,dark_logo_path,primary_color,text_color,overlay_color,overlay_opacity,heading_font,body_font";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const response = await supabaseFetch(`/rest/v1/brandbooks?project_id=eq.${encodeURIComponent(id)}&select=${select}`);
    const rows = await response.json();
    if (!response.ok) return NextResponse.json({ detail: "Could not load brandbook" }, { status: 400 });
    return NextResponse.json(rows[0] || { project_id: id, brand_name: "", primary_color: "#2563EB", text_color: "#FFFFFF", overlay_color: "#000000", overlay_opacity: 0.4, heading_font: "Inter", body_font: "Inter" });
  } catch { return NextResponse.json({ detail: "Please sign in" }, { status: 401 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const payload = await request.json();
    const record = {
      project_id: id, brand_name: payload.brand_name || null,
      light_logo_path: payload.light_logo_path || null, dark_logo_path: payload.dark_logo_path || null,
      primary_color: payload.primary_color, text_color: payload.text_color,
      overlay_color: payload.overlay_color, overlay_opacity: payload.overlay_opacity,
      heading_font: payload.heading_font, body_font: payload.body_font,
    };
    const response = await supabaseFetch(`/rest/v1/brandbooks?on_conflict=project_id`, {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(record),
    });
    const [saved] = await response.json();
    return response.ok ? NextResponse.json(saved) : NextResponse.json({ detail: "Could not save brandbook" }, { status: 400 });
  } catch (error) { return NextResponse.json({ detail: error instanceof Error && error.message === "CSRF_ORIGIN_MISMATCH" ? "Invalid request origin" : "Please sign in" }, { status: error instanceof Error && error.message === "CSRF_ORIGIN_MISMATCH" ? 403 : 401 }); }
}
