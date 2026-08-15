export interface Project {
  id: number;
  slug: string;
  name: string;
  shortCode: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  callbackBaseUrl: string;
  createdAt: string;
  lastActiveAt: string | null;
}

export type ProjectsResponse = Project[];
export type CreateProjectResponse = Project;
