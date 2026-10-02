import { query } from "@/lib/api";
import type { DataScope, Insight } from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import { buildAudienceOverview } from "@/lib/mock/audience";
import { insightsInScope } from "@/lib/mock/insights";

function scopeParams(scope: DataScope): string {
  const params = new URLSearchParams({ range: scope.range });
  if (scope.accountId !== ALL_ACCOUNTS) params.set("account_id", scope.accountId);
  if (scope.platform !== "all") params.set("platform", scope.platform);
  return params.toString();
}

export function getAudienceOverview(scope: DataScope) {
  return query(`/audience/overview?${scopeParams(scope)}`, () =>
    buildAudienceOverview(scope),
  );
}

export function getInsights(scope: DataScope) {
  return query<Insight[]>(`/insights?${scopeParams(scope)}`, () =>
    insightsInScope(scope),
  );
}
