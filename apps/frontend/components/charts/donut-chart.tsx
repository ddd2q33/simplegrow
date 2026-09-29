"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip, useMounted } from "./chart-frame";
import { formatCompact, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  height = 220,
  innerRadius = "62%",
  format = "compact",
  centerLabel,
  centerValue,
}: {
  data: DonutDatum[];
  height?: number;
  innerRadius?: string;
  format?: "compact" | "percent" | "number";
  centerLabel?: string;
  centerValue?: string;
}) {
  const mounted = useMounted();

  if (!mounted) return <Skeleton className="h-full w-full" />;

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={
              <ChartTooltip
                formatter={(value) =>
                  format === "percent" ? formatPercent(value, 2) : formatCompact(value)
                }
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={innerRadius}
            outerRadius="88%"
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((item) => (
              <Cell key={item.label} fill={item.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {centerLabel || centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums">{centerValue}</span>
          <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
