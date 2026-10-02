import type {
  AudienceActivityWindow,
  AudienceOverview,
  AudienceSegment,
  DataScope,
  Platform,
} from "@/lib/types";
import { accountsInScope } from "./accounts";
import { buildScopeSeries } from "./analytics";
import { dayKey, mulberry32 } from "./core";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface AudienceProfile {
  medianAge: number;
  gender: [number, number, number];
  /** Share of followers per country code, in display order. */
  countries: { code: string; country: string; sharePct: number }[];
  /** Share per segment id, in SEGMENT_ORDER order. */
  segmentMix: [number, number, number, number];
  /** Hour offset applied to the activity peak. */
  peakShift: number;
  /** Base engagement rate used for segment engagement. */
  engagementBase: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  MX: "Mexico",
  US: "United States",
  ES: "Spain",
  CO: "Colombia",
  AR: "Argentina",
  CL: "Chile",
  BR: "Brazil",
  PE: "Peru",
  GB: "United Kingdom",
};

const PROFILES: Record<Platform, AudienceProfile> = {
  instagram: {
    medianAge: 29,
    gender: [58, 39, 3],
    countries: [
      { code: "MX", country: COUNTRY_NAMES.MX, sharePct: 28.4 },
      { code: "US", country: COUNTRY_NAMES.US, sharePct: 22.1 },
      { code: "ES", country: COUNTRY_NAMES.ES, sharePct: 11.7 },
      { code: "CO", country: COUNTRY_NAMES.CO, sharePct: 8.3 },
      { code: "AR", country: COUNTRY_NAMES.AR, sharePct: 6.9 },
      { code: "CL", country: COUNTRY_NAMES.CL, sharePct: 4.2 },
    ],
    segmentMix: [23.4, 38.9, 24.5, 13.2],
    peakShift: 1,
    engagementBase: 5.42,
  },
  tiktok: {
    medianAge: 24,
    gender: [61, 36, 3],
    countries: [
      { code: "MX", country: COUNTRY_NAMES.MX, sharePct: 31.2 },
      { code: "BR", country: COUNTRY_NAMES.BR, sharePct: 14.6 },
      { code: "US", country: COUNTRY_NAMES.US, sharePct: 18.3 },
      { code: "ES", country: COUNTRY_NAMES.ES, sharePct: 7.4 },
      { code: "CO", country: COUNTRY_NAMES.CO, sharePct: 7.1 },
      { code: "AR", country: COUNTRY_NAMES.AR, sharePct: 5.8 },
    ],
    segmentMix: [17.8, 34.2, 29.6, 18.4],
    peakShift: 3,
    engagementBase: 7.86,
  },
  youtube: {
    medianAge: 34,
    gender: [41, 55, 4],
    countries: [
      { code: "US", country: COUNTRY_NAMES.US, sharePct: 34.1 },
      { code: "GB", country: COUNTRY_NAMES.GB, sharePct: 9.2 },
      { code: "MX", country: COUNTRY_NAMES.MX, sharePct: 18.7 },
      { code: "ES", country: COUNTRY_NAMES.ES, sharePct: 8.4 },
      { code: "DE", country: "Germany", sharePct: 6.1 },
      { code: "CA", country: "Canada", sharePct: 5.2 },
    ],
    segmentMix: [31.2, 41.6, 18.4, 8.8],
    peakShift: -2,
    engagementBase: 4.21,
  },
  twitter: {
    medianAge: 33,
    gender: [43, 53, 4],
    countries: [
      { code: "US", country: COUNTRY_NAMES.US, sharePct: 41.3 },
      { code: "GB", country: COUNTRY_NAMES.GB, sharePct: 12.7 },
      { code: "MX", country: COUNTRY_NAMES.MX, sharePct: 9.8 },
      { code: "ES", country: COUNTRY_NAMES.ES, sharePct: 6.1 },
      { code: "CA", country: "Canada", sharePct: 4.9 },
      { code: "DE", country: "Germany", sharePct: 4.2 },
    ],
    segmentMix: [28.6, 37.2, 22.1, 12.1],
    peakShift: 0,
    engagementBase: 3.18,
  },
  facebook: {
    medianAge: 41,
    gender: [49, 48, 3],
    countries: [
      { code: "MX", country: COUNTRY_NAMES.MX, sharePct: 46.8 },
      { code: "US", country: COUNTRY_NAMES.US, sharePct: 21.4 },
      { code: "PE", country: COUNTRY_NAMES.PE, sharePct: 6.2 },
      { code: "CO", country: COUNTRY_NAMES.CO, sharePct: 5.4 },
      { code: "ES", country: COUNTRY_NAMES.ES, sharePct: 4.8 },
      { code: "CL", country: COUNTRY_NAMES.CL, sharePct: 3.6 },
    ],
    segmentMix: [34.8, 39.4, 15.2, 10.6],
    peakShift: -3,
    engagementBase: 2.6,
  },
};

const SEGMENT_BLUEPRINT = [
  { id: "seg_dedicated", name: "Dedicated followers", description: "Engaged 3+ times in the last 30 days", growthPct: 11.8, engagementLift: 1.74, ageLift: -2 },
  { id: "seg_regulars", name: "Regulars", description: "Engaged once or twice per month", growthPct: 6.4, engagementLift: 0.96, ageLift: 2 },
  { id: "seg_casual", name: "Casual viewers", description: "Engaged in the last 90 days only", growthPct: 1.9, engagementLift: 0.51, ageLift: 5 },
  { id: "seg_lapsed", name: "Lapsed", description: "No engagement in 90+ days", growthPct: -4.3, engagementLift: 0.11, ageLift: 0 },
];

