import type { AccountId, DataScope, Report } from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import { mutate, query } from "@/lib/api";
import { reports as seedReports, reportsInScope } from "@/lib/mock/experiments";

let store: Report[] | null = null;

function reports(): Report[] {
  store ??= structuredClone(seedReports);
  return store;
}

function scopeParams(scope: DataScope): string {
  const params = new URLSearchParams({ range: scope.range });
  if (scope.accountId !== ALL_ACCOUNTS) params.set("account_id", scope.accountId);
  if (scope.platform !== "all") params.set("platform", scope.platform);
  return params.toString();
}

export function getReports(scope: DataScope) {
  return query<Report[]>(`/reports?${scopeParams(scope)}`, () => {
    const visible = new Set(reportsInScope(scope).map((item) => item.id));
    return reports().filter((item) => visible.has(item.id));
  });
}

export interface GenerateReportInput {
  accountId: AccountId | typeof ALL_ACCOUNTS;
  name: string;
  periodStart: string;
  periodEnd: string;
  format: Report["format"];
  sections: string[];
}

/** Prototype behaviour: create the row as `generating`, then flip it to `ready`. */
export function generateReport(input: GenerateReportInput) {
  return mutate<Report>(
    "/reports",
    () => {
      const report: Report = {
        id: `rpt_${Math.random().toString(36).slice(2, 8)}`,
        accountId: input.accountId === ALL_ACCOUNTS ? null : input.accountId,
        name: input.name,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        format: input.format,
        status: "generating",
        createdAt: new Date().toISOString(),
        sizeBytes: 0,
        downloadUrl: null,
        sections: input.sections,
      };

      reports().unshift(report);

      setTimeout(() => {
        const stored = reports().find((item) => item.id === report.id);
        if (!stored) return;
        stored.status = "ready";
        stored.sizeBytes = 1_800_000 + Math.round(Math.random() * 1_400_000);
        stored.downloadUrl = `/api/reports/${report.id}/download`;
      }, 4000);

      return report;
    },
    { method: "POST", body: input },
  );
}

export function deleteReport(id: string) {
  return mutate<{ id: string }>(
    `/reports/${id}`,
    () => {
      const list = reports();
      const index = list.findIndex((item) => item.id === id);
      if (index >= 0) list.splice(index, 1);
      return { id };
    },
    { method: "DELETE" },
  );
}
