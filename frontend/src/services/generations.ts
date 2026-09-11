import { request, USE_MOCKS } from "@/lib/api";
import type { AssetUpdatePayload, GenerationRequest, GenerationResult, HistoryItem } from "@/types";

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

const baseResult: GenerationResult = {
  id: "gen-001",
  project_id: "demo",
  status: "draft",
  title: "AI is changing modern content production",
  key_points: ["One source becomes multiple formats", "Brand consistency is preserved", "Human review happens before publication"],
  telegram_post: "AI is changing how teams create content. One source can now become a complete package for multiple channels.",
  instagram_post: "One idea. Multiple formats. Less manual work. AI Content Factory turns source material into ready-to-review content and branded visuals.",
  linkedin_post: "Content production is moving from isolated manual tasks to coordinated AI-assisted workflows while preserving human review.",
  background_url: "/logo.svg",
  poster_square_url: "/logo.svg",
  banner_wide_url: "/logo.svg",
  cost: 0.18,
  api_calls: 2,
  created_at: "2026-09-11T11:30:00+05:00"
};

export async function generateContent(payload: GenerationRequest): Promise<GenerationResult> {
  if (USE_MOCKS) { await wait(1600); return { ...baseResult, id: `gen-${Date.now()}`, project_id: payload.project_id }; }
  const response = await request<{
    generation_id: string;
    status: "completed" | "failed";
    title?: string;
    key_points?: string[];
    social_posts?: { telegram: string; instagram: string; linkedin: string };
    assets?: Array<{ asset_type: "background" | "poster" | "banner"; url: string }>;
    usage: { estimated_cost: number; llm_calls: number };
    error?: string;
  }>("/api/generate", { method: "POST", body: JSON.stringify(payload) });

  if (response.status === "failed" || !response.title || !response.key_points || !response.social_posts) {
    throw new Error(response.error || "Generation failed");
  }

  const assets = response.assets || [];

  return {
    id: response.generation_id,
    project_id: payload.project_id,
    status: "draft",
    title: response.title,
    key_points: response.key_points,
    telegram_post: response.social_posts.telegram,
    instagram_post: response.social_posts.instagram,
    linkedin_post: response.social_posts.linkedin,
    background_url: assets.find((asset) => asset.asset_type === "background")?.url,
    poster_square_url: assets.find((asset) => asset.asset_type === "poster")?.url,
    banner_wide_url: assets.find((asset) => asset.asset_type === "banner")?.url,
    cost: response.usage.estimated_cost,
    api_calls: response.usage.llm_calls,
    created_at: new Date().toISOString(),
  };
}

export async function getHistory(projectId: string): Promise<HistoryItem[]> {
  if (USE_MOCKS) {
    await wait();
    return [
      { id: "gen-001", project_id: projectId, created_at: "2026-09-11T11:30:00+05:00", source: "AI content production article", output_type: "media_pack", cost: 0.18, status: "approved" },
      { id: "gen-002", project_id: projectId, created_at: "2026-09-11T10:10:00+05:00", source: "https://example.com/article", output_type: "poster", cost: 0.09, status: "draft" }
    ];
  }
  return request<HistoryItem[]>(`/api/projects/${projectId}/generations`);
}

export async function updateAsset(payload: AssetUpdatePayload) {
  if (USE_MOCKS) { await wait(); return { ...payload, saved: true }; }
  return request(`/api/assets/${payload.asset_id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function createVariant(assetId: string, instruction?: string) {
  if (USE_MOCKS) { await wait(); return { id: `variant-${Date.now()}`, asset_id: assetId, instruction }; }
  return request(`/api/assets/${assetId}/variants`, { method: "POST", body: JSON.stringify({ instruction }) });
}
