import { NextRequest, NextResponse } from "next/server";
import { authHeaders, requireSameOrigin } from "@/lib/supabase-server";

function errorResponse(error: unknown) {
  return NextResponse.json({ detail: error instanceof Error && error.message === "UNAUTHORIZED" ? "Please sign in" : "Supabase request failed" }, { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500 });
}

export async function GET() {
  try {
    const { url, headers } = await authHeaders();
    const response = await fetch(`${url}/rest/v1/projects?select=id,name,description,created_at,generations(created_at)&order=created_at.desc`, { headers, cache: "no-store" });
    if (!response.ok) throw new Error("PROJECTS_READ_FAILED");
    const records = await response.json() as Array<{ id: string; name: string; description: string | null; created_at: string; generations?: Array<{ created_at: string }> }>;
    return NextResponse.json(records.map((project) => ({
      id: project.id, name: project.name, description: project.description || "",
      last_generation_at: project.generations?.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at,
    })));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const { name, description } = await request.json() as { name?: string; description?: string };
    if (!name?.trim()) return NextResponse.json({ detail: "Project name is required" }, { status: 400 });
    const { url, headers, userId } = await authHeaders();
    const response = await fetch(`${url}/rest/v1/projects`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userId, name: name.trim(), description: description?.trim() || null }),
    });
    const [project] = await response.json();
    if (!response.ok || !project) return NextResponse.json({ detail: "Could not create project" }, { status: 400 });
    return NextResponse.json({ id: project.id, name: project.name, description: project.description || "" }, { status: 201 });
  } catch (error) { return error instanceof Error && error.message === "CSRF_ORIGIN_MISMATCH" ? NextResponse.json({ detail: "Invalid request origin" }, { status: 403 }) : errorResponse(error); }
}
