export type Platform = "instagram" | "tiktok" | "youtube" | "twitter" | "facebook";

export type DateRangeKey = "7d" | "30d" | "90d";

export type MetricKey =
  | "followers"
  | "reach"
  | "impressions"
  | "engagement"
  | "views"
  | "clicks";

export type ContentFormat = "reel" | "carousel" | "short" | "video" | "image" | "thread" | "story";

export type ContentStatus = "published" | "scheduled" | "draft" | "needs_review";

export type ExperimentStatus = "running" | "completed" | "draft" | "paused";

export type ReportStatus = "ready" | "generating" | "failed";

export type InsightCategory = "audience" | "content" | "timing" | "cadence" | "conversion";

export type Priority = "high" | "medium" | "low";

export type UserRole = "owner" | "admin" | "editor" | "viewer";

export type PlanTier = "free" | "starter" | "growth" | "agency";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  timezone: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  initials: string;
  role: UserRole;
  avatarUrl: string | null;
  workspaceId: string;
  createdAt: string;
}

export interface SocialAccount {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  connected: boolean;
  status: "active" | "syncing" | "error" | "disconnected";
  followers: number;
  connectedAt: string;
  lastSyncAt: string;
  scopes: string[];
}

export type MetricPoint = {
  date: string;
  value: number;
  previous: number;
};

export interface Kpi {
  key: MetricKey;
  label: string;
  value: number;
  previousValue: number;
  changePct: number;
  format: "compact" | "percent" | "number" | "duration";
  sparkline: number[];
  platform: Platform | "all";
}

export interface PlatformBreakdown {
  platform: Platform;
  followers: number;
  followersChangePct: number;
  reach: number;
  engagementRate: number;
  sharePct: number;
}

export interface DashboardOverview {
  range: DateRangeKey;
  kpis: Kpi[];
  followersSeries: MetricPoint[];
  engagementSeries: MetricPoint[];
  reachByPlatform: PlatformBreakdown[];
  topContent: ContentItem[];
  recentInsights: Insight[];
  recommendations: Recommendation[];
  activeExperiments: Experiment[];
}

export interface ContentMetrics {
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  watchTimeSec: number;
  avgViewPct: number;
}

export interface ContentItem {
  id: string;
  platform: Platform;
  format: ContentFormat;
  title: string;
  caption: string;
  thumbnailUrl: string | null;
  permalink: string | null;
  publishedAt: string;
  status: ContentStatus;
  aiScore: number;
  tags: string[];
  metrics: ContentMetrics;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  size: number;
  sharePct: number;
  growthPct: number;
  engagementRate: number;
  avgAge: number;
}

export interface AudienceActivityWindow {
  day: string;
  hour: number;
  value: number;
}

export interface AudienceOverview {
  range: DateRangeKey;
  totalFollowers: number;
  totalFollowersChangePct: number;
  newFollowers: number;
  unfollows: number;
  netFollowers: number;
  medianAge: number;
  topCountries: { country: string; code: string; sharePct: number; followers: number }[];
  genderSplit: { label: string; pct: number }[];
  segments: AudienceSegment[];
  activityHeatmap: AudienceActivityWindow[];
  growthSeries: MetricPoint[];
}

export interface Insight {
  id: string;
  category: InsightCategory;
  title: string;
  detail: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  platform: Platform | "all";
  createdAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  category: InsightCategory;
  priority: Priority;
  estimatedImpactPct: number;
  effort: "low" | "medium" | "high";
  platform: Platform | "all";
  status: "open" | "applied" | "dismissed";
  createdAt: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  trafficPct: number;
  impressions: number;
  conversions: number;
  rate: number;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  platform: Platform;
  status: ExperimentStatus;
  primaryMetric: string;
  confidence: number;
  startedAt: string;
  endedAt: string | null;
  winnerVariantId: string | null;
  variants: ExperimentVariant[];
  aiVerdict: string | null;
}

export interface Report {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  format: "pdf" | "csv" | "xlsx";
  status: ReportStatus;
  createdAt: string;
  sizeBytes: number;
  downloadUrl: string | null;
  sections: string[];
}

export interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface AnalyticsPlatformRow {
  platform: Platform;
  followers: number;
  followersChangePct: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  sharePct: number;
}

export interface AnalyticsDetail {
  range: DateRangeKey;
  platforms: AnalyticsPlatformRow[];
  reachSeries: MetricPoint[];
  viewsSeries: MetricPoint[];
  engagementSeries: MetricPoint[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: "insight" | "experiment" | "report" | "system";
}
