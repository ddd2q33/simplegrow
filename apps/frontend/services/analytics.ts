import type { DashboardOverview } from "@/lib/types";
import {
  analyticsPlatforms,
  buildKpis,
  engagementSeries,
  followersSeries,
  reachByPlatform,
  reachSeries,
  viewsSeries,
} from "@/lib/mock/analytics";
import { contentItems } from "@/lib/mock/content";
import { experiments } from "@/lib/mock/experiments";
import { insights, recommendations } from "@/lib/mock/insights";
import { query } from "@/lib/api";
import type { AnalyticsDetail, DateRangeKey } from "@/lib/types";

export function getOverview(range: DateRangeKey) {
  return query<DashboardOverview>(`/analytics/overview?range=${range}`, () => ({
    range,
    kpis: buildKpis(range),
    followersSeries: followersSeries(range),
    engagementSeries: engagementSeries(range),
    reachByPlatform: reachByPlatform(),
    topContent: [...contentItems]
      .sort((a, b) => b.metrics.reach - a.metrics.reach)
      .slice(0, 5),
    recentInsights: insights.slice(0, 3),
    recommendations: recommendations.filter((item) => item.status === "open").slice(0, 3),
    activeExperiments: experiments.filter((item) => item.status === "running"),
  }));
}

export function getPlatformBreakdown() {
  return query("/analytics/platforms", reachByPlatform);
}

export function getFollowersSeries(range: DateRangeKey) {
  return query(`/analytics/followers?range=${range}`, () => followersSeries(range));
}

export function getEngagementSeries(range: DateRangeKey) {
  return query(`/analytics/engagement?range=${range}`, () => engagementSeries(range));
}

export function getAnalyticsDetail(range: DateRangeKey) {
  return query<AnalyticsDetail>(`/analytics?range=${range}`, () => ({
    range,
    platforms: analyticsPlatforms(range),
    reachSeries: reachSeries(range),
    viewsSeries: viewsSeries(range),
    engagementSeries: engagementSeries(range),
  }));
}
