import type { AccountId, ContentItem, Platform, SocialAccount } from "@/lib/types";
import { ACCOUNT_SEEDS, socialAccounts } from "./accounts";
import { daysAgo, mulberry32 } from "./core";

interface Seed {
  platform: Platform;
  format: ContentItem["format"];
  title: string;
  caption: string;
  days: number;
  tags: string[];
  reachBase: number;
  viral: number;
}

const SEEDS: Seed[] = [
  // ── Instagram ──────────────────────────────────────────────────────
  { platform: "instagram", format: "reel", title: "Behind the scenes: rebuilding our onboarding flow", caption: "We threw away 3 onboarding versions before this one stuck. Full breakdown in the video.", days: 2, tags: ["bts", "product", "onboarding"], reachBase: 142000, viral: 2.4 },
  { platform: "instagram", format: "carousel", title: "7 swipeable layouts for carousel posts", caption: "Carousels still beat reels for saves. Here are the 7 layouts we reuse.", days: 9, tags: ["carousel", "design", "templates"], reachBase: 96000, viral: 1.2 },
  { platform: "instagram", format: "reel", title: "I let our AI rewrite 30 captions. Results inside.", caption: "Same post, same hook, different captions. The delta surprised us.", days: 15, tags: ["ai", "copywriting", "experiment"], reachBase: 178000, viral: 2.8 },
  { platform: "instagram", format: "carousel", title: "Our posting calendar for Q4", caption: "Every slot, every format, every platform. Steal it.", days: 24, tags: ["calendar", "planning"], reachBase: 71000, viral: 1.0 },
  { platform: "instagram", format: "story", title: "Live Q&A: building a content engine", caption: "48 questions answered live.", days: 34, tags: ["live", "q&a"], reachBase: 28000, viral: 0.7 },
  { platform: "instagram", format: "reel", title: "Day in the life: our content team of four", caption: "Real numbers, real chaos.", days: 52, tags: ["bts", "team"], reachBase: 89000, viral: 1.5 },
  { platform: "instagram", format: "reel", title: "The caption formula we stopped deviating from", caption: "Hook, tension, proof, ask. Four beats, no exceptions.", days: 7, tags: ["copywriting", "system"], reachBase: 121000, viral: 2.1 },
  { platform: "instagram", format: "carousel", title: "9 mistakes that quietly kill your reach", caption: "Number six costs most accounts half their distribution.", days: 12, tags: ["mistakes", "education"], reachBase: 134000, viral: 2.6 },
  { platform: "instagram", format: "reel", title: "Reading your comments like a research team would", caption: "The comments are the roadmap. Here is how we mine them.", days: 18, tags: ["comments", "research"], reachBase: 84000, viral: 1.3 },
  { platform: "instagram", format: "carousel", title: "Brand kit templates we actually use weekly", caption: "Not a mood board. Files we open every Monday.", days: 30, tags: ["brand", "templates"], reachBase: 66000, viral: 1.1 },
  { platform: "instagram", format: "reel", title: "What 100k views actually pays in 2026", caption: "RPMs changed a lot. Here are the real numbers per format.", days: 40, tags: ["monetization", "data"], reachBase: 156000, viral: 2.2 },
  { platform: "instagram", format: "story", title: "Poll: what should we build next quarter?", caption: "You decide the roadmap this week.", days: 5, tags: ["community", "polls"], reachBase: 19000, viral: 0.6 },

  // ── TikTok ─────────────────────────────────────────────────────────
  { platform: "tiktok", format: "short", title: "The 12-second hook that doubled our retention", caption: "Stop opening with your logo. Stop. Do this instead.", days: 4, tags: ["hook", "retention", "growth"], reachBase: 268000, viral: 3.1 },
  { platform: "tiktok", format: "short", title: "POV: you check your analytics for the 47th time today", caption: "Relatable content hits different.", days: 13, tags: ["relatable", "culture"], reachBase: 195000, viral: 2.2 },
  { platform: "tiktok", format: "short", title: "Answering the question we get every single day", caption: "Do you need more followers or better ones?", days: 21, tags: ["faq", "growth"], reachBase: 152000, viral: 1.9 },
  { platform: "tiktok", format: "short", title: "3 hooks for low-follower accounts", caption: "You do not need reach to test hooks.", days: 38, tags: ["hooks", "beginners"], reachBase: 118000, viral: 1.7 },
  { platform: "tiktok", format: "short", title: "Editing trick that made our videos 2x watchable", caption: "Cut on the beat, lose 20% of your viewers.", days: 76, tags: ["editing", "retention"], reachBase: 87000, viral: 1.6 },
  { platform: "tiktok", format: "short", title: "Nobody talks about how boring the first draft is", caption: "Twenty bad versions before one lands.", days: 8, tags: ["process", "authentic"], reachBase: 174000, viral: 2.4 },
  { platform: "tiktok", format: "short", title: "Rate my setup vs yours", caption: "Camera angle alone moved retention 18%.", days: 16, tags: ["setup", "trends"], reachBase: 138000, viral: 1.8 },
  { platform: "tiktok", format: "short", title: "The comment that made us rewrite our whole funnel", caption: "One sentence from a stranger beat a month of testing.", days: 26, tags: ["community", "story"], reachBase: 129000, viral: 2.0 },
  { platform: "tiktok", format: "short", title: "Reply to @everygrowthquestion", caption: "Batch replying to the funniest ones.", days: 45, tags: ["reply", "community"], reachBase: 103000, viral: 1.4 },
  { platform: "tiktok", format: "short", title: "Your first 1,000 followers are the hard part", caption: "The plateau everyone hits, and how we broke it.", days: 62, tags: ["milestone", "growth"], reachBase: 94000, viral: 1.5 },

  // ── YouTube ────────────────────────────────────────────────────────
  { platform: "youtube", format: "video", title: "We reviewed 400 SaaS landing pages. Here is what actually converts.", caption: "A data-backed teardown of landing page patterns across 400 SaaS sites, with the outliers called out.", days: 6, tags: ["teardown", "conversion", "data"], reachBase: 88000, viral: 1.6 },
  { platform: "youtube", format: "short", title: "One analytics mistake costing you 20% reach", caption: "Sixty seconds, one chart, big difference.", days: 18, tags: ["analytics", "shorts"], reachBase: 64000, viral: 1.4 },
  { platform: "youtube", format: "video", title: "Full funnel teardown: ad to paid client", caption: "Everything we learned running paid social for 11 months.", days: 44, tags: ["ads", "funnel", "case-study"], reachBase: 52000, viral: 1.2 },
  { platform: "youtube", format: "video", title: "Building a reporting stack that people actually read", caption: "Nine months of iteration on one dashboard.", days: 83, tags: ["reporting", "systems"], reachBase: 39000, viral: 1.0 },
  { platform: "youtube", format: "short", title: "The thumbnail test that doubled our CTR", caption: "We swapped one word. That was it.", days: 10, tags: ["thumbnails", "ctr"], reachBase: 72000, viral: 1.9 },
  { platform: "youtube", format: "video", title: "Hiring your first content strategist", caption: "The role description, the interview loop, and what we paid.", days: 28, tags: ["hiring", "team"], reachBase: 47000, viral: 1.1 },
  { platform: "youtube", format: "short", title: "Retention graphs lie if you skip the first 5%", caption: "Average view duration is not the metric.", days: 50, tags: ["analytics", "retention"], reachBase: 58000, viral: 1.3 },
  { platform: "youtube", format: "video", title: "We spent $40K testing ads. Most of it was wasted.", caption: "Everything that worked, and the four tests we should have skipped.", days: 66, tags: ["ads", "spend", "case-study"], reachBase: 61000, viral: 1.4 },

  // ── X / Twitter ────────────────────────────────────────────────────
  { platform: "twitter", format: "thread", title: "Why your engagement rate dropped (and it is not the algorithm)", caption: "A 10-point thread on the retention curve most teams ignore.", days: 11, tags: ["thread", "engagement"], reachBase: 41000, viral: 1.1 },
  { platform: "twitter", format: "thread", title: "The weekly metrics digest — week 38", caption: "Numbers only, no fluff.", days: 30, tags: ["digest", "metrics"], reachBase: 22000, viral: 0.8 },
  { platform: "twitter", format: "thread", title: "We audited 1,000 captions. Patterns found.", caption: "Short, specific, one idea. The data agrees.", days: 68, tags: ["captions", "data"], reachBase: 19000, viral: 0.9 },
  { platform: "twitter", format: "thread", title: "Hot take: most SaaS accounts post the same thing forever", caption: "Unpopular, but the data backs it.", days: 20, tags: ["takes", "strategy"], reachBase: 34000, viral: 1.3 },
  { platform: "twitter", format: "thread", title: "How we forecast next month from 4 data points", caption: "The model is simple. The discipline is not.", days: 40, tags: ["forecasting", "data"], reachBase: 28000, viral: 1.0 },

  // ── Facebook ───────────────────────────────────────────────────────
  { platform: "facebook", format: "image", title: "Community spotlight: how Studio Norte grew 3x", caption: "A customer story with real numbers.", days: 27, tags: ["case-study", "community"], reachBase: 33000, viral: 0.9 },
  { platform: "facebook", format: "video", title: "Webinar recap: attribution without the guesswork", caption: "Recording and slides available.", days: 61, tags: ["webinar", "attribution"], reachBase: 21000, viral: 0.6 },
  { platform: "facebook", format: "image", title: "New: our autumn menu is live", caption: "Six new single-origin coffees, roasted weekly.", days: 9, tags: ["product", "menu"], reachBase: 28000, viral: 0.8 },
  { platform: "facebook", format: "video", title: "How we roast: from green bean to cup", caption: "A two-minute walk through the roastery.", days: 22, tags: ["process", "coffee"], reachBase: 24000, viral: 0.7 },
  { platform: "facebook", format: "image", title: "Customer story: 12 locations, one sourcing policy", caption: "What changed when we went direct.", days: 48, tags: ["case-study", "sourcing"], reachBase: 19000, viral: 0.6 },
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

/** Reach multiplier relative to the reference account (acc_ig_main). */
function accountScale(account: SocialAccount): number {
  const seed = ACCOUNT_SEEDS[account.id];
  return seed ? seed.reachBase / 98_000 : 1;
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1_000_003;
  }
  return hash;
}

