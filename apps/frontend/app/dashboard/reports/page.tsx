import type { Metadata } from "next";
import { ReportsView } from "@/components/dashboard/reports-view";
import { getReports } from "@/services/reports";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const reports = await getReports();

  return <ReportsView initial={reports} />;
}
