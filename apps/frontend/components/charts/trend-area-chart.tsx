"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, ChartTooltip, useMounted } from "./chart-frame";
import { formatCompact, formatDate, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type ValueFormat = "compact" | "percent" | "number" | "duration";

export interface TrendRow {
  date: string;
  [key: string]: string | number;
}

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  format: ValueFormat;
  dashed?: boolean;
  fill?: boolean;
}

function formatValue(value: number, format: ValueFormat) {
  if (format === "compact") return formatCompact(value);
  if (format === "percent") return formatPercent(value, 2);
  if (format === "duration") return `${Math.round(value)}s`;
  return value.toLocaleString("en-US");
}

export function TrendAreaChart({
  data,
  series,
  xKey = "date",
  yFormat = "compact",
  yDomain,
}: {
  data: TrendRow[];
  series: TrendSeries[];
  xKey?: string;
  yFormat?: ValueFormat;
  yDomain?: [number | "auto", number | "auto"];
}) {
  const mounted = useMounted();
  const gradientId = "sg-area-gradients";

  if (!mounted) return <Skeleton className="h-full w-full" />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <defs>
          {series
            .filter((item) => item.fill !== false)
            .map((item) => (
              <linearGradient
                key={item.key}
                id={`${gradientId}-${item.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity={0.26} />
                <stop offset="100%" stopColor={item.color} stopOpacity={0.01} />
              </linearGradient>
            ))}
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: string) => formatDate(value).slice(0, 6)}
          minTickGap={30}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={yDomain ?? ["auto", "auto"]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: number) => formatValue(value, yFormat)}
          width={54}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={
            <ChartTooltip
              formatter={(value, name) => {
                const match = series.find((item) => item.label === name);
                return formatValue(value, match?.format ?? "number");
              }}
            />
          }
        />

        {series.map((item) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.color}
            strokeWidth={item.dashed ? 1.25 : 2}
            strokeDasharray={item.dashed ? "4 4" : undefined}
            fill={item.fill === false ? "none" : `url(#${gradientId}-${item.key})`}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={!item.dashed}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export { CHART_COLORS };