function buildItem(
  account: SocialAccount,
  seed: Seed,
  index: number,
): ContentItem {
  const id = `${account.id}_${String(index + 1).padStart(2, "0")}`;
  const rand = mulberry32(hashSeed(id));

  const scale = accountScale(account);
  const reach = Math.round(
    seed.reachBase * seed.viral * scale * (0.82 + rand() * 0.36),
  );
  const impressions = Math.round(reach * (1.15 + rand() * 0.35));
  const likes = Math.round(reach * (0.028 + rand() * 0.035));
  const comments = Math.round(reach * (0.0022 + rand() * 0.004));
  const shares = Math.round(reach * (0.0035 + rand() * 0.006));
  const saves = Math.round(reach * (0.006 + rand() * 0.011));
  const engagementRate =
    ((likes + comments + shares + saves) / Math.max(impressions, 1)) * 100;

  const ageDecay = Math.max(0.45, 1 - seed.days / 240);

  return {
    id,
    accountId: account.id,
    platform: seed.platform,
    format: seed.format,
    title: seed.title,
    caption: seed.caption,
    thumbnailUrl: null,
    permalink: `https://${seed.platform}.com/${account.handle.replace("@", "")}/${index + 1}`,
    publishedAt: daysAgo(seed.days, -PUBLISH_HOURS[seed.format]),
    status: "published",
    aiScore: Math.round((4.8 + rand() * 4.6) * 10) / 10,
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

function buildLibrary(): ContentItem[] {
  const items: ContentItem[] = [];

  for (const account of socialAccounts) {
    if (!account.connected) continue;

    const seeds = SEEDS.filter((seed) => seed.platform === account.platform);
    seeds.forEach((seed, index) => {
      items.push(buildItem(account, seed, index));
    });
  }

  return items;
}

export const contentItems: ContentItem[] = buildLibrary();

function emptyMetrics(): ContentItem["metrics"] {
  return {
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
  };
}

function pipelineItem(
  account: SocialAccount,
  title: string,
  caption: string,
  status: ContentItem["status"],
  format: ContentItem["format"],
  inDays: number,
  hour: number,
  aiScore: number,
  tags: string[],
): ContentItem {
  return {
    id: `${account.id}_pipe_${Math.random().toString(36).slice(2, 7)}`,
    accountId: account.id,
    platform: account.platform,
    format,
    title,
    caption,
    thumbnailUrl: null,
    permalink: null,
    publishedAt: daysAgo(-inDays, -hour),
    status,
    aiScore,
    tags,
    metrics: emptyMetrics(),
  };
}

export const scheduledContent: ContentItem[] = [
  pipelineItem(
    accountsById()["acc_ig_main"],
    "Draft: the 5-part content system we run on",
    "Publishing tomorrow at 11:00 local.",
    "scheduled",
    "reel",
    1,
    11,
    8.4,
    ["system", "draft"],
  ),
  pipelineItem(
    accountsById()["acc_tt_main"],
    "Draft: reacting to your unhookable first 3 seconds",
    "Needs a thumbnail before it goes out.",
    "needs_review",
    "short",
    3,
    18,
    6.1,
    ["hooks", "review"],
  ),
  pipelineItem(
    accountsById()["acc_yt_main"],
    "Draft: 60-second teardown of a bad hook",
    "Scripted, awaiting final edit.",
    "draft",
    "short",
    6,
    14,
    7.7,
    ["hooks", "shorts"],
  ),
  pipelineItem(
    accountsById()["acc_ig_latam"],
    "Borrador: 5 errores que matan tu alcance",
    "Carrusel en español para la cuenta regional.",
    "scheduled",
    "carousel",
    2,
    10,
    9.1,
    ["errores", "alcance"],
  ),
  pipelineItem(
    accountsById()["acc_tt_latam"],
    "Borrador:respondiendo preguntas de la comunidad",
    "Guion listo, falta grabar.",
    "draft",
    "short",
    4,
    19,
    7.2,
    ["comunidad", "preguntas"],
  ),
  pipelineItem(
    accountsById()["acc_ig_verde"],
    "Borrador: nuovo origen para el café de temporada",
    "Aprobado por el cliente, pendiente de imagen.",
    "needs_review",
    "carousel",
    5,
    9,
    6.8,
    ["producto", "café"],
  ),
];

function accountsById(): Record<AccountId, SocialAccount> {
  return Object.fromEntries(socialAccounts.map((item) => [item.id, item]));
}
