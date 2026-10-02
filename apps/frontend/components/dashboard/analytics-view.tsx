"use client";

import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RangePicker, PlatformFilter } from "@/components/dashboard/filters";
import { ChartFrame } from "@/components/charts/chart-frame";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { DeltaBadge } from "@/components/dashboard/kpi-card";
import { useScopedData } from "@/hooks/use-scoped-data";
import { ScopeBanner } from "@/components/dashboard/scope-banner";
import { AccountBreakdownTable } from "@/components/dashboard/account-breakdown-table";
import { getAnalyticsDetail } from "@/services/analytics";
import { downloadCsv } from "@/lib/export";
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils";
import type { AnalyticsDetail, DataScope } from "@/lib/types";

export function AnalyticsView({
  initial,
  initialScope,
}: {
  initial: AnalyticsDetail;
  initialScope: DataScope;
}) {
  const { data, loading, error, scope } = useScopedData(
    getAnalyticsDetail,
    initial,
    initialScope,
  );
  const [metric, setMetric] = useState<"reach" | "views">("reach");

  const series =
    metric === "reach"
      ? data.reachSeries.map((p) => ({ date: p.date, value: p.value, previous: p.previous }))
      : data.viewsSeries.map((p) => ({ date: p.date, value: p.value, previous: p.previous }));

  const totals = data.platforms.reduce(
    (acc, row) => ({
      reach: acc.reach + row.reach,
      impressions: acc.impressions + row.impressions,
      followers: acc.followers + row.followers,
    }),
    { reach: 0, impressions: 0, followers: 0 },
  );

  function exportRows() {
    downloadCsv(
      `simplegrow-analytics-${data.range}.csv`,
      data.accounts.map((row) => ({
        account: row.handle,
        platform: row.platform,
        followers: row.followers,
        reach: row.reach,
        impressions: row.impressions,
        engagement_rate: row.engagementRate,
        reach_share_pct: row.sharePct,
      })),
    );
  }

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <PageHeader
        title="Analytics"
        description="Channel-level performance, impressions and engagement over time."
        actions={
          <>
            <PlatformFilter />
            <RangePicker />
            <Button variant="outline" size="sm" onClick={exportRows} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </>
        }
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <ScopeBanner
        scope={scope}
        accountCount={data.accounts.length}
        totalFollowers={totals.followers}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Total reach" value={formatCompact(totals.reach)} />
        <SummaryTile label="Total impressions" value={formatCompact(totals.impressions)} />
        <SummaryTile label="Total followers" value={formatCompact(totals.followers)} />
      </div>

      <ChartFrame
        title={metric === "reach" ? "Reach over time" : "Views over time"}
        description="Current period against the previous one"
        actions={
          <>
            <div className="inline-flex items-center gap-0.5 rounded-md border border-border p-0.5">
              {(["reach", "views"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMetric(option)}
                  aria-pressed={metric === option}
                  className={`rounded-sm px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                    metric === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {loading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : null}
          </>
        }
        height={320}
      >
        <TrendAreaChart
          data={series}
          series={[
            {
              key: "value",
              label: metric === "reach" ? "Reach" : "Views",
              color: "var(--chart-1)",
              format: "compact",
            },
            {
              key: "previous",
              label: "Previous period",
              color: "var(--muted-foreground)",
              format: "compact",
              dashed: true,
              fill: false,
            },
          ]}
        />
      </ChartFrame>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartFrame title="Engagement rate by platform" height={260}>
          <ComparisonBarChart
            data={data.platforms.map((row, index) => ({
              label: row.platform,
              value: row.engagementRate,
              color: `var(--chart-${(index % 5) + 1})`,
            }))}
            format="percent"
          />
        </ChartFrame>

        <ChartFrame title="Reach share" height={260}>
          <DonutChart
            data={data.platforms
              .filter((row) => row.reach > 0)
              .map((row, index) => ({
                label: row.platform,
                value: row.reach,
                color: `var(--chart-${(index % 5) + 1})`,
              }))}
            centerValue={formatCompact(totals.reach)}
            centerLabel="total reach"
          />
        </ChartFrame>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="!p-0 !pb-0">
          <CardTitle>Channel breakdown</CardTitle>
          <CardDescription>
            Metrics for the last {data.range === "7d" ? "7" : data.range === "30d" ? "30" : "90"} days
          </CardDescription>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Platform</TH>
              <TH className="text-right">Accounts</TH>
              <TH className="text-right">Followers</TH>
              <TH className="text-right">Δ Followers</TH>
              <TH className="text-right">Reach</TH>
              <TH className="text-right">Impressions</TH>
              <TH className="text-right">Engagement</TH>
            </TR>
          </THead>
          <TBody>
            {data.platforms.map((row) => (
              <TR key={row.platform}>
                <TD>
                  <PlatformBadge platform={row.platform} showLabel />
                </TD>
                <TD className="text-right tabular-nums">{row.accountCount}</TD>
                <TD className="text-right tabular-nums">
                  {row.followers === 0 ? "—" : formatNumber(row.followers)}
                </TD>
                <TD className="text-right">
                  {row.followers === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <DeltaBadge changePct={row.followersChangePct} size="sm" />
                  )}
                </TD>
                <TD className="text-right tabular-nums">
                  {row.reach === 0 ? "—" : formatNumber(row.reach)}
                </TD>
                <TD className="text-right tabular-nums">
                  {row.impressions === 0 ? "—" : formatNumber(row.impressions)}
                </TD>
                <TD className="text-right tabular-nums">
                  {row.engagementRate === 0
                    ? "—"
                    : formatPercent(row.engagementRate, 2)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <AccountBreakdownTable
        rows={data.accounts}
        title="Account breakdown"
        description="Ranked by reach within the current scope"
      />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
