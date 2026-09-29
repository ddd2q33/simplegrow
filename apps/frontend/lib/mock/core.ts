import type { Platform, SocialAccount, User, Workspace } from "@/lib/types";

/**
 * Deterministic clock. Every fixture timestamp derives from this value so
 * server-rendered markup and client hydration always agree.
 */
export const FIXTURE_NOW = new Date("2026-09-29T09:00:00.000Z").getTime();

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function daysAgo(days: number, hourOffset = 0): string {
  return new Date(
    FIXTURE_NOW - days * 86400000 + hourOffset * 3600000,
  ).toISOString();
}

export function dayKey(daysBack: number): string {
  return daysAgo(daysBack).slice(0, 10);
}

export const PLATFORM_META: Record<
  Platform,
  { label: string; brand: string; text: string }
> = {
  instagram: { label: "Instagram", brand: "#E1306C", text: "#FFFFFF" },
  tiktok: { label: "TikTok", brand: "#111111", text: "#25F4EE" },
  youtube: { label: "YouTube", brand: "#FF0000", text: "#FFFFFF" },
  twitter: { label: "X / Twitter", brand: "#1D9BF0", text: "#FFFFFF" },
  facebook: { label: "Facebook", brand: "#1877F2", text: "#FFFFFF" },
};

export const PLATFORMS: Platform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "facebook",
];

export const workspace: Workspace = {
  id: "ws_northwind",
  name: "Northwind Studio",
  slug: "northwind-studio",
  plan: "growth",
  timezone: "America/Mexico_City",
  createdAt: "2025-11-04T18:20:00.000Z",
};

export const currentUser: User = {
  id: "usr_001",
  email: "manuela@northwind.studio",
  fullName: "Manuela Duarte",
  initials: "MD",
  role: "owner",
  avatarUrl: null,
  workspaceId: workspace.id,
  createdAt: "2025-11-04T18:22:00.000Z",
};

export const socialAccounts: SocialAccount[] = [
  {
    id: "acc_ig",
    platform: "instagram",
    handle: "@northwind.studio",
    displayName: "Northwind Studio",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 48200,
    connectedAt: "2025-11-05T12:00:00.000Z",
    lastSyncAt: daysAgo(0, -2),
    scopes: ["read_insights", "read_engagement", "publish_content"],
  },
  {
    id: "acc_tt",
    platform: "tiktok",
    handle: "@northwindstudio",
    displayName: "Northwind Studio",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 91400,
    connectedAt: "2025-12-18T09:14:00.000Z",
    lastSyncAt: daysAgo(0, -2),
    scopes: ["read_insights", "read_engagement"],
  },
  {
    id: "acc_yt",
    platform: "youtube",
    handle: "@northwindstudio",
    displayName: "Northwind Studio",
    avatarUrl: null,
    connected: true,
    status: "active",
    followers: 23800,
    connectedAt: "2026-01-09T15:40:00.000Z",
    lastSyncAt: daysAgo(1, 1),
    scopes: ["read_insights", "read_analytics"],
  },
  {
    id: "acc_x",
    platform: "twitter",
    handle: "@northwindhq",
    displayName: "Northwind HQ",
    avatarUrl: null,
    connected: true,
    status: "syncing",
    followers: 12600,
    connectedAt: "2026-03-22T11:05:00.000Z",
    lastSyncAt: daysAgo(0, -1),
    scopes: ["read_insights", "publish_content"],
  },
  {
    id: "acc_fb",
    platform: "facebook",
    handle: "northwindstudio",
    displayName: "Northwind Studio",
    avatarUrl: null,
    connected: false,
    status: "disconnected",
    followers: 0,
    connectedAt: "2026-04-02T08:00:00.000Z",
    lastSyncAt: daysAgo(46),
    scopes: [],
  },
];
