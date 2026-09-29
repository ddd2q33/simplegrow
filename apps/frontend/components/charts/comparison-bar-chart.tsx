"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip, useMounted } from "./chart-frame";
import { formatCompact, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export function ComparisonBarChart({
  data,
  layout = "horizontal",
  height = 260,
  format = "compact",
  suffix = "",
}: {
  data: BarDatum[];
  layout?: "horizontal" | "vertical";
  height?: number;
  format?: "compact" | "percent" | "number";
  suffix?: string;
}) {
  const mounted = useMounted();
  const horizontal = layout === "horizontal";
  const valueKey = "value";

  if (!mounted) return <Skeleton className="h-full w-full" />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 16, left: horizontal ? 0 : -18, bottom: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={!horizontal}
          horizontal={horizontal}
        />
        {horizontal ? (
          <>
            <XAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(value: number) =>
                format === "percent" ? formatPercent(value, 0) : formatCompact(value)
              }
              width={52}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(value: number) =>
                format === "percent" ? formatPercent(value, 0) : formatCompact(value)
              }
            />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              width={110}
            />
          </>
        )}

        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltip
              formatter={(value) =>
                format === "percent"
                  ? formatPercent(value, 2)
                  : `${formatCompact(value)}${suffix}`
              }
            />
          }
        />

        <Bar
          dataKey={valueKey}
          radius={horizontal ? [4, 4, 0, 0] : [0, 4, 4, 0]}
          maxBarSize={horizontal ? 34 : 20}
        >
          {data.map((item, index) => (
            <Cell
              key={item.label}
              fill={item.color ?? `var(--chart-${(index % 5) + 1})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
