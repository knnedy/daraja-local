import { CreateProjectInput, UpdateProjectInput } from "./schemas/project";
import { UpdateSettingsInput } from "./schemas/settings";
import {
  CreateProjectResponse,
  Project,
  ProjectsResponse,
} from "./types/project";
import { SettingsResponse } from "./types/settings";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  // Touch/Delete return 204 No Content — no body to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  oauth: {
    generate(
      consumerKey: string,
      consumerSecret: string,
    ): Promise<{ access_token: string; expires_in: string }> {
      const basicAuth = btoa(`${consumerKey}:${consumerSecret}`);
      return request("/oauth/v1/generate?grant_type=client_credentials", {
        headers: { Authorization: `Basic ${basicAuth}` },
      });
    },
  },

  projects: {
    list(): Promise<ProjectsResponse> {
      return request<ProjectsResponse>("/api/projects");
    },

    create(body: CreateProjectInput): Promise<CreateProjectResponse> {
      return request<CreateProjectResponse>("/api/projects", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    get(slug: string): Promise<Project> {
      return request<Project>(`/api/projects/${encodeURIComponent(slug)}`);
    },

    update(slug: string, body: UpdateProjectInput): Promise<Project> {
      return request<Project>(`/api/projects/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },

    remove(slug: string): Promise<void> {
      return request<void>(`/api/projects/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
    },

    touch(slug: string): Promise<void> {
      return request<void>(`/api/projects/${encodeURIComponent(slug)}/touch`, {
        method: "POST",
      });
    },

    regenerateCredentials(slug: string): Promise<Project> {
      return request<Project>(
        `/api/projects/${encodeURIComponent(slug)}/credentials/regenerate`,
        { method: "POST" },
      );
    },

    settings: {
      get(slug: string): Promise<SettingsResponse> {
        return request<SettingsResponse>(
          `/api/projects/${encodeURIComponent(slug)}/settings`,
        );
      },

      update(
        slug: string,
        body: UpdateSettingsInput,
      ): Promise<SettingsResponse> {
        return request<SettingsResponse>(
          `/api/projects/${encodeURIComponent(slug)}/settings`,
          {
            method: "PUT",
            body: JSON.stringify(body),
          },
        );
      },
    },
  },
} as const;
