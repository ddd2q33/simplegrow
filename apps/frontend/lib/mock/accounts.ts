import type {
  AccountBreakdown,
  AccountGroup,
  AccountGroupId,
  AccountId,
  DataScope,
  SocialAccount,
} from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import { PLATFORMS, daysAgo } from "./core";

export const accountGroups: AccountGroup[] = [
  {
    id: "grp_brand",
    name: "Northwind Studio",
    description: "Main brand accounts",
    color: "var(--chart-1)",
  },
  {
    id: "grp_latam",
    name: "Northwind LatAm",
    description: "Regional Spanish-language accounts",
    color: "var(--chart-2)",
  },
  {
    id: "grp_client",
    name: "Client · Verde Café",
    description: "Managed client accounts",
    color: "var(--chart-3)",
  },
];

export const socialAccounts: SocialAccount[] = [
  // ── Northwind Studio ───────────────────────────────────────────────
  {
    id: "acc_ig_main",
    platform: "instagram",
    groupId: "grp_brand",
    accountType: "business",
    handle: "@northwind.studio",
    displayName: "Northwind Studio",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 48200,
    followersChangePct: 6.1,
    connectedAt: "2025-11-05T12:00:00.000Z",
    lastSyncAt: daysAgo(0, -2),
    scopes: ["read_insights", "read_engagement", "publish_content"],
  },
  {
    id: "acc_tt_main",
    platform: "tiktok",
    groupId: "grp_brand",
    accountType: "business",
    handle: "@northwindstudio",
    displayName: "Northwind Studio",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 91400,
    followersChangePct: 14.8,
    connectedAt: "2025-12-18T09:14:00.000Z",
    lastSyncAt: daysAgo(0, -2),
    scopes: ["read_insights", "read_engagement"],
  },
  {
    id: "acc_yt_main",
    platform: "youtube",
    groupId: "grp_brand",
    accountType: "channel",
    handle: "@northwindstudio",
    displayName: "Northwind Studio",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 23800,
    followersChangePct: 9.4,
    connectedAt: "2026-01-09T15:40:00.000Z",
    lastSyncAt: daysAgo(1, 1),
    scopes: ["read_insights", "read_analytics"],
  },

  // ── Northwind LatAm ────────────────────────────────────────────────
  {
    id: "acc_ig_latam",
    platform: "instagram",
    groupId: "grp_latam",
    accountType: "creator",
    handle: "@northwind.latam",
    displayName: "Northwind LatAm",
    avatarUrl: null,
    connected: true,
    status: "syncing",
    followers: 12400,
    followersChangePct: 18.2,
    connectedAt: "2026-02-14T10:30:00.000Z",
    lastSyncAt: daysAgo(0, -1),
    scopes: ["read_insights", "read_engagement"],
  },
  {
    id: "acc_tt_latam",
    platform: "tiktok",
    groupId: "grp_latam",
    accountType: "creator",
    handle: "@northwindlatam",
    displayName: "Northwind LatAm",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 38900,
    followersChangePct: 22.6,
    connectedAt: "2026-02-14T10:34:00.000Z",
    lastSyncAt: daysAgo(0, -2),
    scopes: ["read_insights", "read_engagement"],
  },
  {
    id: "acc_x_hq",
    platform: "twitter",
    groupId: "grp_latam",
    accountType: "business",
    handle: "@northwindhq",
    displayName: "Northwind HQ",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 12600,
    followersChangePct: -2.7,
    connectedAt: "2026-03-22T11:05:00.000Z",
    lastSyncAt: daysAgo(1, -1),
    scopes: ["read_insights", "publish_content"],
  },

  // ── Client · Verde Café ────────────────────────────────────────────
  {
    id: "acc_ig_verde",
    platform: "instagram",
    groupId: "grp_client",
    accountType: "business",
    handle: "@verdecafe.mx",
    displayName: "Verde Café MX",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 8600,
    followersChangePct: 4.4,
    connectedAt: "2026-04-02T08:00:00.000Z",
    lastSyncAt: daysAgo(0, -3),
    scopes: ["read_insights", "read_engagement", "publish_content"],
  },
  {
    id: "acc_fb_verde",
    platform: "facebook",
    groupId: "grp_client",
    accountType: "page",
    handle: "VerdeCafeMX",
    displayName: "Verde Café MX",
    avatarUrl: null,
    connected: false,
    status: "disconnected",
    followers: 0,
    followersChangePct: 0,
    connectedAt: "2026-04-02T08:05:00.000Z",
    lastSyncAt: daysAgo(46),
    scopes: [],
  },
  {
    id: "acc_yt_verde",
    platform: "youtube",
    groupId: "grp_client",
    accountType: "channel",
    handle: "@verdecafemx",
    displayName: "Verde Café MX",
    avatarUrl: null,
    connected: true,
    status: "error",
    followers: 3100,
    followersChangePct: 0.9,
    connectedAt: "2026-04-05T16:20:00.000Z",
    lastSyncAt: daysAgo(3),
    scopes: ["read_insights"],
  },
];

