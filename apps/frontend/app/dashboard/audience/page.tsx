import type { Metadata } from "next";
import { AudienceView } from "@/components/dashboard/audience-view";
import { getAudienceOverview } from "@/services/audience";

export const metadata: Metadata = { title: "Audience" };

export default async function AudiencePage() {
  const audience = await getAudienceOverview("30d");

  return <AudienceView initial={audience} />;
}
