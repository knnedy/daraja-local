import type { RequestLogEntry, RequestLogKind } from "./types/request-log";
import { CreateProjectInput, UpdateProjectInput } from "./schemas/project";
import { UpdateSettingsInput } from "./schemas/settings";
import {
  CreateProjectResponse,
  Project,
  ProjectsResponse,
} from "./types/project";
import { C2BRegistration, SimulatePaymentInput } from "./types/c2b";
import { Initiator } from "./types/initiator";
import { InitiatorCallInput, Transaction } from "./types/transactions";
import {
  Accounts,
  ResultTargets,
  SendB2BInput,
  UpdateAccountsInput,
} from "./types/accounts";
import {
  B2CState,
  SendPayoutInput,
  SendPayoutResponse,
  UpdateB2CStateInput,
} from "./types/b2c";
import { SettingsResponse } from "./types/settings";
import {
  PendingSessionsResponse,
  ResolveResult,
  StkOutcome,
} from "./types/stk";

const kindRoutes: Record<RequestLogKind, string> = {
  stk_push: "stk",
  c2b: "c2b",
  b2c: "b2c",
  b2b: "b2b",
  account_balance: "accounts",
  transaction_status: "transaction-status",
  reversal: "reversal",
};

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
      ): Promise<ResolveResult> {
        return request<ResolveResult>(
          `/api/projects/${encodeURIComponent(slug)}/stk/${encodeURIComponent(checkoutRequestId)}/resolve`,
          {
            method: "POST",
            body: JSON.stringify({ outcome }),
          },
        );
      },

      /** Sends a payment's callback again, byte for byte, to its CallBackURL. */
      resend(slug: string, checkoutRequestId: string): Promise<void> {
        return request<void>(
          `/api/projects/${encodeURIComponent(slug)}/stk/${encodeURIComponent(checkoutRequestId)}/resend`,
          { method: "POST" },
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
    },
    accounts: {
      get(slug: string): Promise<Accounts> {
        return request<Accounts>(
          `/api/projects/${encodeURIComponent(slug)}/accounts`,
        );
      },

      update(slug: string, body: UpdateAccountsInput): Promise<Accounts> {
        return request<Accounts>(
          `/api/projects/${encodeURIComponent(slug)}/accounts`,
          { method: "PUT", body: JSON.stringify(body) },
        );
      },

      /** Sends an Account Balance query, signed as your app would. */
      query(
        slug: string,
        body: ResultTargets,
      ): Promise<{ conversationId: string }> {
        return request<{ conversationId: string }>(
          `/api/projects/${encodeURIComponent(slug)}/accounts/query`,
          { method: "POST", body: JSON.stringify(body) },
        );
      },
    },
    b2b: {
      send(
        slug: string,
        body: SendB2BInput,
      ): Promise<{ conversationId: string }> {
        return request<{ conversationId: string }>(
          `/api/projects/${encodeURIComponent(slug)}/b2b/payments`,
          { method: "POST", body: JSON.stringify(body) },
        );
      },
    },
    transactions: {
      list(slug: string): Promise<Transaction[]> {
        return request<Transaction[]>(
          `/api/projects/${encodeURIComponent(slug)}/transactions`,
        );
      },

      /** Sends a Transaction Status query or Reversal, signed as your app would. */
      send(
        slug: string,
        action: "status" | "reverse",
        { receipt, ...body }: InitiatorCallInput,
      ): Promise<{ conversationId: string }> {
        return request<{ conversationId: string }>(
          `/api/projects/${encodeURIComponent(slug)}/transactions/${encodeURIComponent(receipt)}/${action}`,
          { method: "POST", body: JSON.stringify(body) },
        );
      },
    },
    requestLog: {
      /** The newest entries of one Kind, from that flow's own route. */
      live(
        slug: string,
        kind: RequestLogKind,
        limit: number,
      ): Promise<RequestLogEntry[]> {
        return request<RequestLogEntry[]>(
          `/api/projects/${encodeURIComponent(slug)}/${kindRoutes[kind]}/request-log?limit=${limit}`,
        );
      },

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
