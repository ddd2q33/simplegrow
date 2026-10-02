import type { DataScope, Insight, Notification, Recommendation } from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import { daysAgo } from "./core";

export const insights: Insight[] = [
  {
    id: "ins_001",
    accountId: "acc_tt_main",
    category: "timing",
    title: "Your audience peaks 40 minutes later than you post",
    detail:
      "Engagement on posts published at 11:00 trails the 21:00 window by 34% on TikTok and 22% on Instagram. Moving three posts per week into the evening window is projected to add roughly 18K monthly reach.",
    confidence: 94,
    impact: "high",
    platform: "all",
    createdAt: daysAgo(1),
  },
  {
    id: "ins_002",
    accountId: "acc_ig_main",
    category: "content",
    title: "Reels with a question in the first second outperform by 2.1x",
    detail:
      "Across 42 reels in the last 60 days, opening frames containing a question held 68% of viewers past the three-second mark versus 31% for statement openings.",
    confidence: 91,
    impact: "high",
    platform: "instagram",
    createdAt: daysAgo(2),
  },
  {
    id: "ins_003",
    accountId: "acc_ig_latam",
    category: "audience",
    title: "Regional audience is growing 19.7% a month, fastest in the workspace",
    detail:
      "The LatAm Instagram account added more followers this month than the main brand account, with 41% of new followers arriving from outside Mexico. Repurposing the main brand's top carousel in Spanish is the lowest-cost next test.",
    confidence: 89,
    impact: "high",
    platform: "instagram",
    createdAt: daysAgo(3),
  },
  {
    id: "ins_004",
    accountId: null,
    category: "cadence",
    title: "Posting five times a week is not your ceiling",
    detail:
      "Days with two posts outperformed single-post days by 12% on reach but lowered comment quality by 6%. The current four-post cadence is near the sweet spot for a team of four.",
    confidence: 76,
    impact: "low",
    platform: "all",
    createdAt: daysAgo(5),
  },
  {
    id: "ins_005",
    accountId: "acc_yt_main",
    category: "conversion",
    title: "YouTube subscribers convert to site visits at 4x the platform average",
    detail:
      "Long-form teardowns drive the highest intent of any format you publish. Adding a pinned comment with a link on every teardown is projected to add 900 monthly sessions.",
    confidence: 83,
    impact: "high",
    platform: "youtube",
    createdAt: daysAgo(6),
  },
  {
    id: "ins_006",
    accountId: null,
    category: "audience",
    title: "Audience is 29 median, up 2 years year over year",
    detail:
      "The 25-34 bracket now accounts for 44% of your audience. Content aimed at 25-34 in your category is underweighted by roughly 20% of your output.",
    confidence: 85,
    impact: "medium",
    platform: "all",
    createdAt: daysAgo(8),
  },
  {
    id: "ins_007",
    accountId: "acc_ig_verde",
    category: "timing",
    title: "Verde Café's audience is online at 07:00, three hours before your brand accounts",
    detail:
      "Coffee purchase intent concentrates before the morning commute. Moving the weekly menu post to 07:30 lifted preview-to-click rate 22% in the last two tests.",
    confidence: 81,
    impact: "medium",
    platform: "instagram",
    createdAt: daysAgo(4),
  },
  {
    id: "ins_008",
    accountId: "acc_tt_latam",
    category: "content",
    title: "Spanish-captioned videos are outperforming by 2.4x on LatAm TikTok",
    detail:
      "The account's Spanish originals average 2.4x the reach of dubbed versions of the same main-brand footage. Originals are the cheaper path here — no extra production cost.",
    confidence: 87,
    impact: "high",
    platform: "tiktok",
    createdAt: daysAgo(2),
  },
  {
    id: "ins_009",
    accountId: "acc_x_hq",
    category: "cadence",
    title: "X reach is declining 2.4% a month and threads are the cause",
    detail:
      "Single-post updates are outperforming 10-point threads, but threads are scheduled 78% of the time. Repartitioning the calendar to 3:1 single-post to thread recovers most of the gap.",
    confidence: 74,
    impact: "medium",
    platform: "twitter",
    createdAt: daysAgo(7),
  },
  {
    id: "ins_010",
    accountId: "acc_yt_verde",
    category: "conversion",
    title: "Verde Café's YouTube channel is unverified — Shorts are throttled",
    detail:
      "The channel lost API access three days ago. Until it is reauthorised, Shorts impressions are capped and long-form upload scheduling is failing silently.",
    confidence: 96,
    impact: "high",
    platform: "youtube",
    createdAt: daysAgo(3),
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "rec_001",
    accountId: "acc_tt_main",
    title: "Shift three weekly posts to the 20:00-21:00 window",
    detail:
      "Highest-confidence timing change available. Start with the main TikTok account, where the gap is widest.",
    category: "timing",
    priority: "high",
    estimatedImpactPct: 18,
    effort: "low",
    platform: "all",
    status: "open",
    createdAt: daysAgo(1),
  },
  {
    id: "rec_002",
    accountId: "acc_ig_main",
    title: "Rewrite every reel hook to open with a question",
    detail:
      "Your top 10% of reels all used a question or a number in frame one. The remaining 78% do neither.",
    category: "content",
    priority: "high",
    estimatedImpactPct: 24,
    effort: "medium",
    platform: "instagram",
    status: "open",
    createdAt: daysAgo(2),
  },
  {
    id: "rec_003",
    accountId: "acc_ig_latam",
    title: "Repurpose the main brand's top carousel in Spanish",
    detail:
      "The LatAm account is growing fastest in the workspace and has no Spanish carousel yet. Translation cost is under an hour.",
    category: "content",
    priority: "high",
    estimatedImpactPct: 16,
    effort: "low",
    platform: "instagram",
    status: "open",
    createdAt: daysAgo(3),
  },
  {
    id: "rec_004",
    accountId: "acc_yt_main",
    title: "Pin a trackable link on every long-form teardown",
    detail:
      "Converts your highest-intent format into measurable sessions. Requires UTM discipline, not new tooling.",
    category: "conversion",
    priority: "medium",
    estimatedImpactPct: 6,
    effort: "low",
    platform: "youtube",
    status: "applied",
    createdAt: daysAgo(7),
  },
  {
    id: "rec_005",
    accountId: "acc_fb_verde",
    title: "Reconnect the Verde Café Facebook page",
    detail:
      "The integration lapsed 46 days ago, which breaks the reach comparison window for the whole client group.",
    category: "timing",
    priority: "high",
    estimatedImpactPct: 0,
    effort: "low",
    platform: "facebook",
    status: "open",
    createdAt: daysAgo(9),
  },
  {
    id: "rec_006",
    accountId: "acc_tt_latam",
    title: "Cut Tuesday posts after 16:00 — lowest retention day",
    detail:
      "Tuesday late posts hold 19% of viewers past ten seconds versus 47% on Thursday mornings.",
    category: "cadence",
    priority: "low",
    estimatedImpactPct: 4,
    effort: "low",
    platform: "tiktok",
    status: "dismissed",
    createdAt: daysAgo(11),
  },
  {
    id: "rec_007",
    accountId: "acc_x_hq",
    title: "Repartition the X calendar to 3 single posts per thread",
    detail:
      "Single updates are outperforming threads by a wide margin. This is a scheduling change, not a content change.",
    category: "cadence",
    priority: "medium",
    estimatedImpactPct: 11,
    effort: "low",
    platform: "twitter",
    status: "open",
    createdAt: daysAgo(5),
  },
  {
    id: "rec_008",
    accountId: "acc_yt_verde",
    title: "Reauthorise the Verde Café YouTube channel",
    detail:
      "API access lapsed three days ago. Shorts impressions are capped and scheduled uploads are failing silently.",
    category: "timing",
    priority: "high",
    estimatedImpactPct: 0,
    effort: "low",
    platform: "youtube",
    status: "open",
    createdAt: daysAgo(3),
  },
  {
    id: "rec_009",
    accountId: "acc_ig_verde",
    title: "Move the weekly menu post to 07:30 local",
    detail:
      "Two consecutive tests cleared 22% more click-throughs. The pattern is consistent enough to schedule permanently.",
    category: "timing",
    priority: "medium",
    estimatedImpactPct: 8,
    effort: "low",
    platform: "instagram",
    status: "open",
    createdAt: daysAgo(4),
  },
];

