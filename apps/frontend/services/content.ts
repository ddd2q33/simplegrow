import type {
  ComposePostInput,
  ContentItem,
  DataScope,
  Platform,
  ScheduledPost,
} from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import { mutate, query, USE_MOCK } from "@/lib/api";
import { workspace } from "@/lib/mock/core";
import { contentItems, scheduledContent } from "@/lib/mock/content";
import { accountsInScope } from "@/lib/mock/accounts";

export interface ContentFilters {
  scope?: DataScope;
  platform?: Platform | "all";
  status?: ContentItem["status"] | "all";
  accountId?: string;
  search?: string;
  sort?: "reach" | "engagement" | "recent" | "score";
}

export interface ContentLibrary {
  items: ContentItem[];
  scheduled: ContentItem[];
  totals: {
    items: number;
    accounts: number;
    reach: number;
    impressions: number;
    avgEngagementRate: number;
    avgAiScore: number;
  };
}

function inScope(item: ContentItem, scope: DataScope | undefined): boolean {
  if (!scope) return true;
  if (scope.accountId !== ALL_ACCOUNTS && item.accountId !== scope.accountId) {
    return false;
  }
  if (scope.platform !== "all" && item.platform !== scope.platform) return false;
  return true;
}

function applyFilters(
  items: ContentItem[],
  filters: ContentFilters,
): ContentItem[] {
  const search = filters.search?.trim().toLowerCase();

  const filtered = items.filter((item) => {
    if (filters.scope && !inScope(item, filters.scope)) return false;
    if (
      filters.accountId &&
      filters.accountId !== "all" &&
      item.accountId !== filters.accountId
    ) {
      return false;
    }
    if (
      filters.platform &&
      filters.platform !== "all" &&
      item.platform !== filters.platform
    ) {
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
    const scheduled = applyFilters([...scheduledContent], {
      ...filters,
      status: "all",
    });
    const reach = items.reduce((sum, item) => sum + item.metrics.reach, 0);
    const impressions = items.reduce((sum, item) => sum + item.metrics.impressions, 0);

    return {
      items,
      scheduled,
      totals: {
        items: items.length,
        accounts: new Set(items.map((item) => item.accountId)).size,
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

export function getScopedAccountIds(scope: DataScope): string[] {
  return accountsInScope(scope).map((account) => account.id);
}

export function getContentItem(id: string) {
  return query<ContentItem | null>(`/content/${id}`, () => {
    const all = [...contentItems, ...scheduledContent];
    return all.find((item) => item.id === id) ?? null;
  });
}

// --------------------------------------------------------------- publishing

/** Shape returned by `GET/POST /social/posts` on the FastAPI backend. */
interface ApiScheduledPost {
  id: string;
  workspace_id: string;
  content: string;
  mode: ScheduledPost["mode"];
  status: ScheduledPost["status"];
  account_ids: string[];
  platforms: ScheduledPost["targets"];
  results: ScheduledPost["results"];
  scheduled_for: string | null;
  timezone: string;
  external_post_id: string | null;
  platform_post_url: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function fromApiPost(row: ApiScheduledPost): ScheduledPost {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    content: row.content,
    mode: row.mode,
    status: row.status,
    accountIds: row.account_ids,
    targets: row.platforms ?? [],
    results: row.results ?? [],
    scheduledFor: row.scheduled_for,
    timezone: row.timezone,
    externalPostId: row.external_post_id,
    platformPostUrl: row.platform_post_url,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** In-memory queue used while `USE_MOCK` is on, so the composer still works. */
let mockQueue: ScheduledPost[] = [];

function mockPost(input: ComposePostInput): ScheduledPost {
  const now = new Date().toISOString();
  return {
    id: `mock_${Math.random().toString(36).slice(2, 10)}`,
    workspaceId: workspace.id,
    content: input.content,
    mode: input.mode,
    status:
      input.mode === "now"
        ? "published"
        : input.mode === "schedule"
          ? "scheduled"
          : "draft",
    accountIds: input.accountIds,
    targets: input.accountIds.map((accountId) => ({
      platform: "instagram" as Platform,
      account_id: accountId,
      handle: accountId,
      external_id: null,
    })),
    results: [],
    scheduledFor: input.scheduledFor ?? null,
    timezone: input.timezone ?? "UTC",
    externalPostId: null,
    platformPostUrl: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function listScheduledPosts() {
  return query<ApiScheduledPost[]>(
    `/social/posts?workspace_id=${encodeURIComponent(workspace.id)}`,
    () => mockQueue as unknown as ApiScheduledPost[],
  ).then((rows) => (USE_MOCK ? (rows as unknown as ScheduledPost[]) : rows.map(fromApiPost)));
}

export function createPost(input: ComposePostInput) {
  return mutate<ApiScheduledPost | ScheduledPost>(
    "/social/posts",
    () => {
      const created = mockPost(input);
      mockQueue = [created, ...mockQueue];
      return created;
    },
    {
      method: "POST",
      body: {
        workspace_id: workspace.id,
        content: input.content,
        account_ids: input.accountIds,
        mode: input.mode,
        scheduled_for: input.scheduledFor ?? null,
        timezone: input.timezone ?? "UTC",
      },
    },
  ).then((row) => (USE_MOCK ? (row as ScheduledPost) : fromApiPost(row as ApiScheduledPost)));
}

export function deleteScheduledPost(id: string) {
  return mutate<undefined>(
    `/social/posts/${id}`,
    () => {
      mockQueue = mockQueue.filter((post) => post.id !== id);
      return undefined;
    },
    { method: "DELETE" },
  );
}
