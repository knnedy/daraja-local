import type { Project } from "@/lib/types/project";

// Temporary in-memory store standing in for the Go backend.
// Replace with real fetch calls once /api/projects exists.
const projects: Project[] = [];

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = base;
  let suffix = 2;
  while (projects.some((p) => p.slug === slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createProject(input: {
  name: string;
  callbackBaseUrl: string;
}): Promise<Project> {
  const project: Project = {
    slug: slugify(input.name),
    name: input.name,
    shortCode: String(100000 + Math.floor(Math.random() * 900000)),
    consumerKey: randomHex(20),
    consumerSecret: randomHex(20),
    passkey: randomHex(32),
    callbackBaseUrl: input.callbackBaseUrl,
    createdAt: new Date().toISOString(),
    lastActiveAt: null,
  };

  projects.push(project);
  return project;
}

export async function listProjects(): Promise<Project[]> {
  return projects;
}
