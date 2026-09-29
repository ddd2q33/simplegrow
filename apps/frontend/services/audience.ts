import type { DateRangeKey } from "@/lib/types";
import { query } from "@/lib/api";
import { buildAudienceOverview } from "@/lib/mock/audience";
import { insights } from "@/lib/mock/insights";

export function getAudienceOverview(range: DateRangeKey) {
  return query(`/audience/overview?range=${range}`, () =>
    buildAudienceOverview(range),
  );
}

export function getInsights() {
  return query("/insights", () => insights);
}