const GENDER_LABELS = ["Women", "Men", "Non-binary / undisclosed"];

/** Activity peaks shift by platform and intensity scales with account count. */
function activityHeatmap(
  peakShift: number,
  intensity: number,
  seed: number,
): AudienceActivityWindow[] {
  const rand = mulberry32(seed);
  const cells: AudienceActivityWindow[] = [];
  const peak = 20 + peakShift;

  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const eveningPeak = Math.exp(-((hour - peak) ** 2) / 14);
      const lunchPeak = Math.exp(-((hour - (13 + peakShift)) ** 2) / 8);
      const weekendMorning = day >= 5 ? Math.exp(-((hour - 10) ** 2) / 16) : 0;
      const weekdayPenalty = day < 5 ? 1 : 0.82;
      const base =
        18 + (eveningPeak * 62 + lunchPeak * 26 + weekendMorning * 44) * weekdayPenalty;

      cells.push({
        day: DAY_LABELS[day],
        hour,
        value: Math.round(base * intensity * (0.88 + rand() * 0.24)),
      });
    }
  }

  return cells;
}

export function buildAudienceOverview(scope: DataScope): AudienceOverview {
  const accounts = accountsInScope(scope);
  const series = buildScopeSeries(scope);

  const totalFollowers = accounts.reduce(
    (sum, account) => sum + account.followers,
    0,
  );

  const growth = series.followers;
  const netFollowers = growth.reduce((sum, point) => sum + point.value, 0);
  const unfollows = Math.round(netFollowers * 0.21);
  const newFollowers = netFollowers + unfollows;

  // Follower-weighted platform mix for every audience dimension.
  const activeWeight = totalFollowers || 1;

  const medianAge = Math.round(
    accounts.reduce(
      (sum, account) => sum + PROFILES[account.platform].medianAge * account.followers,
      0,
    ) / activeWeight,
  );

  const genderSplit = GENDER_LABELS.map((label, index) => ({
    label,
    pct: Math.round(
      accounts.reduce(
        (sum, account) =>
          sum + PROFILES[account.platform].gender[index] * account.followers,
        0,
      ) / activeWeight,
    ),
  }));

  // Country shares are summed per code, then renormalised to 100.
  const countryTotals = new Map<string, { code: string; country: string; share: number }>();
  for (const account of accounts) {
    const profile = PROFILES[account.platform];
    for (const entry of profile.countries) {
      const current = countryTotals.get(entry.code);
      countryTotals.set(entry.code, {
        code: entry.code,
        country: entry.country,
        share: (current?.share ?? 0) + entry.sharePct * account.followers,
      });
    }
  }

  const countryWeightSum = [...countryTotals.values()].reduce(
    (sum, entry) => sum + entry.share,
    0,
  );

  const topCountries = [...countryTotals.values()]
    .sort((a, b) => b.share - a.share)
    .slice(0, 6)
    .map((entry) => ({
      country: entry.country,
      code: entry.code,
      sharePct:
        countryWeightSum === 0
          ? 0
          : Math.round((entry.share / countryWeightSum) * 1000) / 10,
      followers: Math.round((entry.share / countryWeightSum) * totalFollowers),
    }));

  const segments: AudienceSegment[] = SEGMENT_BLUEPRINT.map((blueprint, index) => {
    const sharePct =
      accounts.reduce(
        (sum, account) =>
          sum + PROFILES[account.platform].segmentMix[index] * account.followers,
        0,
      ) / activeWeight;

    const engagementBase =
      accounts.reduce(
        (sum, account) =>
          sum + PROFILES[account.platform].engagementBase * account.followers,
        0,
      ) / activeWeight;

    return {
      id: blueprint.id,
      name: blueprint.name,
      description: blueprint.description,
      size: Math.round((sharePct / 100) * totalFollowers),
      sharePct: Math.round(sharePct * 10) / 10,
      growthPct: blueprint.growthPct,
      engagementRate: Math.round(engagementBase * blueprint.engagementLift * 100) / 100,
      avgAge: Math.max(18, medianAge + blueprint.ageLift),
    };
  });

  const peakShift =
    accounts.length === 0
      ? 0
      : Math.round(
          accounts.reduce(
            (sum, account) => sum + PROFILES[account.platform].peakShift * account.followers,
            0,
          ) / activeWeight,
        );

  const totalFollowersChangePct =
    totalFollowers === 0
      ? 0
      : Math.round(((netFollowers / totalFollowers) * 100) * 10) / 10;

  return {
    range: scope.range,
    scopeLabel: scopeLabelFor(scope),
    accountCount: accounts.length,
    totalFollowers,
    totalFollowersChangePct,
    newFollowers,
    unfollows,
    netFollowers,
    medianAge,
    topCountries,
    genderSplit,
    segments,
    activityHeatmap: activityHeatmap(peakShift, Math.max(1, accounts.length), 24601),
    growthSeries: growth,
  };
}

function scopeLabelFor(scope: DataScope): string {
  const accounts = accountsInScope(scope);
  if (accounts.length === 1) return accounts[0].displayName;
  if (scope.accountId !== "all") return accounts[0]?.displayName ?? "All accounts";
  if (scope.platform !== "all") return `All ${scope.platform} accounts`;
  return "All accounts";
}

export const AUDIENCE_RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 } as const;

export function lastGrowthPoint(range: DataScope["range"]) {
  const days = AUDIENCE_RANGE_DAYS[range];
  return dayKey(days - 1);
}
