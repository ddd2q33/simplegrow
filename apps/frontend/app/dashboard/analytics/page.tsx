import type { Metadata } from "next";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { getAnalyticsDetail } from "@/services/analytics";
import { DEFAULT_SCOPE } from "@/lib/types";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const detail = await getAnalyticsDetail(DEFAULT_SCOPE);

  return <AnalyticsView initial={detail} initialScope={DEFAULT_SCOPE} />;
}
