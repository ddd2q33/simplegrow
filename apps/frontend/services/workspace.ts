import type {
  AccountGroup,
  ActivityEvent,
  Notification,
  Recommendation,
  SocialAccount,
  User,
  Workspace,
} from "@/lib/types";
import { mutate, query, USE_MOCK } from "@/lib/api";
import { currentUser, workspace } from "@/lib/mock/core";
import {
  accountGroups,
  socialAccounts,
} from "@/lib/mock/accounts";
import {
  notifications as seedNotifications,
  recommendations as seedRecommendations,
} from "@/lib/mock/insights";

let accounts: SocialAccount[] | null = null;
let recs: Recommendation[] | null = null;

function accountStore(): SocialAccount[] {
  accounts ??= structuredClone(socialAccounts);
  return accounts;
}

function recommendationStore(): Recommendation[] {
  recs ??= structuredClone(seedRecommendations);
  return recs;
}

export function getSession() {
  return query<{ user: User; workspace: Workspace } | null>("/auth/session", () => ({
    user: currentUser,
    workspace,
  }));
}

export function getWorkspace() {
  return query<Workspace>(`/workspaces/${workspace.id}`, () => workspace);
}

export function getAccountGroups() {
  return query<AccountGroup[]>("/account-groups", () => structuredClone(accountGroups));
}

export function getIntegrations() {
  return query<SocialAccount[] | ApiAccount[]>(
    `/social/accounts?workspace_id=${encodeURIComponent(workspace.id)}`,
    () => accountStore(),
  ).then((rows) =>
    USE_MOCK ? (rows as SocialAccount[]) : (rows as ApiAccount[]).map(fromApiAccount),
  );
}

/** Shape returned by `GET /social/accounts` on the FastAPI backend. */
interface ApiAccount {
  id: string;
  workspace_id: string;
  group_id: string;
  platform: SocialAccount["platform"];
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  connected: boolean;
  status: string;
  followers: number;
  following: number;
  posts_count: number;
  likes_count: number;
  engagement_rate: number | null;
  external_id: string | null;
  zernio_profile_id: string | null;
  has_analytics_access: boolean;
  needs_reconnection: boolean;
  connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
}

const API_STATUS: Record<string, SocialAccount["status"]> = {
  active: "active",
  private: "error",
  unavailable: "error",
  error: "error",
  needs_reconnection: "error",
  disconnected: "disconnected",
  syncing: "syncing",
};

function fromApiAccount(row: ApiAccount): SocialAccount {
  return {
    id: row.id,
    platform: row.platform,
    groupId: row.group_id,
    accountType: "business",
    handle: row.handle,
    displayName: row.display_name ?? row.handle,
    avatarUrl: row.avatar_url,
    connected: row.connected,
    status: API_STATUS[row.status] ?? "syncing",
    followers: row.followers,
    followersChangePct: 0,
    connectedAt: row.connected_at ?? row.last_sync_at ?? new Date().toISOString(),
    lastSyncAt: row.last_sync_at ?? new Date().toISOString(),
    scopes: row.has_analytics_access
      ? ["read_insights", "read_engagement"]
      : ["read_profile"],
  };
}

/** The real API row carries `workspace_id`; the in-memory fixture does not. */
function coerceAccount(row: SocialAccount | ApiAccount): SocialAccount {
  return "workspace_id" in row ? fromApiAccount(row) : row;
}

/** Provider health, from `GET /social/status`. */
export interface SocialStatus {
  provider: string;
  configured: boolean;
  base_url: string;
  supported_platforms: string[];
  default_profile_id: string | null;
  redirect_url: string;
  requests_per_minute: number;
  rate_state: Record<string, unknown>;
}

const OFFLINE_STATUS: SocialStatus = {
  provider: "zernio",
  configured: false,
  base_url: "https://zernio.com/api/v1",
  supported_platforms: ["instagram", "tiktok", "facebook", "youtube", "twitter"],
  default_profile_id: null,
  redirect_url: "",
  requests_per_minute: 60,
  rate_state: {},
};

export function getSocialStatus() {
  return query<SocialStatus>("/social/status", () => OFFLINE_STATUS);
}

export interface SyncReport {
  api_calls: number;
  accounts_synced: number;
  accounts_failed: number;
  results: Array<Record<string, unknown>>;
}

/** Polls every connected account in the workspace. */
export function syncAllAccounts() {
  return mutate<SyncReport>(
    `/social/sync?workspace_id=${encodeURIComponent(workspace.id)}`,
    () => {
      throw new Error(
        "syncAllAccounts requires the real API. Set NEXT_PUBLIC_USE_MOCK=false and start the backend.",
      );
    },
    { method: "POST" },
  );
}

