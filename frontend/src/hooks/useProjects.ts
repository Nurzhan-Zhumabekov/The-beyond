"use client";

import { useEffect, useState } from "react";
import { createProject as createProjectService, getProjects } from "@/services/projects";
import type { Project } from "@/types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProjects().then(setProjects).catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects")).finally(() => setLoading(false));
  }, []);

  async function createProject(name: string, description: string) {
    const project = await createProjectService({ name, description });
    setProjects((items) => [project, ...items]);
    return project;
  }

  return { projects, loading, error, createProject };
}