export const accountsById = new Map<AccountId, SocialAccount>(
  socialAccounts.map((account) => [account.id, account]),
);

export function getAccount(id: AccountId): SocialAccount | null {
  return accountsById.get(id) ?? null;
}

export function getGroup(id: AccountGroupId): AccountGroup | null {
  return accountGroups.find((group) => group.id === id) ?? null;
}

/** Accounts contributing to a scope. Disconnected accounts never contribute. */
export function accountsInScope(scope: DataScope): SocialAccount[] {
  return socialAccounts.filter((account) => {
    if (!account.connected) return false;
    if (scope.accountId !== ALL_ACCOUNTS && account.id !== scope.accountId) {
      return false;
    }
    if (scope.platform !== "all" && account.platform !== scope.platform) {
      return false;
    }
    return true;
  });
}

export function scopeLabel(scope: DataScope): string {
  if (scope.accountId !== ALL_ACCOUNTS) {
    return accountsById.get(scope.accountId)?.displayName ?? "Unknown account";
  }
  if (scope.platform !== "all") return `All ${scope.platform} accounts`;
  return "All accounts";
}

/**
 * Per-account generation parameters. Analytics derives every series from these
 * so that any scope is a genuine aggregation of its member accounts.
 */
export interface AccountSeed {
  reachBase: number;
  viewsBase: number;
  engagementBase: number;
  growthPct: number;
  volatility: number;
}

export const ACCOUNT_SEEDS: Record<AccountId, AccountSeed> = {
  acc_ig_main: { reachBase: 98000, viewsBase: 64000, engagementBase: 5.42, growthPct: 8.2, volatility: 0.15 },
  acc_tt_main: { reachBase: 212000, viewsBase: 168000, engagementBase: 7.86, growthPct: 16.4, volatility: 0.19 },
  acc_yt_main: { reachBase: 71000, viewsBase: 128000, engagementBase: 4.21, growthPct: 11.1, volatility: 0.14 },
  acc_ig_latam: { reachBase: 31000, viewsBase: 19000, engagementBase: 6.08, growthPct: 19.7, volatility: 0.21 },
  acc_tt_latam: { reachBase: 88000, viewsBase: 74000, engagementBase: 8.42, growthPct: 24.3, volatility: 0.23 },
  acc_x_hq: { reachBase: 27000, viewsBase: 9000, engagementBase: 3.18, growthPct: -2.4, volatility: 0.17 },
  acc_ig_verde: { reachBase: 22000, viewsBase: 12000, engagementBase: 6.91, growthPct: 6.8, volatility: 0.13 },
  acc_fb_verde: { reachBase: 0, viewsBase: 0, engagementBase: 0, growthPct: 0, volatility: 0 },
  acc_yt_verde: { reachBase: 14000, viewsBase: 21000, engagementBase: 3.74, growthPct: 4.2, volatility: 0.16 },
};

/** Accounts offered in the switcher, grouped for display. */
export interface AccountSwitcherGroup {
  group: AccountGroup;
  accounts: SocialAccount[];
}

export function groupAccounts(
  accounts: SocialAccount[] = socialAccounts,
): AccountSwitcherGroup[] {
  return accountGroups
    .map((group) => ({
      group,
      accounts: accounts.filter((account) => account.groupId === group.id),
    }))
    .filter((entry) => entry.accounts.length > 0);
}

export function accountsByPlatform(
  accounts: SocialAccount[],
): { platform: string; accounts: SocialAccount[] }[] {
  return PLATFORMS.map((platform) => ({
    platform,
    accounts: accounts.filter((account) => account.platform === platform),
  })).filter((entry) => entry.accounts.length > 0);
}

export function shareOfTotal(
  value: number,
  totals: number[],
): number {
  const total = totals.reduce((sum, item) => sum + item, 0);
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export type { AccountBreakdown };
