import type { Metadata } from "next";
import { ReportsView } from "@/components/dashboard/reports-view";
import { getReports } from "@/services/reports";
import { DEFAULT_SCOPE } from "@/lib/types";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const reports = await getReports(DEFAULT_SCOPE);

  return <ReportsView initial={reports} />;
}
