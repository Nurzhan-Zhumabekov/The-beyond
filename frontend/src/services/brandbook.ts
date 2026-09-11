import { request, USE_MOCKS } from "@/lib/api";
import type { Brandbook } from "@/types";

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const mockBrandbook: Brandbook = {
  project_id: "demo",
  brand_name: "BEYOND",
  primary_color: "#7c5cff",
  text_color: "#ffffff",
  overlay_color: "#111111",
  overlay_opacity: 0.4,
  heading_font: "Inter",
  body_font: "Inter"
};

export async function getBrandbook(projectId: string): Promise<Brandbook> {
  if (USE_MOCKS) { await wait(); return { ...mockBrandbook, project_id: projectId }; }
  return request<Brandbook>(`/api/projects/${projectId}/brandbook`);
}

export async function saveBrandbook(projectId: string, payload: Brandbook): Promise<Brandbook> {
  if (USE_MOCKS) { await wait(); return payload; }
  return request<Brandbook>(`/api/projects/${projectId}/brandbook`, { method: "PUT", body: JSON.stringify(payload) });
}
