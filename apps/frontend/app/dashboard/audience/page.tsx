import type { Metadata } from "next";
import { AudienceView } from "@/components/dashboard/audience-view";
import { getAudienceOverview } from "@/services/audience";
import { DEFAULT_SCOPE } from "@/lib/types";

export const metadata: Metadata = { title: "Audience" };

export default async function AudiencePage() {
  const audience = await getAudienceOverview(DEFAULT_SCOPE);

  return <AudienceView initial={audience} initialScope={DEFAULT_SCOPE} />;
}
