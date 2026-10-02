import type { Metadata } from "next";
import { ExperimentsView } from "@/components/dashboard/experiments-view";
import { getExperiments } from "@/services/experiments";
import { DEFAULT_SCOPE } from "@/lib/types";

export const metadata: Metadata = { title: "Experiments" };

export default async function ExperimentsPage() {
  const experiments = await getExperiments(DEFAULT_SCOPE);

  return <ExperimentsView initial={experiments} />;
}
