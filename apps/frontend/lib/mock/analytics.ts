import type {
  AnalyticsPlatformRow,
  DateRangeKey,
  Kpi,
  MetricPoint,
  PlatformBreakdown,
} from "@/lib/types";
import { PLATFORMS, dayKey, mulberry32 } from "./core";

export const RANGE_DAYS: Record<DateRangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function walkForward(
  days: number,
  base: number,
  growthPct: number,
  volatility: number,
  seed: number,
): MetricPoint[] {
  const rand = mulberry32(seed);
  const points: MetricPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const progress = (days - 1 - i) / Math.max(days - 1, 1);
    const trend = base * (1 + (growthPct / 100) * progress);
    const noise = (rand() - 0.5) * 2 * volatility * base;
    const value = Math.max(trend + noise, base * 0.55);

    points.push({
      date: dayKey(i),
      value: Math.round(value),
      previous: Math.round(value / (1 + growthPct / 100)),
    });
  }

  return points;
}

export function followersSeries(range: DateRangeKey): MetricPoint[] {
  const days = RANGE_DAYS[range];
  const base = range === "90d" ? 132000 : range === "30d" ? 141000 : 145500;
  return walkForward(days, base, range === "7d" ? 1.4 : 8.2, 0.035, 1337 + days);
}

export function engagementSeries(range: DateRangeKey): MetricPoint[] {
  const days = RANGE_DAYS[range];
  return walkForward(days, 4.85, range === "90d" ? 21 : 9, 0.11, 8821 + days);
}

export function reachSeries(range: DateRangeKey): MetricPoint[] {
  const days = RANGE_DAYS[range];
  return walkForward(days, 168000, 14.5, 0.16, 5150 + days);
}

export function viewsSeries(range: DateRangeKey): MetricPoint[] {
  const days = RANGE_DAYS[range];
  return walkForward(days, 240000, 19.2, 0.18, 7714 + days);
}

export const TOTAL_FOLLOWERS = 176000;

function sliceTail(points: MetricPoint[], count: number): MetricPoint[] {
  return points.slice(-count);
}

function sumSeries(points: MetricPoint[]): number {
  return points.reduce((total, point) => total + point.value, 0);
}

function changePct(points: MetricPoint[]): number {
  const half = Math.floor(points.length / 2) || 1;
  const first = sumSeries(points.slice(0, half));
  const second = sumSeries(points.slice(half));
  if (first === 0) return 0;
  return ((second - first) / first) * 100;
}

export function buildKpis(range: DateRangeKey): Kpi[] {
  const followers = followersSeries(range);
  const engagement = engagementSeries(range);
  const reach = reachSeries(range);
  const views = viewsSeries(range);
  const days = RANGE_DAYS[range];

  const current = (points: MetricPoint[]) => points[points.length - 1].value;
  const prior = (points: MetricPoint[]) => points[points.length - 2]?.value ?? 0;

  const delta = (points: MetricPoint[]) => {
    const now = current(points);
    const before = prior(points);
    return before === 0 ? 0 : ((now - before) / before) * 100;
  };

  const followersGained = Math.round(
    followers[followers.length - 1].value - followers[0].previous,
  );

  return [
    {
      key: "followers",
      label: "Total followers",
      value: TOTAL_FOLLOWERS,
      previousValue: TOTAL_FOLLOWERS - followersGained,
      changePct: delta(followers),
      format: "compact",
      sparkline: sliceTail(followers, 14).map((p) => p.value),
      platform: "all",
    },
    {
      key: "reach",
      label: `Reach (${days}d)`,
      value: sumSeries(reach),
      previousValue: sumSeries(reach.map((p) => ({ ...p, value: p.previous }))),
      changePct: changePct(reach),
      format: "compact",
      sparkline: sliceTail(reach, 14).map((p) => p.value),
      platform: "all",
    },
    {
      key: "views",
      label: `Video views (${days}d)`,
      value: sumSeries(views),
      previousValue: sumSeries(views.map((p) => ({ ...p, value: p.previous }))),
      changePct: changePct(views),
      format: "compact",
      sparkline: sliceTail(views, 14).map((p) => p.value),
      platform: "all",
    },
    {
      key: "engagement",
      label: "Engagement rate",
      value: current(engagement) / 10,
      previousValue: prior(engagement) / 10,
      changePct: delta(engagement),
      format: "percent",
      sparkline: sliceTail(engagement, 14).map((p) => p.value),
      platform: "all",
    },
  ];
}

const PLATFORM_SEEDS: Record<
  string,
  {
    followers: number;
    reach: number;
    impressions: number;
    rate: number;
    change: number;
  }
> = {
  instagram: {
    followers: 48200,
    reach: 268000,
    impressions: 412000,
    rate: 5.42,
    change: 6.1,
  },
  tiktok: {
    followers: 91400,
    reach: 512000,
    impressions: 986000,
    rate: 7.86,
    change: 14.8,
  },
  youtube: {
    followers: 23800,
    reach: 184000,
    impressions: 261000,
    rate: 4.21,
    change: 9.4,
  },
  twitter: {
    followers: 12600,
    reach: 74000,
    impressions: 118000,
    rate: 3.18,
    change: -2.7,
  },
  facebook: {
    followers: 0,
    reach: 0,
    impressions: 0,
    rate: 0,
    change: 0,
  },
};

function scaleForRange(range: DateRangeKey) {
  if (range === "7d") return 0.24;
  if (range === "90d") return 2.7;
  return 1;
}

export function analyticsPlatforms(range: DateRangeKey): AnalyticsPlatformRow[] {
  const scale = scaleForRange(range);
  const seeded = PLATFORMS.map((platform) => ({
    platform,
    ...PLATFORM_SEEDS[platform],
  }));
  const total = seeded.reduce((sum, item) => sum + item.reach, 0);

  return seeded.map((item) => ({
    platform: item.platform,
    followers: item.followers,
    followersChangePct: item.change,
    reach: Math.round(item.reach * scale),
    impressions: Math.round(item.impressions * scale),
    engagementRate: item.rate,
    sharePct: total === 0 ? 0 : Math.round((item.reach / total) * 1000) / 10,
  }));
}

export function reachByPlatform(): PlatformBreakdown[] {
  const seeded = PLATFORMS.map((platform) => ({
    platform,
    ...PLATFORM_SEEDS[platform],
  }));
  const total = seeded.reduce((sum, item) => sum + item.reach, 0);

  return seeded.map((item) => ({
    platform: item.platform,
    followers: item.followers,
    followersChangePct: item.change,
    reach: item.reach,
    engagementRate: item.rate,
    sharePct: total === 0 ? 0 : Math.round((item.reach / total) * 1000) / 10,
  }));
}