/** Polls one account. */
export function syncAccountNow(id: string) {
  return mutate<SyncReport>(
    `/social/accounts/${id}/sync`,
    () => {
      throw new Error(
        "syncAccountNow requires the real API. Set NEXT_PUBLIC_USE_MOCK=false and start the backend.",
      );
    },
    { method: "POST" },
  );
}

export interface ConnectResponse {
  platform: SocialAccount["platform"];
  profile_id: string;
  auth_url: string;
  state: string | null;
}

/** Returns the Zernio OAuth URL the browser must open to connect an account. */
export function beginConnect(platform: SocialAccount["platform"]) {
  return query<ConnectResponse>(`/social/connect/${platform}`, () => {
    throw new Error(
      "beginConnect requires the real API. Set NEXT_PUBLIC_USE_MOCK=false and start the backend.",
    );
  });
}

/** Mirrors accounts Zernio now reports as connected into this workspace. */
export function importConnectedAccounts() {
  return mutate<ApiAccount[]>(
    `/social/accounts/import?workspace_id=${encodeURIComponent(workspace.id)}`,
    () => {
      throw new Error(
        "importConnectedAccounts requires the real API. Set NEXT_PUBLIC_USE_MOCK=false and start the backend.",
      );
    },
    { method: "POST" },
  ).then((rows) => rows.map(fromApiAccount));
}

/**
 * Re-enables local tracking of a known account. Re-authorising an account whose
 * Zernio token lapsed goes through `beginConnect`, not this.
 */
export function connectAccount(id: string) {
  return mutate<SocialAccount | ApiAccount>(
    `/social/accounts/${id}`,
    () => {
      const account = accountStore().find((item) => item.id === id);
      if (!account) throw new Error(`Account ${id} not found`);

      const source = socialAccounts.find((item) => item.id === id);

      account.connected = true;
      account.status = "syncing";
      account.followers = source?.followers ?? 0;
      account.followersChangePct = source?.followersChangePct ?? 0;
      account.lastSyncAt = new Date().toISOString();
      account.scopes = source?.scopes ?? ["read_insights", "read_engagement"];

      setTimeout(() => {
        const stored = accountStore().find((item) => item.id === id);
        if (stored) stored.status = "active";
      }, 3000);

      return account;
    },
    { method: "PATCH", body: { connected: true } },
  ).then(coerceAccount);
}

/**
 * Disconnecting keeps the stored snapshots so the history is not destroyed;
 * the account is only re-enabled by syncing it again.
 */
export function disconnectAccount(id: string) {
  return mutate<SocialAccount | ApiAccount>(
    `/social/accounts/${id}`,
    () => {
      const account = accountStore().find((item) => item.id === id);
      if (!account) throw new Error(`Account ${id} not found`);

      account.connected = false;
      account.status = "disconnected";
      account.scopes = [];
      return account;
    },
    { method: "PATCH", body: { connected: false } },
  ).then(coerceAccount);
}

export function getRecommendations() {
  return query<Recommendation[]>("/recommendations", () => recommendationStore());
}

export function setRecommendationStatus(id: string, status: Recommendation["status"]) {
  return mutate<Recommendation>(
    `/recommendations/${id}`,
    () => {
      const recommendation = recommendationStore().find((item) => item.id === id);
      if (!recommendation) throw new Error(`Recommendation ${id} not found`);
      recommendation.status = status;
      return recommendation;
    },
    { method: "PATCH", body: { status } },
  );
}

export function getNotifications() {
  return query<Notification[]>("/notifications", () => structuredClone(seedNotifications));
}

export function getActivity(): ActivityEvent[] {
  return [
    {
      id: "act_1",
      actor: "AI Engine",
      action: "generated insight",
      target: "Timing gap on @northwindstudio (TikTok)",
      createdAt: seedNotifications[0].createdAt,
    },
    {
      id: "act_2",
      actor: "Manuela Duarte",
      action: "paused experiment",
      target: "Caption length: short vs long",
      createdAt: seedNotifications[1].createdAt,
    },
    {
      id: "act_3",
      actor: "Worker",
      action: "synced metrics for",
      target: "7 of 8 connected accounts · 8 accounts in workspace",
      createdAt: seedNotifications[2].createdAt,
    },
    {
      id: "act_4",
      actor: "Worker",
      action: "flagged account for reauthorisation",
      target: "Verde Café MX (YouTube)",
      createdAt: seedNotifications[3].createdAt,
    },
  ];
}
