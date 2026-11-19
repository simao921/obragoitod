import { api, type ProjectSummary, type PublicProject } from "@obragoito/core";

export async function fetchProjects(category?: string): Promise<ProjectSummary[]> {
  const query = category && category !== "todos" ? `?category=${encodeURIComponent(category)}` : "";
  const data = await api.get<{ projects: ProjectSummary[] }>(`/public/projects${query}`);
  return data.projects;
}

export async function fetchProject(slug: string): Promise<{ project: PublicProject; related: ProjectSummary[] }> {
  return api.get<{ project: PublicProject; related: ProjectSummary[] }>(`/public/projects/${encodeURIComponent(slug)}`);
}
