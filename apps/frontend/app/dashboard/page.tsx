import type { Metadata } from "next";
import { OverviewView } from "@/components/dashboard/overview-view";
import { getOverview } from "@/services/analytics";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const overview = await getOverview("30d");

  return <OverviewView initial={overview} />;
}
