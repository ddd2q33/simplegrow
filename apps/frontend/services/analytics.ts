import { query } from "@/lib/api";
import type { AnalyticsDetail, DashboardOverview, DataScope } from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import {
  accountBreakdown,
  buildKpis,
  buildScopeSeries,
  platformBreakdown,
} from "@/lib/mock/analytics";
import { contentItems } from "@/lib/mock/content";
import { experimentsInScope } from "@/lib/mock/experiments";
import { insightsInScope, recommendationsInScope } from "@/lib/mock/insights";
import { accountsInScope, getAccount } from "@/lib/mock/accounts";

function scopeParams(scope: DataScope): string {
  const params = new URLSearchParams({ range: scope.range });
  if (scope.accountId !== ALL_ACCOUNTS) params.set("account_id", scope.accountId);
  if (scope.platform !== "all") params.set("platform", scope.platform);
  return params.toString();
}

function scopeLabelFor(scope: DataScope): string {
  if (scope.accountId !== ALL_ACCOUNTS) {
    return getAccount(scope.accountId)?.displayName ?? "Unknown account";
  }
  if (scope.platform !== "all") return `All ${scope.platform} accounts`;
  return "All accounts";
}

/** Content rows belonging to the scoped accounts, top reach first. */
function scopedContent(scope: DataScope) {
  const accounts = new Set(accountsInScope(scope).map((account) => account.id));
  return contentItems
    .filter((item) => accounts.has(item.accountId))
    .sort((a, b) => b.metrics.reach - a.metrics.reach);
}

export function getOverview(scope: DataScope) {
  const series = buildScopeSeries(scope);

  return query<DashboardOverview>(
    `/analytics/overview?${scopeParams(scope)}`,
    () => ({
      range: scope.range,
      scopeLabel: scopeLabelFor(scope),
      accountCount: series.accounts.length,
      kpis: buildKpis(scope, series),
      followersSeries: series.followers,
      engagementSeries: series.engagement,
      reachSeries: series.reach,
      reachByPlatform: platformBreakdown(scope),
      accountBreakdown: accountBreakdown(scope),
      topContent: scopedContent(scope).slice(0, 5),
      recentInsights: insightsInScope(scope).slice(0, 3),
      recommendations: recommendationsInScope(scope)
        .filter((item) => item.status === "open")
        .slice(0, 3),
      activeExperiments: experimentsInScope(scope).filter(
        (item) => item.status === "running",
      ),
    }),
  );
}

export function getAccountBreakdown(scope: DataScope) {
  return query(`/analytics/accounts?${scopeParams(scope)}`, () =>
    accountBreakdown(scope),
  );
}

export function getPlatformBreakdown(scope: DataScope) {
  return query(`/analytics/platforms?${scopeParams(scope)}`, () =>
    platformBreakdown(scope),
  );
}

export function getAnalyticsDetail(scope: DataScope) {
  const series = buildScopeSeries(scope);

  return query<AnalyticsDetail>(`/analytics?${scopeParams(scope)}`, () => ({
    range: scope.range,
    scopeLabel: scopeLabelFor(scope),
    platforms: platformBreakdown(scope),
    accounts: accountBreakdown(scope),
    reachSeries: series.reach,
    viewsSeries: series.views,
    engagementSeries: series.engagement,
  }));
}
