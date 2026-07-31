export type NetworkProfile = "stable" | "degraded" | "offline";

export interface Project {
  slug: string;
  name: string;
  shortCode: string;
  createdAt: string;
  lastActiveAt: string | null;
  networkProfile: NetworkProfile;
}
