import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/charts/sparkline";
import { cn, formatCompact, formatDelta, formatPercent } from "@/lib/utils";
import type { Kpi } from "@/lib/types";

function formatKpi(kpi: Kpi, value: number) {
  if (kpi.format === "percent") return formatPercent(value, 2);
  if (kpi.format === "duration") return `${Math.round(value)}s`;
  if (kpi.format === "number") return value.toLocaleString("en-US");
  return formatCompact(value);
}

export function DeltaBadge({
  changePct,
  className,
  size = "md",
}: {
  changePct: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const flat = Math.abs(changePct) < 0.05;
  const positive = changePct > 0;
  const Icon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-medium tabular-nums",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        flat
          ? "bg-muted text-muted-foreground"
          : positive
            ? "bg-success/12 text-success"
            : "bg-destructive/12 text-destructive",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {formatDelta(changePct)}
    </span>
  );
}

export function KpiCard({
  kpi,
  loading = false,
  invertDelta = false,
}: {
  kpi: Kpi;
  loading?: boolean;
  invertDelta?: boolean;
}) {
  const effectiveDelta = invertDelta ? -kpi.changePct : kpi.changePct;

  return (
    <Card className="overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
        <DeltaBadge changePct={effectiveDelta} size="sm" />
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
          {formatKpi(kpi, kpi.value)}
        </p>
      )}

      <div className="mt-4 -mb-1">
        {loading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <Sparkline values={kpi.sparkline} />
        )}
      </div>

      {!loading ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Previous: {formatKpi(kpi, kpi.previousValue)}
        </p>
      ) : null}
    </Card>
  );
}
