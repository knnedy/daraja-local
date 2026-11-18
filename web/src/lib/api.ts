import type { RequestLogEntry } from "./types/request-log";
import { CreateProjectInput, UpdateProjectInput } from "./schemas/project";
import { UpdateSettingsInput } from "./schemas/settings";
import {
  CreateProjectResponse,
  Project,
  ProjectsResponse,
} from "./types/project";
import { C2BRegistration, SimulatePaymentInput } from "./types/c2b";
import { Initiator } from "./types/initiator";
import {
  B2CState,
  SendPayoutInput,
  SendPayoutResponse,
  UpdateB2CStateInput,
} from "./types/b2c";
import { SettingsResponse } from "./types/settings";
import { PendingSessionsResponse, StkOutcome } from "./types/stk";

// Empty in the embedded build (same-origin); only set for `make dev`.
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

  // Touch/Delete/Resolve return 204 No Content — no body to parse.
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

    initiator(slug: string): Promise<Initiator> {
      return request<Initiator>(
        `/api/projects/${encodeURIComponent(slug)}/initiator`,
      );
    },

    initiatorCertificateUrl(slug: string): string {
      return `${BASE_URL}/api/projects/${encodeURIComponent(slug)}/initiator/certificate`;
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

    stk: {
      listPending(slug: string): Promise<PendingSessionsResponse> {
        return request<PendingSessionsResponse>(
          `/api/projects/${encodeURIComponent(slug)}/stk/pending`,
        );
      },

      resolve(
        slug: string,
        checkoutRequestId: string,
        outcome: StkOutcome,
      ): Promise<void> {
        return request<void>(
          `/api/projects/${encodeURIComponent(slug)}/stk/${encodeURIComponent(checkoutRequestId)}/resolve`,
          {
            method: "POST",
            body: JSON.stringify({ outcome }),
          },
        );
      },

      listRequestLog(slug: string, limit: number): Promise<RequestLogEntry[]> {
        return request<RequestLogEntry[]>(
          `/api/projects/${encodeURIComponent(slug)}/stk/request-log?limit=${limit}`,
        );
      },
    },
    c2b: {
      registration(slug: string): Promise<C2BRegistration> {
        return request<C2BRegistration>(
          `/api/projects/${encodeURIComponent(slug)}/c2b/registration`,
        );
      },

      replay(slug: string, transactionId: string): Promise<void> {
        return request<void>(
          `/api/projects/${encodeURIComponent(slug)}/c2b/${encodeURIComponent(transactionId)}/replay`,
          { method: "POST" },
        );
      },

      simulate(
        slug: string,
        body: SimulatePaymentInput,
      ): Promise<{ conversationId: string }> {
        return request<{ conversationId: string }>(
          `/api/projects/${encodeURIComponent(slug)}/c2b/simulate`,
          { method: "POST", body: JSON.stringify(body) },
        );
      },

      listRequestLog(slug: string, limit: number): Promise<RequestLogEntry[]> {
        return request<RequestLogEntry[]>(
          `/api/projects/${encodeURIComponent(slug)}/c2b/request-log?limit=${limit}`,
        );
      },
    },
    b2c: {
      state(slug: string): Promise<B2CState> {
        return request<B2CState>(
          `/api/projects/${encodeURIComponent(slug)}/b2c`,
        );
      },

      updateState(slug: string, body: UpdateB2CStateInput): Promise<B2CState> {
        return request<B2CState>(
          `/api/projects/${encodeURIComponent(slug)}/b2c`,
          { method: "PUT", body: JSON.stringify(body) },
        );
      },

      sendPayout(
        slug: string,
        body: SendPayoutInput,
      ): Promise<SendPayoutResponse> {
        return request<SendPayoutResponse>(
          `/api/projects/${encodeURIComponent(slug)}/b2c/payouts`,
          { method: "POST", body: JSON.stringify(body) },
        );
      },

      listRequestLog(slug: string, limit: number): Promise<RequestLogEntry[]> {
        return request<RequestLogEntry[]>(
          `/api/projects/${encodeURIComponent(slug)}/b2c/request-log?limit=${limit}`,
        );
      },
    },
    requestLog: {
      list(
        slug: string,
        beforeId: number | null,
        limit: number,
      ): Promise<RequestLogEntry[]> {
        const params = new URLSearchParams({ limit: String(limit) });
        if (beforeId !== null) params.set("before_id", String(beforeId));
        return request<RequestLogEntry[]>(
          `/api/projects/${encodeURIComponent(slug)}/request-log?${params}`,
        );
      },
      clear(slug: string): Promise<void> {
        return request<void>(
          `/api/projects/${encodeURIComponent(slug)}/request-log`,
          {
            method: "DELETE",
          },
        );
      },
    },
  },
} as const;