export const notifications: Notification[] = [
  {
    id: "ntf_001",
    title: "New insight: timing gap detected",
    body: "Your main TikTok audience peaks 40 minutes after your current posting window.",
    createdAt: daysAgo(0, -3),
    read: false,
    kind: "insight",
  },
  {
    id: "ntf_002",
    title: "Experiment reaching 95% confidence",
    body: "“Question hook vs statement hook” is ready to call.",
    createdAt: daysAgo(0, -6),
    read: false,
    kind: "experiment",
  },
  {
    id: "ntf_003",
    title: "August report is ready",
    body: "Monthly performance report finished generating (PDF, 2.4 MB).",
    createdAt: daysAgo(1, -2),
    read: true,
    kind: "report",
  },
  {
    id: "ntf_004",
    title: "Verde Café YouTube needs reauthorisation",
    body: "API access lapsed 3 days ago and Shorts are throttled.",
    createdAt: daysAgo(1, -8),
    read: true,
    kind: "system",
  },
];

interface ScopedRecord {
  accountId: string | null;
  platform: DataScope["platform"] | "all";
}

/**
 * A record is visible when it targets the scoped account, or when it is a
 * cross-account insight whose platform matches the scope.
 */
export function isInScope(record: ScopedRecord, scope: DataScope): boolean {
  if (scope.accountId !== ALL_ACCOUNTS) {
    return record.accountId === scope.accountId;
  }
  if (scope.platform !== "all" && record.platform !== "all") {
    return record.platform === scope.platform;
  }
  return true;
}

export function insightsInScope(scope: DataScope): Insight[] {
  return insights.filter((item) => isInScope(item, scope));
}

export function recommendationsInScope(scope: DataScope): Recommendation[] {
  return recommendations.filter((item) => isInScope(item, scope));
}
