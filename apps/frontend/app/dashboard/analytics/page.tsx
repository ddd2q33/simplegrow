import type { Metadata } from "next";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { getAnalyticsDetail } from "@/services/analytics";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const detail = await getAnalyticsDetail("30d");

  return <AnalyticsView initial={detail} />;
}
