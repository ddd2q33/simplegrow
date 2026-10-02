"use client";

import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RangePicker } from "@/components/dashboard/filters";
import { ChartFrame } from "@/components/charts/chart-frame";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { ActivityHeatmap } from "@/components/charts/activity-heatmap";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DeltaBadge } from "@/components/dashboard/kpi-card";
import { useScopedData } from "@/hooks/use-scoped-data";
import { ScopeBanner } from "@/components/dashboard/scope-banner";
import { getAudienceOverview } from "@/services/audience";
import { downloadCsv } from "@/lib/export";
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils";
import type {
  AudienceActivityWindow,
  AudienceOverview,
  AudienceSegment,
  DataScope,
} from "@/lib/types";

export function AudienceView({
  initial,
  initialScope,
}: {
  initial: AudienceOverview;
  initialScope: DataScope;
}) {
  const { data, loading, error, scope } = useScopedData(
    getAudienceOverview,
    initial,
    initialScope,
  );
  const [selected, setSelected] = useState<AudienceActivityWindow | null>(null);

  function exportSegments() {
    downloadCsv(
      `simplegrow-audience-segments-${data.range}.csv`,
      data.segments.map((segment) => ({
        segment: segment.name,
        followers: segment.size,
        share_pct: segment.sharePct,
        growth_pct: segment.growthPct,
        engagement_rate: segment.engagementRate,
        median_age: segment.avgAge,
      })),
    );
  }

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <PageHeader
        title="Audience"
        description="Who follows you, how they engage, and when they are listening."
        actions={
          <>
            <RangePicker />
            <Button
              variant="outline"
              size="sm"
              onClick={exportSegments}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export segments
            </Button>
          </>
        }
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <ScopeBanner
        scope={scope}
        accountCount={data.accountCount}
        totalFollowers={data.totalFollowers}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Total followers"
          value={formatCompact(data.totalFollowers)}
          delta={data.totalFollowersChangePct}
        />
        <Tile label="New followers" value={formatCompact(data.newFollowers)} />
        <Tile label="Unfollows" value={formatCompact(data.unfollows)} invertDelta />
        <Tile label="Net followers" value={formatCompact(data.netFollowers)} />
      </div>

      <ChartFrame
        title="Follower growth"
        description="Net new followers per day"
        actions={
          loading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : null
        }
      >
        <TrendAreaChart
          data={data.growthSeries}
          series={[
            {
              key: "value",
              label: "Net followers",
              color: "var(--chart-3)",
              format: "number",
            },
            {
              key: "previous",
              label: "Previous period",
              color: "var(--muted-foreground)",
              format: "number",
              dashed: true,
              fill: false,
            },
          ]}
        />
      </ChartFrame>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Audience segments</CardTitle>
            <CardDescription>Grouped by engagement recency</CardDescription>
          </CardHeader>
          <div className="p-5 pt-0">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.segments.map((segment) => (
                <SegmentTile key={segment.id} segment={segment} />
              ))}
            </div>
          </div>
        </Card>
      </div>

      <ChartFrame
        title="Peak activity"
        description={
          selected
            ? `${selected.day} ${String(selected.hour).padStart(2, "0")}:00 — ${formatNumber(selected.value)} interactions`
            : "When your audience is most active. Click a cell for detail."
        }
      >
        <ActivityHeatmap cells={data.activityHeatmap} onSelect={setSelected} />
      </ChartFrame>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartFrame
          className="lg:col-span-3"
          title="Top countries"
          description="Share of your audience"
        >
          <ComparisonBarChart
            layout="vertical"
            data={data.topCountries.map((country, index) => ({
              label: country.country,
              value: country.followers,
              color: `var(--chart-${(index % 5) + 1})`,
            }))}
          />
        </ChartFrame>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <ChartFrame title="Gender split" height={220}>
            <DonutChart
              data={data.genderSplit.map((item, index) => ({
                label: item.label,
                value: item.pct,
                color: `var(--chart-${(index % 5) + 1})`,
              }))}
              format="percent"
              centerValue={`${data.genderSplit[0].pct}%`}
              centerLabel={data.genderSplit[0].label}
            />
          </ChartFrame>

          <Card className="p-5">
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <dl className="mt-4 flex flex-col gap-3 text-xs">
              <Row label="Median age" value={String(data.medianAge)} />
              <Row
                label="Top country"
                value={`${data.topCountries[0].country} · ${formatPercent(data.topCountries[0].sharePct, 1)}`}
              />
              <Row
                label="Fastest segment"
                value={[...data.segments].sort((a, b) => b.growthPct - a.growthPct)[0].name}
              />
              <Row
                label="Most engaged"
                value={[...data.segments].sort((a, b) => b.engagementRate - a.engagementRate)[0].name}
              />
              <Row label="Synced" value="just now" />
            </dl>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Countries</CardTitle>
          <CardDescription>Absolute follower counts</CardDescription>
        </CardHeader>
        <ul className="divide-y divide-border">
          {data.topCountries.map((country) => (
            <li key={country.code} className="flex items-center gap-4 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold">
                {country.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {country.country}
              </span>
              <div className="hidden w-40 sm:block">
                <Progress value={country.sharePct * 3} />
              </div>
              <Badge variant="secondary" size="sm">
                {formatPercent(country.sharePct, 1)}
              </Badge>
              <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">
                {formatCompact(country.followers)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SegmentTile({ segment }: { segment: AudienceSegment }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{segment.name}</p>
        <DeltaBadge changePct={segment.growthPct} size="sm" />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {segment.description}
      </p>
      <p className="mt-3 text-xl font-semibold tabular-nums">
        {formatCompact(segment.size)}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {formatPercent(segment.sharePct, 1)} of audience
      </p>
      <Progress value={segment.sharePct * 2.5} className="mt-3" />
      <dl className="mt-3 flex items-center justify-between text-[11px]">
        <dt className="text-muted-foreground">Engagement</dt>
        <dd className="font-medium tabular-nums">
          {formatPercent(segment.engagementRate, 2)}
        </dd>
      </dl>
      <dl className="mt-1 flex items-center justify-between text-[11px]">
        <dt className="text-muted-foreground">Median age</dt>
        <dd className="font-medium tabular-nums">{segment.avgAge}</dd>
      </dl>
    </Card>
  );
}

function Tile({
  label,
  value,
  delta,
  invertDelta = false,
}: {
  label: string;
  value: string;
  delta?: number;
  invertDelta?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {delta === undefined ? null : (
          <DeltaBadge changePct={invertDelta ? -delta : delta} size="sm" />
        )}
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
