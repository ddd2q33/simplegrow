import type {
  AudienceActivityWindow,
  AudienceOverview,
  AudienceSegment,
  DateRangeKey,
  MetricPoint,
} from "@/lib/types";
import { dayKey, mulberry32 } from "./core";
import { RANGE_DAYS } from "./analytics";

export const segments: AudienceSegment[] = [
  {
    id: "seg_dedicated",
    name: "Dedicated followers",
    description: "Engaged 3+ times in the last 30 days",
    size: 41200,
    sharePct: 23.4,
    growthPct: 11.8,
    engagementRate: 9.42,
    avgAge: 27,
  },
  {
    id: "seg_regulars",
    name: "Regulars",
    description: "Engaged once or twice per month",
    size: 68400,
    sharePct: 38.9,
    growthPct: 6.4,
    engagementRate: 5.18,
    avgAge: 31,
  },
  {
    id: "seg_casual",
    name: "Casual viewers",
    description: "Engaged in the last 90 days only",
    size: 43100,
    sharePct: 24.5,
    growthPct: 1.9,
    engagementRate: 2.74,
    avgAge: 34,
  },
  {
    id: "seg_lapsed",
    name: "Lapsed",
    description: "No engagement in 90+ days",
    size: 23300,
    sharePct: 13.2,
    growthPct: -4.3,
    engagementRate: 0.61,
    avgAge: 29,
  },
];

export const topCountries = [
  { country: "Mexico", code: "MX", sharePct: 28.4, followers: 49984 },
  { country: "United States", code: "US", sharePct: 22.1, followers: 38896 },
  { country: "Spain", code: "ES", sharePct: 11.7, followers: 20592 },
  { country: "Colombia", code: "CO", sharePct: 8.3, followers: 14608 },
  { country: "Argentina", code: "AR", sharePct: 6.9, followers: 12144 },
  { country: "Chile", code: "CL", sharePct: 4.2, followers: 7392 },
];

export const genderSplit = [
  { label: "Women", pct: 58 },
  { label: "Men", pct: 39 },
  { label: "Non-binary / undisclosed", pct: 3 },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Peak activity lands on weekday evenings and Sunday mornings. */
export function activityHeatmap(): AudienceActivityWindow[] {
  const rand = mulberry32(24601);
  const cells: AudienceActivityWindow[] = [];

  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const eveningPeak = Math.exp(-((hour - 20) ** 2) / 14);
      const lunchPeak = Math.exp(-((hour - 13) ** 2) / 8);
      const weekendMorning = day >= 5 ? Math.exp(-((hour - 10) ** 2) / 16) : 0;
      const weekdayPenalty = day < 5 ? 1 : 0.82;
      const base =
        18 + (eveningPeak * 62 + lunchPeak * 26 + weekendMorning * 44) * weekdayPenalty;

      cells.push({
        day: DAY_LABELS[day],
        hour,
        value: Math.round(base * (0.88 + rand() * 0.24)),
      });
    }
  }

  return cells;
}

function followerGrowth(days: number): MetricPoint[] {
  const rand = mulberry32(9091 + days);
  const points: MetricPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const progress = (days - 1 - i) / Math.max(days - 1, 1);
    const gained = Math.round(260 + progress * 190 + (rand() - 0.5) * 240);
    const lost = Math.round(58 + progress * 26 + (rand() - 0.5) * 90);

    points.push({
      date: dayKey(i),
      value: Math.max(gained - lost, 20),
      previous: Math.max(gained - lost - 24 + (rand() - 0.5) * 60, 15),
    });
  }

  return points;
}

const FOLLOWER_GROWTH_PCT: Record<DateRangeKey, number> = {
  "7d": 2.1,
  "30d": 8.4,
  "90d": 21.6,
};

export function buildAudienceOverview(range: DateRangeKey): AudienceOverview {
  const days = RANGE_DAYS[range];
  const growth = followerGrowth(days);
  const gained = growth.reduce((sum, point) => sum + point.value, 0);
  const lost = Math.round(gained * 0.21);

  return {
    range,
    totalFollowers: 176000,
    totalFollowersChangePct: FOLLOWER_GROWTH_PCT[range],
    newFollowers: Math.round(gained + lost),
    unfollows: lost,
    netFollowers: gained,
    medianAge: 29,
    topCountries,
    genderSplit,
    segments,
    activityHeatmap: activityHeatmap(),
    growthSeries: growth,
  };
}
