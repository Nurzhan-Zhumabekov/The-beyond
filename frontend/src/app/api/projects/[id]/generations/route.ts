import { NextRequest, NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase-server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const response = await supabaseFetch(`/rest/v1/generations?project_id=eq.${encodeURIComponent(id)}&select=id,source_text,source_url,output_type,status,estimated_cost,created_at&order=created_at.desc`);
    const rows = await response.json();
    if (!response.ok) return NextResponse.json({ detail: "Could not load history" }, { status: 400 });
    return NextResponse.json(rows.map((item: Record<string, unknown>) => ({ id: item.id, project_id: id, created_at: item.created_at, source: item.source_text || item.source_url || "Source", output_type: item.output_type, cost: Number(item.estimated_cost || 0), status: item.status === "completed" ? "approved" : item.status })));
  } catch { return NextResponse.json({ detail: "Please sign in" }, { status: 401 }); }
}
