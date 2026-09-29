import type { Insight, Notification, Recommendation } from "@/lib/types";
import { daysAgo } from "./core";

export const insights: Insight[] = [
  {
    id: "ins_001",
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
    category: "audience",
    title: "Lapsed followers grew 4.3% while new segments grew 11.8%",
    detail:
      "23,300 followers have not engaged in 90+ days. A re-engagement carousel targeted at this cohort costs nothing and historically recovers 8-12% within two weeks.",
    confidence: 88,
    impact: "medium",
    platform: "instagram",
    createdAt: daysAgo(3),
  },
  {
    id: "ins_004",
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
    category: "audience",
    title: "Audience is 29 median, up 2 years year over year",
    detail:
      "The 25-34 bracket now accounts for 44% of your audience. Content aimed at 25-34 in your category is underweighted by roughly 20% of your output.",
    confidence: 85,
    impact: "medium",
    platform: "all",
    createdAt: daysAgo(8),
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "rec_001",
    title: "Shift three weekly posts to the 20:00-21:00 window",
    detail:
      "Highest-confidence timing change available. Start with the TikTok account, where the gap is widest.",
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
    title: "Launch a re-engagement carousel for the lapsed segment",
    detail:
      "23,300 followers are addressable today. Cross-post from Instagram and Facebook once Facebook is reconnected.",
    category: "audience",
    priority: "medium",
    estimatedImpactPct: 9,
    effort: "low",
    platform: "instagram",
    status: "open",
    createdAt: daysAgo(3),
  },
  {
    id: "rec_004",
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
    title: "Reconnect Facebook to recover 33K historical reach data",
    detail:
      "The integration lapsed 46 days ago, which breaks the reach comparison window across the dashboard.",
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
];

export const notifications: Notification[] = [
  {
    id: "ntf_001",
    title: "New insight: timing gap detected",
    body: "Your TikTok audience peaks 40 minutes after your current posting window.",
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
    title: "Facebook integration disconnected",
    body: "Reconnect to restore 33K of historical reach data.",
    createdAt: daysAgo(1, -8),
    read: true,
    kind: "system",
  },
];
