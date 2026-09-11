import { request, USE_MOCKS } from "@/lib/api";
import type { Project } from "@/types";

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
let mockProjects: Project[] = [
  { id: "demo", name: "Demo Campaign", description: "AI Content Factory launch campaign", last_generation_at: "2026-09-11T11:30:00+05:00" },
  { id: "launch", name: "Product Launch", description: "Social media launch package", last_generation_at: "2026-09-10T18:00:00+05:00" }
];

export async function getProjects(): Promise<Project[]> {
  if (USE_MOCKS) { await wait(); return mockProjects; }
  return request<Project[]>("/api/projects");
}

export async function createProject(payload: Pick<Project, "name" | "description">): Promise<Project> {
  if (USE_MOCKS) {
    await wait();
    const project: Project = { id: `project-${Date.now()}`, ...payload };
    mockProjects = [project, ...mockProjects];
    return project;
  }
  return request<Project>("/api/projects", { method: "POST", body: JSON.stringify(payload) });
}
