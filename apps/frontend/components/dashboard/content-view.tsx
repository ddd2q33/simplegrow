"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Clapperboard,
  Download,
  ExternalLink,
  Images,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Square,
  Trash2,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { PostComposer } from "@/components/dashboard/post-composer";
import { useDashboardFilters } from "@/components/dashboard/filters";
import { ScopeBanner } from "@/components/dashboard/scope-banner";
import { getContentLibrary, listScheduledPosts, deleteScheduledPost } from "@/services/content";
import type { ContentFilters, ContentLibrary } from "@/services/content";
import { USE_MOCK } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { accountGroups, accountsInScope, getAccount, socialAccounts } from "@/lib/mock/accounts";
import {
  formatCompact,
  formatDuration,
  formatNumber,
  formatPercent,
  formatShortDate,
} from "@/lib/utils";
import { ALL_ACCOUNTS } from "@/lib/types";
import type {
  ContentFormat,
  ContentItem,
  ContentStatus,
  DataScope,
  Platform,
  ScheduledPost,
  ScheduledPostStatus,
} from "@/lib/types";

const ROWS_PER_PAGE = 25;

const FORMAT_ICON: Record<ContentFormat, LucideIcon> = {
  reel: Clapperboard,
  carousel: LayoutGrid,
  short: Zap,
  video: Play,
  image: Images,
  thread: MessageSquare,
  story: Square,
};

const STATUS_VARIANT: Record<
  ContentStatus,
  "success" | "warning" | "secondary" | "default"
> = {
  published: "success",
  scheduled: "default",
  needs_review: "warning",
  draft: "secondary",
};

