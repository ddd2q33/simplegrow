import type { Metadata } from "next";
import { OverviewView } from "@/components/dashboard/overview-view";
import { getOverview } from "@/services/analytics";
import { DEFAULT_SCOPE } from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const overview = await getOverview(DEFAULT_SCOPE);

  return <OverviewView initial={overview} initialScope={DEFAULT_SCOPE} />;
}
