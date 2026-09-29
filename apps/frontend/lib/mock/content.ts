import type { ContentItem, Platform } from "@/lib/types";
import { daysAgo, mulberry32 } from "./core";

interface Seed {
  platform: Platform;
  format: ContentItem["format"];
  title: string;
  caption: string;
  publishedDaysAgo: number;
  tags: string[];
  reachBase: number;
  viral: number;
  status?: ContentItem["status"];
}

const SEEDS: Seed[] = [
  {
    platform: "instagram",
    format: "reel",
    title: "Behind the scenes: rebuilding our onboarding flow",
    caption:
      "We threw away 3 onboarding versions before this one stuck. Full breakdown in the video.",
    publishedDaysAgo: 2,
    tags: ["bts", "product", "onboarding"],
    reachBase: 142000,
    viral: 2.4,
  },
  {
    platform: "tiktok",
    format: "short",
    title: "The 12-second hook that doubled our retention",
    caption: "Stop opening with your logo. Stop. Do this instead.",
    publishedDaysAgo: 4,
    tags: ["hook", "retention", "growth"],
    reachBase: 268000,
    viral: 3.1,
  },
  {
    platform: "youtube",
    format: "video",
    title: "We reviewed 400 SaaS landing pages. Here is what actually converts.",
    caption:
      "A data-backed teardown of landing page patterns across 400 SaaS sites, with the outliers called out.",
    publishedDaysAgo: 6,
    tags: ["teardown", "conversion", "data"],
    reachBase: 88000,
    viral: 1.6,
  },
  {
    platform: "instagram",
    format: "carousel",
    title: "7 swipeable layouts for carousel posts",
    caption: "Carousels still beat reels for saves. Here are the 7 layouts we reuse.",
    publishedDaysAgo: 9,
    tags: ["carousel", "design", "templates"],
    reachBase: 96000,
    viral: 1.2,
  },
  {
    platform: "twitter",
    format: "thread",
    title: "Why your engagement rate dropped (and it's not the algorithm)",
    caption:
      "A 10-point thread on the retention curve most teams ignore.",
    publishedDaysAgo: 11,
    tags: ["thread", "engagement"],
    reachBase: 41000,
    viral: 1.1,
  },
  {
    platform: "tiktok",
    format: "short",
    title: "POV: you check your analytics for the 47th time today",
    caption: "Relatable content hits different.",
    publishedDaysAgo: 13,
    tags: ["relatable", "culture"],
    reachBase: 195000,
    viral: 2.2,
  },
  {
    platform: "instagram",
    format: "reel",
    title: "I let our AI rewrite 30 captions. Results inside.",
    caption: "Same post, same hook, different captions. The delta surprised us.",
    publishedDaysAgo: 15,
    tags: ["ai", "copywriting", "experiment"],
    reachBase: 178000,
    viral: 2.8,
  },
  {
    platform: "youtube",
    format: "short",
    title: "One analytics mistake costing you 20% reach",
    caption: "Sixty seconds, one chart, big difference.",
    publishedDaysAgo: 18,
    tags: ["analytics", "shorts"],
    reachBase: 64000,
    viral: 1.4,
  },
  {
    platform: "tiktok",
    format: "short",
    title: "Answering the question we get every single day",
    caption: "Do you need more followers or better ones?",
    publishedDaysAgo: 21,
    tags: ["faq", "growth"],
    reachBase: 152000,
    viral: 1.9,
  },
  {
    platform: "instagram",
    format: "carousel",
    title: "Our posting calendar for Q4",
    caption: "Every slot, every format, every platform. Steal it.",
    publishedDaysAgo: 24,
    tags: ["calendar", "planning"],
    reachBase: 71000,
    viral: 1.0,
  },
  {
    platform: "facebook",
    format: "image",
    title: "Community spotlight: how Studio Norte grew 3x",
    caption: "A customer story with real numbers.",
    publishedDaysAgo: 27,
    tags: ["case-study", "community"],
    reachBase: 33000,
    viral: 0.9,
  },
  {
    platform: "twitter",
    format: "thread",
    title: "The weekly metrics digest — week 38",
    caption: "Numbers only, no fluff.",
    publishedDaysAgo: 30,
    tags: ["digest", "metrics"],
    reachBase: 22000,
    viral: 0.8,
  },
  {
    platform: "instagram",
    format: "story",
    title: "Live Q&A: building a content engine",
    caption: "48 questions answered live.",
    publishedDaysAgo: 34,
    tags: ["live", "q&a"],
    reachBase: 28000,
    viral: 0.7,
  },
  {
    platform: "tiktok",
    format: "short",
    title: "3 hooks for low-follower accounts",
    caption: "You do not need reach to test hooks.",
    publishedDaysAgo: 38,
    tags: ["hooks", "beginners"],
    reachBase: 118000,
    viral: 1.7,
  },
  {
    platform: "youtube",
    format: "video",
    title: "Full funnel teardown: ad to paid client",
    caption: "Everything we learned running paid social for 11 months.",
    publishedDaysAgo: 44,
    tags: ["ads", "funnel", "case-study"],
    reachBase: 52000,
    viral: 1.2,
  },
  {
    platform: "instagram",
    format: "reel",
    title: "Day in the life: our content team of four",
    caption: "Real numbers, real chaos.",
    publishedDaysAgo: 52,
    tags: ["bts", "team"],
    reachBase: 89000,
    viral: 1.5,
  },
  {
    platform: "facebook",
    format: "video",
    title: "Webinar recap: attribution without the guesswork",
    caption: "Recording and slides available.",
    publishedDaysAgo: 61,
    tags: ["webinar", "attribution"],
    reachBase: 21000,
    viral: 0.6,
  },
  {
    platform: "twitter",
    format: "thread",
    title: "We audited 1,000 captions. Patterns found.",
    caption: "Short, specific, one idea. The data agrees.",
    publishedDaysAgo: 68,
    tags: ["captions", "data"],
    reachBase: 19000,
    viral: 0.9,
  },
  {
    platform: "tiktok",
    format: "short",
    title: "Editing trick that made our videos 2x watchable",
    caption: "Cut on the beat, lose 20% of your viewers.",
    publishedDaysAgo: 76,
    tags: ["editing", "retention"],
    reachBase: 87000,
    viral: 1.6,
  },
  {
    platform: "youtube",
    format: "video",
    title: "Building a reporting stack that people actually read",
    caption: "Nine months of iteration on one dashboard.",
    publishedDaysAgo: 83,
    tags: ["reporting", "systems"],
    reachBase: 39000,
    viral: 1.0,
  },
];

