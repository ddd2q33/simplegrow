import type { Metadata } from "next";
import { ContentView } from "@/components/dashboard/content-view";
import { getContentLibrary } from "@/services/content";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  const library = await getContentLibrary({
    platform: "all",
    status: "all",
    search: "",
    sort: "reach",
  });

  return <ContentView initial={library} />;
}
