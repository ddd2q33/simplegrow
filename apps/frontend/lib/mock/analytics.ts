import type {
  AccountBreakdown,
  AccountId,
  DataScope,
  DateRangeKey,
  Kpi,
  MetricPoint,
  PlatformBreakdown,
  SocialAccount,
} from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import { ACCOUNT_SEEDS, accountsInScope, socialAccounts } from "./accounts";
import { PLATFORMS, dayKey, mulberry32 } from "./core";

export const RANGE_DAYS: Record<DateRangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function walkForward(
  accountId: AccountId,
  days: number,
  base: number,
  growthPct: number,
  volatility: number,
): MetricPoint[] {
  const rand = mulberry32(hash(accountId) + days);
  const points: MetricPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const progress = (days - 1 - i) / Math.max(days - 1, 1);
    const trend = base * (1 + (growthPct / 100) * progress);
    const noise = (rand() - 0.5) * 2 * volatility * base;
    const value = base === 0 ? 0 : Math.max(trend + noise, base * 0.55);

    points.push({
      date: dayKey(i),
      value: Math.round(value),
      previous: Math.round(base === 0 ? 0 : value / (1 + growthPct / 100)),
    });
  }

  return points;
}

function hash(input: string): number {
  let value = 0;
  for (let i = 0; i < input.length; i += 1) {
    value = (value * 31 + input.charCodeAt(i)) % 1_000_003;
  }
  return value;
}

function seedOf(account: SocialAccount) {
  return (
    ACCOUNT_SEEDS[account.id] ?? {
      reachBase: 0,
      viewsBase: 0,
      engagementBase: 0,
      growthPct: 0,
      volatility: 0.1,
    }
  );
}

export function reachSeriesFor(
  account: SocialAccount,
  range: DateRangeKey,
): MetricPoint[] {
  const seed = seedOf(account);
  return walkForward(
    account.id,
    RANGE_DAYS[range],
    seed.reachBase,
    seed.growthPct,
    seed.volatility,
  );
}

export function viewsSeriesFor(
  account: SocialAccount,
  range: DateRangeKey,
): MetricPoint[] {
  const seed = seedOf(account);
  return walkForward(
    `${account.id}-v`,
    RANGE_DAYS[range],
    seed.viewsBase,
    seed.growthPct * 1.2,
    seed.volatility,
  );
}

export function impressionsSeriesFor(
  account: SocialAccount,
  range: DateRangeKey,
): MetricPoint[] {
  const seed = seedOf(account);
  return walkForward(
    `${account.id}-i`,
    RANGE_DAYS[range],
    seed.reachBase * 1.32,
    seed.growthPct * 0.9,
    seed.volatility * 0.8,
  );
}

export function engagementSeriesFor(
  account: SocialAccount,
  range: DateRangeKey,
): MetricPoint[] {
  const seed = seedOf(account);
  return walkForward(
    `${account.id}-e`,
    RANGE_DAYS[range],
    seed.engagementBase * 10,
    seed.growthPct * 0.35,
    seed.volatility * 0.7,
  );
}

/** Net followers gained per day. */
export function followersSeriesFor(
  account: SocialAccount,
  range: DateRangeKey,
): MetricPoint[] {
  const days = RANGE_DAYS[range];
  const seed = seedOf(account);
  const daily = (seed.reachBase / 1000) * 0.6;
  return walkForward(
    `${account.id}-f`,
    days,
    daily,
    seed.growthPct,
    0.35,
  );
}

export function sumSeries(lists: MetricPoint[][]): MetricPoint[] {
  if (lists.length === 0) return [];
  const length = lists[0].length;

  return Array.from({ length }, (_, index) => ({
    date: lists[0][index].date,
    value: lists.reduce((sum, list) => sum + list[index].value, 0),
    previous: lists.reduce((sum, list) => sum + list[index].previous, 0),
  }));
}

function sumOf(points: MetricPoint[], key: "value" | "previous"): number {
  return points.reduce((total, point) => total + point[key], 0);
}

function periodChangePct(points: MetricPoint[]): number {
  const half = Math.floor(points.length / 2) || 1;
  const first = sumOf(points.slice(0, half), "value");
  const second = sumOf(points.slice(half), "value");
  return first === 0 ? 0 : ((second - first) / first) * 100;
}

export interface ScopeSeries {
  accounts: SocialAccount[];
  followers: MetricPoint[];
  reach: MetricPoint[];
  views: MetricPoint[];
  impressions: MetricPoint[];
  engagement: MetricPoint[];
}