const PUBLISH_HOURS: Record<ContentItem["format"], number> = {
  reel: 11,
  carousel: 9,
  short: 18,
  video: 14,
  image: 10,
  thread: 8,
  story: 20,
};

function buildContent(seed: Seed, index: number): ContentItem {
  const rand = mulberry32(4100 + index * 97);
  const reach = Math.round(seed.reachBase * seed.viral * (0.85 + rand() * 0.3));
  const impressions = Math.round(reach * (1.15 + rand() * 0.35));
  const likes = Math.round(reach * (0.028 + rand() * 0.035));
  const comments = Math.round(reach * (0.0022 + rand() * 0.004));
  const shares = Math.round(reach * (0.0035 + rand() * 0.006));
  const saves = Math.round(reach * (0.006 + rand() * 0.011));
  const engagementRate =
    ((likes + comments + shares + saves) / Math.max(impressions, 1)) * 100;

  const ageDecay = Math.max(0.45, 1 - seed.publishedDaysAgo / 240);

  return {
    id: `cnt_${String(index + 1).padStart(3, "0")}`,
    platform: seed.platform,
    format: seed.format,
    title: seed.title,
    caption: seed.caption,
    thumbnailUrl: null,
    permalink: `https://${seed.platform}.com/northwind/${index + 1}`,
    publishedAt: daysAgo(seed.publishedDaysAgo, -PUBLISH_HOURS[seed.format]),
    status: seed.status ?? "published",
    aiScore: Math.round((5.2 + rand() * 4.3) * 10) / 10,
    tags: seed.tags,
    metrics: {
      impressions,
      reach,
      views: seed.format === "image" ? 0 : Math.round(reach * (0.7 + rand() * 0.5)),
      likes,
      comments,
      shares,
      saves,
      engagementRate: Math.round(engagementRate * 100) / 100,
      watchTimeSec: Math.round((18 + rand() * 42) * ageDecay),
      avgViewPct: Math.round(28 + rand() * 55),
    },
  };
}

export const contentItems: ContentItem[] = SEEDS.map(buildContent);

export const scheduledContent: ContentItem[] = [
  {
    id: "cnt_sched_001",
    platform: "instagram",
    format: "reel",
    title: "Draft: the 5-part content system we run on",
    caption: "Publishing tomorrow 11:00 local.",
    thumbnailUrl: null,
    permalink: null,
    publishedAt: daysAgo(-1, -11),
    status: "scheduled",
    aiScore: 8.4,
    tags: ["system", "draft"],
    metrics: {
      impressions: 0,
      reach: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0,
      watchTimeSec: 0,
      avgViewPct: 0,
    },
  },
  {
    id: "cnt_sched_002",
    platform: "tiktok",
    format: "short",
    title: "Draft: reacting to your unhookable first 3 seconds",
    caption: "Needs a thumbnail before it goes out.",
    thumbnailUrl: null,
    permalink: null,
    publishedAt: daysAgo(-3, -18),
    status: "needs_review",
    aiScore: 6.1,
    tags: ["hooks", "review"],
    metrics: {
      impressions: 0,
      reach: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0,
      watchTimeSec: 0,
      avgViewPct: 0,
    },
  },
  {
    id: "cnt_sched_003",
    platform: "youtube",
    format: "short",
    title: "Draft: 60-second teardown of a bad hook",
    caption: "Scripted, awaiting final edit.",
    thumbnailUrl: null,
    permalink: null,
    publishedAt: daysAgo(-6, -14),
    status: "draft",
    aiScore: 7.7,
    tags: ["hooks", "shorts"],
    metrics: {
      impressions: 0,
      reach: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0,
      watchTimeSec: 0,
      avgViewPct: 0,
    },
  },
];
