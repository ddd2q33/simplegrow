import type { Platform, User, Workspace } from "@/lib/types";

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
    FIXTURE_NOW - days * 86400_000 + hourOffset * 3600_000,
  ).toISOString();
}

export function dayKey(daysBack: number): string {
  return daysAgo(daysBack).slice(0, 10);
}

export const PLATFORM_META: Record<
  Platform,
  { label: string; short: string; brand: string; text: string }
> = {
  instagram: { label: "Instagram", short: "IG", brand: "#E1306C", text: "#FFFFFF" },
  tiktok: { label: "TikTok", short: "TT", brand: "#111111", text: "#25F4EE" },
  youtube: { label: "YouTube", short: "YT", brand: "#FF0000", text: "#FFFFFF" },
  twitter: { label: "X / Twitter", short: "X", brand: "#1D9BF0", text: "#FFFFFF" },
  facebook: { label: "Facebook", short: "FB", brand: "#1877F2", text: "#FFFFFF" },
};

export const PLATFORMS: Platform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "facebook",
];

export const workspace: Workspace = {
  // Matches the backend's default workspace id so the live `/social/*` calls
  // (accounts, sync, publishing) land on the same rows the API persists.
  id: "default",
  name: "Northwind Studio",
  slug: "northwind-studio",
  plan: "growth",
  timezone: "America/Mexico_City",
  accountLimit: 20,
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