export function buildScopeSeries(scope: DataScope): ScopeSeries {
  const accounts = accountsInScope(scope);

  const reach = sumSeries(accounts.map((a) => reachSeriesFor(a, scope.range)));
  const views = sumSeries(accounts.map((a) => viewsSeriesFor(a, scope.range)));
  const impressions = sumSeries(
    accounts.map((a) => impressionsSeriesFor(a, scope.range)),
  );
  const followers = sumSeries(
    accounts.map((a) => followersSeriesFor(a, scope.range)),
  );

  // Engagement is a rate, so aggregate it impression-weighted: each account
  // contributes its own rate scaled by its own impressions for that day.
  const rates = accounts.map((a) => engagementSeriesFor(a, scope.range));
  const weights = accounts.map((a) => impressionsSeriesFor(a, scope.range));

  const weightedRate = (index: number, key: "value" | "previous") => {
    let numerator = 0;
    let denominator = 0;
    rates.forEach((list, accountIndex) => {
      const weight = weights[accountIndex][index]?.[key] ?? 0;
      numerator += (list[index]?.[key] ?? 0) * weight;
      denominator += weight;
    });
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const engagement: MetricPoint[] = reach.map((point, index) => ({
    date: point.date,
    value: Math.round(weightedRate(index, "value") * 10) / 10,
    previous: Math.round(weightedRate(index, "previous") * 10) / 10,
  }));

  return { accounts, followers, reach, views, impressions, engagement };
}

export function buildKpis(scope: DataScope, series: ScopeSeries): Kpi[] {
  const days = RANGE_DAYS[scope.range];
  const totalFollowers = series.accounts.reduce(
    (sum, account) => sum + account.followers,
    0,
  );

  const followersGained = series.followers.reduce(
    (sum, point) => sum + point.value,
    0,
  );

  const reachNow = sumOf(series.reach, "value");
  const reachBefore = sumOf(series.reach, "previous");
  const viewsNow = sumOf(series.views, "value");
  const viewsBefore = sumOf(series.views, "previous");

  const engagementNow = series.engagement[series.engagement.length - 1]?.value ?? 0;
  const engagementBefore =
    series.engagement[series.engagement.length - 2]?.value ?? 0;

  const pct = (now: number, before: number) =>
    before === 0 ? 0 : ((now - before) / before) * 100;

  return [
    {
      key: "followers",
      label: "Total followers",
      value: totalFollowers,
      previousValue: Math.max(totalFollowers - followersGained, 0),
      changePct: pct(
        series.followers[series.followers.length - 1]?.value ?? 0,
        series.followers[series.followers.length - 2]?.value ?? 0,
      ),
      format: "compact",
      sparkline: series.followers.slice(-14).map((p) => p.value),
      platform: "all",
    },
    {
      key: "reach",
      label: `Reach (${days}d)`,
      value: reachNow,
      previousValue: reachBefore,
      changePct: periodChangePct(series.reach),
      format: "compact",
      sparkline: series.reach.slice(-14).map((p) => p.value),
      platform: "all",
    },
    {
      key: "views",
      label: `Video views (${days}d)`,
      value: viewsNow,
      previousValue: viewsBefore,
      changePct: periodChangePct(series.views),
      format: "compact",
      sparkline: series.views.slice(-14).map((p) => p.value),
      platform: "all",
    },
    {
      key: "engagement",
      label: "Engagement rate",
      value: engagementNow / 10,
      previousValue: engagementBefore / 10,
      changePct: pct(engagementNow, engagementBefore),
      format: "percent",
      sparkline: series.engagement.slice(-14).map((p) => p.value),
      platform: "all",
    },
  ];
}

export function platformBreakdown(scope: DataScope): PlatformBreakdown[] {
  const rows = PLATFORMS.map((platform) => {
    const accounts = accountsInScope(scope).filter(
      (account) => account.platform === platform,
    );

    const reach = sumSeries(
      accounts.map((account) => reachSeriesFor(account, scope.range)),
    ).reduce((sum, point) => sum + point.value, 0);

    const impressions = sumSeries(
      accounts.map((account) => impressionsSeriesFor(account, scope.range)),
    ).reduce((sum, point) => sum + point.value, 0);

    const engagement = buildScopeSeries({ ...scope, platform }).engagement;
    const rate = engagement[engagement.length - 1]?.value ?? 0;

    const followers = accounts.reduce((sum, account) => sum + account.followers, 0);
    const weightedChange =
      followers === 0
        ? 0
        : accounts.reduce(
            (sum, account) => sum + account.followersChangePct * account.followers,
            0,
          ) / followers;

    return {
      platform,
      accountCount: accounts.length,
      followers,
      followersChangePct: Math.round(weightedChange * 100) / 100,
      reach,
      engagementRate: Math.round((rate / 10) * 100) / 100,
      impressions,
      sharePct: 0,
    };
  }).filter((row) => row.accountCount > 0);

  const totalReach = rows.reduce((sum, row) => sum + row.reach, 0);
  return rows.map((row) => ({
    ...row,
    sharePct: totalReach === 0 ? 0 : Math.round((row.reach / totalReach) * 1000) / 10,
  }));
}

export function accountBreakdown(scope: DataScope): AccountBreakdown[] {
  const accounts = accountsInScope(scope);
  const reachTotals = accounts.map(
    (account) =>
      sumSeries([reachSeriesFor(account, scope.range)]).reduce(
        (sum, point) => sum + point.value,
        0,
      ),
  );
  const totalReach = reachTotals.reduce((sum, value) => sum + value, 0);

  return accounts.map((account, index) => {
    const views = sumSeries([viewsSeriesFor(account, scope.range)]).reduce(
      (sum, point) => sum + point.value,
      0,
    );
    const impressions = sumSeries([
      impressionsSeriesFor(account, scope.range),
    ]).reduce((sum, point) => sum + point.value, 0);

    const engagement = engagementSeriesFor(account, scope.range);
    const rate = engagement[engagement.length - 1]?.value ?? 0;
    const reach = reachTotals[index];

    return {
      accountId: account.id,
      platform: account.platform,
      handle: account.handle,
      displayName: account.displayName,
      followers: account.followers,
      followersChangePct: account.followersChangePct,
      reach,
      views,
      impressions,
      engagementRate: Math.round((rate / 10) * 100) / 100,
      sharePct: totalReach === 0 ? 0 : Math.round((reach / totalReach) * 1000) / 10,
    };
  });
}

export function connectedAccountCount(scope: DataScope): number {
  if (scope.accountId !== ALL_ACCOUNTS) return 1;
  return accountsInScope(scope).length;
}

export function totalFollowersFor(accounts: SocialAccount[]): number {
  return accounts.reduce((sum, account) => sum + account.followers, 0);
}

export const ALL_ACCOUNTS_REF = ALL_ACCOUNTS;
export const ALL_SOCIAL_ACCOUNTS = socialAccounts;
