import type { Metadata } from "next";
import { SettingsView } from "@/components/dashboard/settings-view";
import { getIntegrations } from "@/services/workspace";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const integrations = await getIntegrations();

  return <SettingsView initial={integrations} />;
}
