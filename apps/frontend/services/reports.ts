import type { Report } from "@/lib/types";
import { mutate, query } from "@/lib/api";
import { reports as seedReports } from "@/lib/mock/experiments";

let store: Report[] | null = null;

function reports(): Report[] {
  store ??= structuredClone(seedReports);
  return store;
}

export function getReports() {
  return query<Report[]>("/reports", () => reports());
}

export interface GenerateReportInput {
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
