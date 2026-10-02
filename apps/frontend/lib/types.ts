export type Platform = "instagram" | "tiktok" | "youtube" | "twitter" | "facebook";

export type DateRangeKey = "7d" | "30d" | "90d";

export type MetricKey =
  | "followers"
  | "reach"
  | "impressions"
  | "engagement"
  | "views"
  | "clicks";

export type ContentFormat =
  | "reel"
  | "carousel"
  | "short"
  | "video"
  | "image"
  | "thread"
  | "story";

export type ContentStatus = "published" | "scheduled" | "draft" | "needs_review";

export type ExperimentStatus = "running" | "completed" | "draft" | "paused";

export type ReportStatus = "ready" | "generating" | "failed";

export type InsightCategory =
  | "audience"
  | "content"
  | "timing"
  | "cadence"
  | "conversion";

export type Priority = "high" | "medium" | "low";

export type UserRole = "owner" | "admin" | "editor" | "viewer";

export type PlanTier = "free" | "starter" | "growth" | "agency";

export type AccountType = "business" | "creator" | "page" | "channel";

export type AccountStatus = "active" | "syncing" | "error" | "disconnected";

export type AccountId = string;
export type AccountGroupId = string;

/** Sentinel used by every scope-aware query to mean "no account filter". */
export const ALL_ACCOUNTS = "all" as const;

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  timezone: string;
  accountLimit: number;
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

/** A workspace can hold many accounts, grouped by brand, client or region. */
export interface AccountGroup {
  id: AccountGroupId;
  name: string;
  description: string;
  color: string;
}

export interface SocialAccount {
  id: AccountId;
  platform: Platform;
  groupId: AccountGroupId;
  accountType: AccountType;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  connected: boolean;
  status: AccountStatus;
  followers: number;
  followersChangePct: number;
  connectedAt: string;
  lastSyncAt: string;
  scopes: string[];
}

/** Lightweight account projection embedded in rows and insights. */
export interface AccountRef {
  id: AccountId;
  platform: Platform;
  groupId: AccountGroupId;
  handle: string;
  displayName: string;
}

export interface DataScope {
  range: DateRangeKey;
  accountId: AccountId | typeof ALL_ACCOUNTS;
  platform: Platform | "all";
}

export const DEFAULT_SCOPE: DataScope = {
  range: "30d",
  accountId: ALL_ACCOUNTS,
  platform: "all",
};

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
  impressions: number;
  engagementRate: number;
  sharePct: number;
  accountCount: number;
}

export interface AccountBreakdown {
  accountId: AccountId;
  platform: Platform;
  handle: string;
  displayName: string;
  followers: number;
  followersChangePct: number;
  reach: number;
  views: number;
  impressions: number;
  engagementRate: number;
  sharePct: number;
}

export interface DashboardOverview {
  range: DateRangeKey;
  scopeLabel: string;
  accountCount: number;
  kpis: Kpi[];
  followersSeries: MetricPoint[];
  engagementSeries: MetricPoint[];
  reachSeries: MetricPoint[];
  reachByPlatform: PlatformBreakdown[];
  accountBreakdown: AccountBreakdown[];
  topContent: ContentItem[];
  recentInsights: Insight[];
  recommendations: Recommendation[];
  activeExperiments: Experiment[];
}

export interface AnalyticsDetail {
  range: DateRangeKey;
  scopeLabel: string;
  platforms: PlatformBreakdown[];
  accounts: AccountBreakdown[];
  reachSeries: MetricPoint[];
  viewsSeries: MetricPoint[];
  engagementSeries: MetricPoint[];
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
  accountId: AccountId;
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
  scopeLabel: string;
  accountCount: number;
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
  accountId: AccountId | null;
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
  accountId: AccountId | null;
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
  accountId: AccountId;
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
  accountId: AccountId | null;
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

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: "insight" | "experiment" | "report" | "system";
}

/** How a composed post reaches the networks. */
export type PostMode = "now" | "schedule" | "draft";

export type ScheduledPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial"
  | "failed";

export interface ScheduledPostTarget {
  platform: Platform;
  account_id: string;
  handle: string;
  external_id: string | null;
}

export interface ScheduledPostResult {
  platform: Platform;
  account_id: string | null;
  status: string | null;
  url: string | null;
  error: string | null;
}

/** A row in the local publishing queue, backed by `POST/GET /social/posts`. */
export interface ScheduledPost {
  id: string;
  workspaceId: string;
  content: string;
  mode: PostMode;
  status: ScheduledPostStatus;
  accountIds: string[];
  targets: ScheduledPostTarget[];
  results: ScheduledPostResult[];
  scheduledFor: string | null;
  timezone: string;
  externalPostId: string | null;
  platformPostUrl: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComposePostInput {
  content: string;
  accountIds: string[];
  mode: PostMode;
  scheduledFor?: string | null;
  timezone?: string;
}