export function ContentView({
  initial,
  initialScope,
}: {
  initial: ContentLibrary;
  initialScope: DataScope;
}) {
  const { scope } = useDashboardFilters();
  const [library, setLibrary] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [visibleRows, setVisibleRows] = useState(ROWS_PER_PAGE);
  const [filters, setFilters] = useState<ContentFilters>({
    platform: "all",
    status: "all",
    accountId: initialScope.accountId,
    search: "",
    sort: "reach",
  });
  const [composerOpen, setComposerOpen] = useState(false);
  const [queue, setQueue] = useState<ScheduledPost[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);

  const loadQueue = useCallback(() => {
    setQueueLoading(true);
    setQueueError(null);
    return listScheduledPosts()
      .then((rows) => setQueue(rows))
      .catch((caught: unknown) => {
        setQueueError(caught instanceof Error ? caught.message : "Failed to load queue");
      })
      .finally(() => setQueueLoading(false));
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function removeFromQueue(id: string) {
    setQueue((current) => current.filter((post) => post.id !== id));
    try {
      await deleteScheduledPost(id);
    } catch {
      void loadQueue();
    }
  }

  const effectiveFilters = useMemo<ContentFilters>(
    () => ({ ...filters, scope }),
    [filters, scope],
  );

  const filterKey = useMemo(
    () =>
      `${scope.range}|${scope.accountId}|${scope.platform}|${filters.accountId}|${filters.platform}|${filters.status}|${filters.search}|${filters.sort}`,
    [
      scope.range,
      scope.accountId,
      scope.platform,
      filters.accountId,
      filters.platform,
      filters.status,
      filters.search,
      filters.sort,
    ],
  );

  useEffect(() => {
    setVisibleRows(ROWS_PER_PAGE);
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getContentLibrary(effectiveFilters)
      .then((next) => {
        if (!cancelled) setLibrary(next);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to load content");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const showAccountColumn = scope.accountId === ALL_ACCOUNTS;
  const visibleItems = library.items.slice(0, visibleRows);
  const hasMore = library.items.length > visibleRows;

  function exportLibrary() {
    downloadCsv(
      "simplegrow-content.csv",
      library.items.map((item) => ({
        published_at: item.publishedAt,
        account: getAccount(item.accountId)?.handle ?? item.accountId,
        platform: item.platform,
        format: item.format,
        title: item.title,
        reach: item.metrics.reach,
        impressions: item.metrics.impressions,
        views: item.metrics.views,
        likes: item.metrics.likes,
        comments: item.metrics.comments,
        shares: item.metrics.shares,
        saves: item.metrics.saves,
        engagement_rate: item.metrics.engagementRate,
        ai_score: item.aiScore,
      })),
    );
  }

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <PageHeader
        title="Content"
        description="Every post scored by the AI engine, ranked by what it achieved."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportLibrary} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setComposerOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New post
            </Button>
          </>
        }
      />

      <ScopeBanner
        scope={scope}
        accountCount={library.totals.accounts}
        totalFollowers={accountsInScope(scope).reduce(
          (sum, account) => sum + account.followers,
          0,
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Items" value={formatNumber(library.totals.items)} />
        <Tile label="Accounts" value={formatNumber(library.totals.accounts)} />
        <Tile label="Total reach" value={formatCompact(library.totals.reach)} />
        <Tile label="Total impressions" value={formatCompact(library.totals.impressions)} />
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Search titles, captions and tags"
            className="h-8 pl-8 text-xs"
            aria-label="Search content"
          />
        </div>

        <Select
          value={filters.platform}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              platform: event.target.value as Platform | "all",
            }))
          }
          className="h-8 w-40 text-xs"
          aria-label="Platform"
        >
          <option value="all">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="twitter">X / Twitter</option>
          <option value="facebook">Facebook</option>
        </Select>

        {showAccountColumn ? (
          <Select
            value={filters.accountId ?? ALL_ACCOUNTS}
            onChange={(event) =>
              setFilters((current) => ({ ...current, accountId: event.target.value }))
            }
            className="h-8 w-52 text-xs"
            aria-label="Account"
          >
            <option value={ALL_ACCOUNTS}>All accounts</option>
            {accountGroups.map((group) => (
              <optgroup key={group.id} label={group.name}>
                {socialAccounts
                  .filter((account) => account.groupId === group.id)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.handle}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        ) : null}

        <Select
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value as ContentStatus | "all",
            }))
          }
          className="h-8 w-36 text-xs"
          aria-label="Status"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="needs_review">Needs review</option>
          <option value="draft">Draft</option>
        </Select>

        <Select
          value={filters.sort}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              sort: event.target.value as ContentFilters["sort"],
            }))
          }
          className="h-8 w-40 text-xs"
          aria-label="Sort by"
        >
          <option value="reach">Sort: Reach</option>
          <option value="engagement">Sort: Engagement</option>
          <option value="score">Sort: AI score</option>
          <option value="recent">Sort: Most recent</option>
        </Select>
      </Card>

      {error ? (
        <Card className="flex items-center gap-2 border-destructive/40 p-4 text-xs text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        {library.items.length === 0 ? (
          <EmptyState
            icon={<Search className="h-4 w-4" />}
            title="No content matches these filters"
            description="Try a different platform, status or search term."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({
                    platform: "all",
                    status: "all",
                    accountId: ALL_ACCOUNTS,
                    search: "",
                    sort: "reach",
                  });
                  setVisibleRows(ROWS_PER_PAGE);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <Table>
              <THead>
                <TR>
                  <TH>Content</TH>
                  {showAccountColumn ? <TH>Account</TH> : null}
                  <TH className="text-right">Reach</TH>
                  <TH className="text-right">Views</TH>
                  <TH className="text-right">Engagement</TH>
                  <TH className="text-right">Watch</TH>
                  <TH className="w-28">AI score</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {visibleItems.map((item) => {
                  const Icon = FORMAT_ICON[item.format];
                  return (
                    <TR
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(item)}
                    >
                      <TD className="max-w-md">
                        <div className="flex items-start gap-3">
                          <PlatformBadge platform={item.platform} size="sm" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-xs font-medium">
                              <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {item.format} · {formatShortDate(item.publishedAt)}
                            </p>
                          </div>
                        </div>
                      </TD>
                      {showAccountColumn ? (
                        <TD>
                          <span className="block max-w-[10rem] truncate text-[11px] text-muted-foreground">
                            {getAccount(item.accountId)?.handle ?? "—"}
                          </span>
                        </TD>
                      ) : null}
                      <TD className="text-right tabular-nums">
                        {formatCompact(item.metrics.reach)}
                      </TD>
                    <TD className="text-right tabular-nums text-muted-foreground">
                      {item.metrics.views === 0 ? "—" : formatCompact(item.metrics.views)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatPercent(item.metrics.engagementRate, 2)}
                    </TD>
                    <TD className="text-right tabular-nums text-muted-foreground">
                      {item.metrics.watchTimeSec === 0
                        ? "—"
                        : formatDuration(item.metrics.watchTimeSec)}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={item.aiScore * 10}
                          barClassName={
                            item.aiScore >= 8
                              ? "bg-success"
                              : item.aiScore >= 6
                                ? "bg-warning"
                                : "bg-muted-foreground"
                          }
                        />
                        <span className="w-7 shrink-0 text-right text-[11px] tabular-nums">
                          {item.aiScore.toFixed(1)}
                        </span>
                      </div>
                    </TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="icon" aria-label="Open details">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        {hasMore ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
            <span>
              Showing {visibleRows} of {formatNumber(library.items.length)} items
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleRows((rows) => rows + ROWS_PER_PAGE)}
            >
              Load {Math.min(ROWS_PER_PAGE, library.items.length - visibleRows)} more
            </Button>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-col gap-4">
        {USE_MOCK ? (
          <Card>
            <CardHeader>
              <CardTitle>In the pipeline</CardTitle>
              <CardDescription>Scheduled, in review and drafted content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {library.scheduled.map((item) => (
                  <PipelineCard key={item.id} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Publishing queue</CardTitle>
                <CardDescription>Composed here and sent to Zernio</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadQueue()}
                disabled={queueLoading}
                className="gap-1.5"
              >
                {queueLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {queueError ? (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                  {queueError}
                </p>
              ) : queue.length === 0 ? (
                <EmptyState
                  icon={<Send className="h-4 w-4" />}
                  title="Nothing queued yet"
                  description="Use New post to publish or schedule to a connected account."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {queue.map((post) => (
                    <QueueCard
                      key={post.id}
                      post={post}
                      onDelete={() => void removeFromQueue(post.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={() => {
          void loadQueue();
        }}
      />

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        description={
          selected
            ? `${getAccount(selected.accountId)?.handle ?? "—"} · ${selected.format} · ${selected.platform}`
            : undefined
        }
        footer={
          selected?.permalink ? (
            <a
              href={selected.permalink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-muted"
            >
              Open post
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null
        }
      >
        {selected ? <ContentDetail item={selected} /> : null}
      </Dialog>
    </div>
  );
}

function ContentDetail({ item }: { item: ContentItem }) {
  const stats: [string, string][] = [
    ["Impressions", formatNumber(item.metrics.impressions)],
    ["Reach", formatNumber(item.metrics.reach)],
    ["Views", formatNumber(item.metrics.views)],
    ["Likes", formatNumber(item.metrics.likes)],
    ["Comments", formatNumber(item.metrics.comments)],
    ["Shares", formatNumber(item.metrics.shares)],
    ["Saves", formatNumber(item.metrics.saves)],
    ["Avg view", `${item.metrics.avgViewPct}%`],
    ["Watch time", formatDuration(item.metrics.watchTimeSec)],
    ["Engagement", formatPercent(item.metrics.engagementRate, 2)],
  ];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs leading-relaxed text-muted-foreground">{item.caption}</p>

      <div className="flex flex-wrap items-center gap-2">
        {item.tags.map((tag) => (
          <Badge key={tag} variant="secondary" size="sm">
            #{tag}
          </Badge>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold">AI score</p>
        <div className="flex items-center gap-3">
          <Progress
            value={item.aiScore * 10}
            barClassName={
              item.aiScore >= 8 ? "bg-success" : item.aiScore >= 6 ? "bg-warning" : "bg-muted-foreground"
            }
          />
          <span className="text-sm font-semibold tabular-nums">
            {item.aiScore.toFixed(1)}
          </span>
          <span className="text-[11px] text-muted-foreground">/ 10</span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="text-xs font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PipelineCard({ item }: { item: ContentItem }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <PlatformBadge platform={item.platform} size="sm" />
        <span className="truncate text-[11px] text-muted-foreground">
          {getAccount(item.accountId)?.handle ?? "—"}
        </span>
        <Badge variant={STATUS_VARIANT[item.status]} size="sm">
          {item.status.replace("_", " ")}
        </Badge>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {formatShortDate(item.publishedAt)}
        </span>
      </div>
      <p className="text-xs font-medium">{item.title}</p>
      <p className="text-[11px] text-muted-foreground">{item.caption}</p>
      <div className="mt-auto flex items-center gap-2">
        <Progress
          value={item.aiScore * 10}
          barClassName={item.aiScore >= 8 ? "bg-success" : "bg-warning"}
        />
        <span className="shrink-0 text-[11px] tabular-nums">
          {item.aiScore.toFixed(1)}
        </span>
      </div>
    </Card>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

const QUEUE_VARIANT: Record<
  ScheduledPostStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  scheduled: "default",
  publishing: "warning",
  published: "success",
  partial: "warning",
  failed: "destructive",
};

function QueueCard({ post, onDelete }: { post: ScheduledPost; onDelete: () => void }) {
  const platforms = Array.from(new Set(post.targets.map((target) => target.platform)));
  const when = post.scheduledFor ?? post.createdAt;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {platforms.map((platform) => (
            <PlatformBadge key={platform} platform={platform} size="sm" />
          ))}
        </div>
        <Badge variant={QUEUE_VARIANT[post.status]} size="sm">
          {post.status}
        </Badge>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remove from queue"
          className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="line-clamp-3 text-xs font-medium">{post.content}</p>

      <div className="mt-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarClock className="h-3 w-3 shrink-0" />
        {post.mode === "draft" ? "Draft" : formatShortDate(when)}
        {post.platformPostUrl ? (
          <a
            href={post.platformPostUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      {post.lastError ? (
        <p className="flex items-start gap-1.5 text-[11px] text-destructive">
          <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
          {post.lastError}
        </p>
      ) : null}
    </Card>
  );
}
