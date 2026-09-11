import { createProject, getProjects } from "@/lib/api";

export const projectsService = {
  list: getProjects,
  create: createProject,
};
