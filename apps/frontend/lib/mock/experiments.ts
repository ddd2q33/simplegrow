import type { DataScope, Experiment, Report } from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import { daysAgo } from "./core";

export const experiments: Experiment[] = [
  {
    id: "exp_001",
    accountId: "acc_ig_main",
    name: "Question hook vs statement hook",
    hypothesis:
      "Reels that open with a question in frame one will hold more viewers past the three-second mark than statement openings.",
    platform: "instagram",
    status: "running",
    primaryMetric: "3-second view rate",
    confidence: 95,
    startedAt: daysAgo(9),
    endedAt: null,
    winnerVariantId: "var_b",
    variants: [
      {
        id: "var_a",
        name: "Statement hook",
        trafficPct: 50,
        impressions: 184200,
        conversions: 58240,
        rate: 31.6,
      },
      {
        id: "var_b",
        name: "Question hook",
        trafficPct: 50,
        impressions: 186400,
        conversions: 79380,
        rate: 42.6,
      },
    ],
    aiVerdict:
      "Variant B wins by a wide margin and the gap widened on each of the last four days. Call it: question hooks.",
  },
  {
    id: "exp_002",
    accountId: "acc_ig_main",
    name: "Carousel length: 6 slides vs 10 slides",
    hypothesis:
      "Longer carousels will increase completion rate without reducing save rate.",
    platform: "instagram",
    status: "running",
    primaryMetric: "Save rate",
    confidence: 62,
    startedAt: daysAgo(5),
    endedAt: null,
    winnerVariantId: null,
    variants: [
      {
        id: "var_a",
        name: "6 slides",
        trafficPct: 50,
        impressions: 61200,
        conversions: 3182,
        rate: 5.2,
      },
      {
        id: "var_b",
        name: "10 slides",
        trafficPct: 50,
        impressions: 61880,
        conversions: 2901,
        rate: 4.69,
      },
    ],
    aiVerdict:
      "Too early. Current direction favours 6 slides, but the confidence band still overlaps. Collect another 3 days.",
  },
  {
    id: "exp_003",
    accountId: "acc_tt_main",
    name: "Posting time: 11:00 vs 20:30",
    hypothesis:
      "Evening posts will outperform morning posts on reach for the main TikTok account.",
    platform: "tiktok",
    status: "completed",
    primaryMetric: "Reach per post",
    confidence: 98,
    startedAt: daysAgo(31),
    endedAt: daysAgo(4),
    winnerVariantId: "var_b",
    variants: [
      {
        id: "var_a",
        name: "11:00",
        trafficPct: 50,
        impressions: 412000,
        conversions: 318400,
        rate: 77.3,
      },
      {
        id: "var_b",
        name: "20:30",
        trafficPct: 50,
        impressions: 689000,
        conversions: 604300,
        rate: 87.7,
      },
    ],
    aiVerdict:
      "Confirmed. Evening posts delivered 87.7% reach versus 77.3% for morning. Roll out across all accounts.",
  },
  {
    id: "exp_004",
    accountId: "acc_yt_main",
    name: "Thumbnail face vs no face",
    hypothesis:
      "Faces in thumbnails will raise click-through rate on long-form YouTube.",
    platform: "youtube",
    status: "draft",
    primaryMetric: "Click-through rate",
    confidence: 0,
    startedAt: daysAgo(-2),
    endedAt: null,
    winnerVariantId: null,
    variants: [
      {
        id: "var_a",
        name: "Face",
        trafficPct: 50,
        impressions: 0,
        conversions: 0,
        rate: 0,
      },
      {
        id: "var_b",
        name: "No face",
        trafficPct: 50,
        impressions: 0,
        conversions: 0,
        rate: 0,
      },
    ],
    aiVerdict: null,
  },
  {
    id: "exp_005",
    accountId: "acc_tt_latam",
    name: "Caption length: short vs long",
    hypothesis: "Longer captions will increase comment volume on LatAm TikTok.",
    platform: "tiktok",
    status: "paused",
    primaryMetric: "Comments per 1K views",
    confidence: 41,
    startedAt: daysAgo(14),
    endedAt: null,
    winnerVariantId: null,
    variants: [
      {
        id: "var_a",
        name: "Short (<40 chars)",
        trafficPct: 50,
        impressions: 78400,
        conversions: 612,
        rate: 7.81,
      },
      {
        id: "var_b",
        name: "Long (>120 chars)",
        trafficPct: 50,
        impressions: 79100,
        conversions: 519,
        rate: 6.56,
      },
    ],
    aiVerdict:
      "Paused by an editor. Direction favours short captions, but the variant split needs more impressions before a call.",
  },
  {
    id: "exp_006",
    accountId: "acc_ig_latam",
    name: "Spanish originals vs dubbed main-brand footage",
    hypothesis:
      "Spanish-language originals will reach more LatAm viewers than dubbed versions of the same main-brand video.",
    platform: "tiktok",
    status: "running",
    primaryMetric: "Reach per post",
    confidence: 78,
    startedAt: daysAgo(12),
    endedAt: null,
    winnerVariantId: null,
    variants: [
      {
        id: "var_a",
        name: "Spanish original",
        trafficPct: 50,
        impressions: 214600,
        conversions: 128400,
        rate: 59.8,
      },
      {
        id: "var_b",
        name: "Dubbed from EN",
        trafficPct: 50,
        impressions: 209800,
        conversions: 89100,
        rate: 42.5,
      },
    ],
    aiVerdict:
      "Originals lead by a consistent 17 points across nine matched pairs. Trend is stable, collect four more days to call it.",
  },
  {
    id: "exp_007",
    accountId: "acc_ig_verde",
    name: "Menu post time: 07:30 vs 10:30",
    hypothesis:
      "Publishing the weekly menu before the morning commute will beat the current 10:30 slot on click-through rate.",
    platform: "instagram",
    status: "completed",
    primaryMetric: "Link click-through rate",
    confidence: 94,
    startedAt: daysAgo(24),
    endedAt: daysAgo(7),
    winnerVariantId: "var_a",
    variants: [
      {
        id: "var_a",
        name: "07:30",
        trafficPct: 50,
        impressions: 41200,
        conversions: 5140,
        rate: 12.48,
      },
      {
        id: "var_b",
        name: "10:30",
        trafficPct: 50,
        impressions: 40880,
        conversions: 4210,
        rate: 10.3,
      },
    ],
    aiVerdict:
      "Confirmed over eight matched weeks. The morning window holds for this audience; schedule permanently at 07:30.",
  },
];

