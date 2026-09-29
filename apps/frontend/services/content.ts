import type { ContentItem, Platform } from "@/lib/types";
import { query } from "@/lib/api";
import { contentItems, scheduledContent } from "@/lib/mock/content";

export interface ContentFilters {
  platform?: Platform | "all";
  status?: ContentItem["status"] | "all";
  search?: string;
  sort?: "reach" | "engagement" | "recent" | "score";
}

export interface ContentLibrary {
  items: ContentItem[];
  scheduled: ContentItem[];
  totals: {
    items: number;
    reach: number;
    impressions: number;
    avgEngagementRate: number;
    avgAiScore: number;
  };
}

function applyFilters(items: ContentItem[], filters: ContentFilters): ContentItem[] {
  const search = filters.search?.trim().toLowerCase();

  const filtered = items.filter((item) => {
    if (filters.platform && filters.platform !== "all" && item.platform !== filters.platform) {
      return false;
    }
    if (filters.status && filters.status !== "all" && item.status !== filters.status) {
      return false;
    }
    if (search) {
      const haystack = `${item.title} ${item.caption} ${item.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  switch (filters.sort) {
    case "engagement":
      return filtered.sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate);
    case "score":
      return filtered.sort((a, b) => b.aiScore - a.aiScore);
    case "recent":
      return filtered.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    default:
      return filtered.sort((a, b) => b.metrics.reach - a.metrics.reach);
  }
}

export function getContentLibrary(filters: ContentFilters = {}) {
  return query<ContentLibrary>("/content", () => {
    const items = applyFilters([...contentItems], filters);
    const reach = items.reduce((sum, item) => sum + item.metrics.reach, 0);
    const impressions = items.reduce((sum, item) => sum + item.metrics.impressions, 0);

    return {
      items,
      scheduled: scheduledContent,
      totals: {
        items: items.length,
        reach,
        impressions,
        avgEngagementRate:
          items.length === 0
            ? 0
            : items.reduce((sum, item) => sum + item.metrics.engagementRate, 0) /
              items.length,
        avgAiScore:
          items.length === 0
            ? 0
            : Math.round(
                (items.reduce((sum, item) => sum + item.aiScore, 0) / items.length) * 10,
              ) / 10,
      },
    };
  });
}

export function getContentItem(id: string) {
  return query<ContentItem | null>(`/content/${id}`, () => {
    const all = [...contentItems, ...scheduledContent];
    return all.find((item) => item.id === id) ?? null;
  });
}
