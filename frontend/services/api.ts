import type { AssetUpdatePayload, Brandbook, GenerationRequest, GenerationResult, HistoryItem, Project } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCKS = true;

const wait = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

const mockProjects: Project[] = [
  { id: "demo", name: "Demo Campaign", description: "AI Content Factory launch campaign", last_generation_at: "2026-09-11T11:30:00+05:00" },
  { id: "launch", name: "Product Launch", description: "Social media launch package", last_generation_at: "2026-09-10T18:00:00+05:00" },
];

const mockBrandbook: Brandbook = {
  project_id: "demo",
  brand_name: "BEYOND",
  primary_color: "#7c5cff",
  text_color: "#ffffff",
  overlay_color: "#111111",
  overlay_opacity: 0.4,
  heading_font: "Inter",
  body_font: "Inter",
};

const mockGeneration: GenerationResult = {
  id: "gen-001",
  project_id: "demo",
  status: "draft",
  title: "AI is changing modern content production",
  key_points: ["One source becomes multiple formats", "Brand consistency is preserved", "Human review happens before publication"],
  telegram_post: "AI is changing how teams create content. One source can now become a complete package for multiple channels — faster and with brand rules intact.",
  instagram_post: "One idea. Multiple formats. Less manual work. AI Content Factory turns source material into ready-to-review content and branded visuals.",
  linkedin_post: "Content production is moving from isolated manual tasks to coordinated AI-assisted workflows while preserving human review before publication.",
  background_url: "/mock/background.jpg",
  poster_square_url: "/mock/poster-square.jpg",
  banner_wide_url: "/mock/banner-wide.jpg",
  cost: 0.18,
  api_calls: 2,
  created_at: "2026-09-11T11:30:00+05:00",
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!response.ok) {
    let message = "API request failed";
    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function register(payload: { name: string; email: string; password: string }) {
  if (USE_MOCKS) {
    await wait();
    if (payload.email.toLowerCase() === "exists@example.com") throw new Error("An account with this email already exists.");
    return { token: "mock-token", user: { name: payload.name, email: payload.email } };
  }
  return request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export async function login(payload: { email: string; password: string }) {
  if (USE_MOCKS) {
    await wait();
    if (payload.password === "wrongpass") throw new Error("Incorrect email or password.");
    return { token: "mock-token" };
  }
  return request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export async function getProjects(): Promise<Project[]> {
  if (USE_MOCKS) { await wait(250); return mockProjects; }
  return request("/api/projects");
}

export async function createProject(payload: Pick<Project, "name" | "description">): Promise<Project> {
  if (USE_MOCKS) { await wait(); return { id: `project-${Date.now()}`, ...payload }; }
  return request("/api/projects", { method: "POST", body: JSON.stringify(payload) });
}

export async function getBrandbook(projectId: string): Promise<Brandbook> {
  if (USE_MOCKS) { await wait(250); return { ...mockBrandbook, project_id: projectId }; }
  return request(`/api/projects/${projectId}/brandbook`);
}

export async function saveBrandbook(projectId: string, payload: Brandbook): Promise<Brandbook> {
  if (USE_MOCKS) { await wait(); return payload; }
  return request(`/api/projects/${projectId}/brandbook`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function generateContent(payload: GenerationRequest): Promise<GenerationResult> {
  if (USE_MOCKS) { await wait(1700); return { ...mockGeneration, project_id: payload.project_id, id: `gen-${Date.now()}` }; }
  return request("/api/generate", { method: "POST", body: JSON.stringify(payload) });
}

export async function getGeneration(generationId: string): Promise<GenerationResult> {
  if (USE_MOCKS) { await wait(250); return { ...mockGeneration, id: generationId }; }
  return request(`/api/generations/${generationId}`);
}

export async function updateAsset(payload: AssetUpdatePayload) {
  if (USE_MOCKS) { await wait(); return { ...payload, saved: true }; }
  return request(`/api/assets/${payload.asset_id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function createVariant(assetId: string, instruction?: string) {
  if (USE_MOCKS) { await wait(900); return { id: `variant-${Date.now()}`, asset_id: assetId, instruction }; }
  return request(`/api/assets/${assetId}/variants`, { method: "POST", body: JSON.stringify({ instruction }) });
}

export async function getHistory(projectId: string): Promise<HistoryItem[]> {
  if (USE_MOCKS) {
    await wait(250);
    return [
      { id: "gen-001", project_id: projectId, created_at: "2026-09-11T11:30:00+05:00", source: "AI content production article", output_type: "package", cost: 0.18, status: "approved" },
      { id: "gen-002", project_id: projectId, created_at: "2026-09-11T10:10:00+05:00", source: "https://example.com/article", output_type: "poster", cost: 0.09, status: "draft" },
    ];
  }
  return request(`/api/projects/${projectId}/generations`);
}