export const reports: Report[] = [
  {
    id: "rpt_008",
    accountId: null,
    name: "August 2026 — Monthly performance",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    format: "pdf",
    status: "ready",
    createdAt: daysAgo(28),
    sizeBytes: 2516582,
    downloadUrl: "/api/reports/rpt_008/download",
    sections: [
      "Executive summary",
      "Platform breakdown",
      "Account breakdown",
      "Top content",
      "Audience shift",
      "Recommendations",
    ],
  },
  {
    id: "rpt_007",
    accountId: null,
    name: "Q2 2026 — Quarterly review",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    format: "pdf",
    status: "ready",
    createdAt: daysAgo(60),
    sizeBytes: 4194304,
    downloadUrl: "/api/reports/rpt_007/download",
    sections: [
      "Executive summary",
      "Quarter over quarter",
      "Channel attribution",
      "Group performance",
      "Experiment log",
    ],
  },
  {
    id: "rpt_006",
    accountId: null,
    name: "Content leaderboard — last 90 days",
    periodStart: "2026-06-30",
    periodEnd: "2026-09-28",
    format: "csv",
    status: "ready",
    createdAt: daysAgo(12),
    sizeBytes: 184320,
    downloadUrl: "/api/reports/rpt_006/download",
    sections: ["Content leaderboard"],
  },
  {
    id: "rpt_005",
    accountId: null,
    name: "September 2026 — Monthly performance",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    format: "pdf",
    status: "generating",
    createdAt: daysAgo(0, -1),
    sizeBytes: 0,
    downloadUrl: null,
    sections: ["Executive summary", "Platform breakdown", "Account breakdown", "Top content"],
  },
  {
    id: "rpt_004",
    accountId: null,
    name: "Audience demographics export",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    format: "xlsx",
    status: "ready",
    createdAt: daysAgo(26),
    sizeBytes: 962560,
    downloadUrl: "/api/reports/rpt_004/download",
    sections: ["Segments", "Demographics", "Activity heatmap"],
  },
  {
    id: "rpt_003",
    accountId: "acc_tt_latam",
    name: "LatAm TikTok — August deep dive",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    format: "pdf",
    status: "ready",
    createdAt: daysAgo(27),
    sizeBytes: 1872431,
    downloadUrl: "/api/reports/rpt_003/download",
    sections: ["Executive summary", "Hook analysis", "Best posting windows"],
  },
  {
    id: "rpt_002",
    accountId: "acc_ig_verde",
    name: "Verde Café — Q3 client review",
    periodStart: "2026-07-01",
    periodEnd: "2026-09-30",
    format: "pdf",
    status: "ready",
    createdAt: daysAgo(19),
    sizeBytes: 3145728,
    downloadUrl: "/api/reports/rpt_002/download",
    sections: [
      "Executive summary",
      "Channel performance",
      "Local audience",
      "Content recommendations",
    ],
  },
];

export function experimentsInScope(scope: DataScope): Experiment[] {
  return experiments.filter((experiment) => {
    if (scope.accountId !== ALL_ACCOUNTS && experiment.accountId !== scope.accountId) {
      return false;
    }
    if (scope.platform !== "all" && experiment.platform !== scope.platform) {
      return false;
    }
    return true;
  });
}

export function reportsInScope(scope: DataScope): Report[] {
  return reports.filter((report) => {
    if (scope.accountId === ALL_ACCOUNTS) return true;
    return report.accountId === null || report.accountId === scope.accountId;
  });
}
