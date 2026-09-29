import type { Metadata } from "next";
import { ExperimentsView } from "@/components/dashboard/experiments-view";
import { getExperiments } from "@/services/experiments";

export const metadata: Metadata = { title: "Experiments" };

export default async function ExperimentsPage() {
  const experiments = await getExperiments();

  return <ExperimentsView initial={experiments} />;
}
