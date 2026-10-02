import type { Metadata } from "next";
import { ContentView } from "@/components/dashboard/content-view";
import { getContentLibrary } from "@/services/content";
import { DEFAULT_SCOPE } from "@/lib/types";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  const library = await getContentLibrary({
    scope: DEFAULT_SCOPE,
    platform: "all",
    status: "all",
    search: "",
    sort: "reach",
  });

  return <ContentView initial={library} initialScope={DEFAULT_SCOPE} />;
}
