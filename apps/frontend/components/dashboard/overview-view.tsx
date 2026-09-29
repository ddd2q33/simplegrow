"use client";

import { Download, RefreshCw, TriangleAlert } from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { RangePicker } from "@/components/dashboard/filters";
import { KpiCard, DeltaBadge } from "@/components/dashboard/kpi-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { ChartFrame } from "@/components/charts/chart-frame";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { useRangeData } from "@/hooks/use-range-data";
import { getOverview } from "@/services/analytics";
import { downloadCsv } from "@/lib/export";
import { formatCompact, formatPercent, formatShortDate } from "@/lib/utils";
import type { DashboardOverview } from "@/lib/types";

export function OverviewView({ initial }: { initial: DashboardOverview }) {
  const { data, loading, error } = useRangeData(getOverview, initial);
  const dimmed = loading ? "opacity-60 transition-opacity" : "";

  function exportOverview() {
    downloadCsv(
      `simplegrow-overview-${data.range}.csv`,
      data.reachByPlatform.map((row) => ({
        platform: row.platform,
        followers: row.followers,
        followers_change_pct: row.followersChangePct,
        reach: row.reach,
        engagement_rate: row.engagementRate,
        reach_share_pct: row.sharePct,
      })),
    );
  }

  return (
    <div className={dimmed}>
      <PageHeader
        title="Overview"
        description="How your channels performed across every connected account."
        actions={
          <>
            <RangePicker />
            <Button variant="outline" size="sm" onClick={exportOverview} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </>
        }
      />

      {error ? (
        <Card className="flex items-center gap-2 border-destructive/40 p-4 text-xs text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} loading={loading} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartFrame
          title="Follower growth"
          description="Net followers gained per day"
          actions={loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
        >
          <TrendAreaChart
            data={data.followersSeries.map((point) => ({
              date: point.date,
              value: point.value,
              previous: point.previous,
            }))}
            series={[
              {
                key: "value",
                label: "Followers",
                color: "var(--chart-1)",
                format: "compact",
              },
              {
                key: "previous",
                label: "Followers (previous period)",
                color: "var(--muted-foreground)",
                format: "compact",
                dashed: true,
                fill: false,
              },
            ]}
          />
        </ChartFrame>

        <ChartFrame
          title="Engagement rate"
          description="Interactions over impressions"
          actions={loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
        >
          <TrendAreaChart
            data={data.engagementSeries}
            series={[
              {
                key: "value",
                label: "Engagement rate",
                color: "var(--chart-2)",
                format: "percent",
              },
              {
                key: "previous",
                label: "Previous period",
                color: "var(--muted-foreground)",
                format: "percent",
                dashed: true,
                fill: false,
              },
            ]}
            yFormat="percent"
          />
        </ChartFrame>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartFrame
          className="lg:col-span-3"
          title="Reach by platform"
          description="Share of total reach in the selected period"
        >
          <ComparisonBarChart
            layout="vertical"
            data={data.reachByPlatform.map((row, index) => ({
              label: row.platform,
              value: row.reach,
              color: `var(--chart-${(index % 5) + 1})`,
            }))}
          />
        </ChartFrame>

        <Card className="p-5 lg:col-span-2">
          <SectionHeader title="Top content" description="Ranked by reach" />
          {data.topContent.length === 0 ? (
            <EmptyState title="No published content yet" />
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {data.topContent.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <PlatformBadge platform={item.platform} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatCompact(item.metrics.reach)} reach ·{" "}
                      {formatPercent(item.metrics.engagementRate, 2)} engagement
                    </p>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {item.aiScore.toFixed(1)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <SectionHeader
          title="AI recommendations"
          description="Ranked by estimated impact on reach"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {data.recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SectionHeader title="Recent insights" description="From the analysis engine" />
          {data.recentInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-5 pb-4">
            <SectionHeader
              title="Running experiments"
              description={`${data.activeExperiments.length} active`}
            />
          </div>

          {data.activeExperiments.length === 0 ? (
            <EmptyState
              title="No experiments running"
              description="Launch an A/B test to start collecting signal."
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.activeExperiments.map((experiment) => {
                const leader = [...experiment.variants].sort((a, b) => b.rate - a.rate)[0];
                return (
                  <li key={experiment.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlatformBadge platform={experiment.platform} size="sm" />
                      <p className="text-xs font-medium">{experiment.name}</p>
                      <Badge variant="outline" size="sm" className="ml-auto">
                        {experiment.confidence}% confidence
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {experiment.variants.map((variant) => (
                        <div key={variant.id} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 truncate text-[11px] text-muted-foreground">
                            {variant.name}
                          </span>
                          <Progress
                            value={leader.rate === 0 ? 0 : (variant.rate / leader.rate) * 100}
                            barClassName={
                              variant.id === leader.id ? "bg-success" : "bg-muted-foreground"
                            }
                          />
                          <span className="w-14 shrink-0 text-right text-[11px] tabular-nums">
                            {formatPercent(variant.rate, 2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Primary metric: {experiment.primaryMetric} · started{" "}
                      {formatShortDate(experiment.startedAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-5 pb-4">
          <SectionHeader title="Platform performance" description="All connected channels" />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Platform</TH>
              <TH className="text-right">Followers</TH>
              <TH className="text-right">Change</TH>
              <TH className="text-right">Reach</TH>
              <TH className="text-right">Engagement</TH>
              <TH className="w-40">Reach share</TH>
            </TR>
          </THead>
          <TBody>
            {data.reachByPlatform.map((row) => (
              <TR key={row.platform}>
                <TD>
                  <PlatformBadge platform={row.platform} showLabel />
                </TD>
                <TD className="text-right tabular-nums">
                  {row.followers === 0 ? "—" : formatCompact(row.followers)}
                </TD>
                <TD className="text-right">
                  {row.followers === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <DeltaBadge changePct={row.followersChangePct} size="sm" />
                  )}
                </TD>
                <TD className="text-right tabular-nums">
                  {row.reach === 0 ? "—" : formatCompact(row.reach)}
                </TD>
                <TD className="text-right tabular-nums">
                  {row.engagementRate === 0 ? "—" : formatPercent(row.engagementRate, 2)}
                </TD>
                <TD>
                  <Progress value={row.sharePct * 2.5} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
