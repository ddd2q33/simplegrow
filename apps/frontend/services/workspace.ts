import type {
  ActivityEvent,
  Notification,
  Recommendation,
  SocialAccount,
  User,
  Workspace,
} from "@/lib/types";
import { mutate, query } from "@/lib/api";
import { currentUser, socialAccounts, workspace } from "@/lib/mock/core";
import { notifications as seedNotifications, recommendations as seedRecommendations } from "@/lib/mock/insights";

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

export function getIntegrations() {
  return query<SocialAccount[]>("/social/accounts", () => accountStore());
}

export function connectAccount(id: string) {
  return mutate<SocialAccount>(
    `/social/accounts/${id}/connect`,
    () => {
      const account = accountStore().find((item) => item.id === id);
      if (!account) throw new Error(`Account ${id} not found`);

      account.connected = true;
      account.status = "syncing";
      account.followers = 19400;
      account.lastSyncAt = new Date().toISOString();
      account.scopes = ["read_insights", "read_engagement"];

      setTimeout(() => {
        const stored = accountStore().find((item) => item.id === id);
        if (stored) stored.status = "active";
      }, 3000);

      return account;
    },
    { method: "POST" },
  );
}

export function disconnectAccount(id: string) {
  return mutate<SocialAccount>(
    `/social/accounts/${id}/disconnect`,
    () => {
      const account = accountStore().find((item) => item.id === id);
      if (!account) throw new Error(`Account ${id} not found`);

      account.connected = false;
      account.status = "disconnected";
      account.scopes = [];
      return account;
    },
    { method: "POST" },
  );
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
      target: "Timing gap on Instagram",
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
      target: "TikTok · 91.4K followers",
      createdAt: seedNotifications[2].createdAt,
    },
  ];
}
