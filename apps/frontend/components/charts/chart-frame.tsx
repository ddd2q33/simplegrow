"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts measures its container in an effect, so it renders nothing on the
 * server. Gating on mount keeps SSR and hydration in agreement.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function ChartFrame({
  title,
  description,
  actions,
  height = 280,
  children,
  className,
  footer,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  height?: number;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  const mounted = useMounted();

  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card shadow-sm",
        className,
      )}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5 pb-4">
          <div className="flex flex-col gap-1">
            {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}

      <div className="flex-1 p-5 pt-4">
        {mounted ? (
          <div style={{ height }}>{children}</div>
        ) : (
          <div className="flex flex-col justify-end gap-2" style={{ height }}>
            <Skeleton className="h-full w-full" />
          </div>
        )}
      </div>

      {footer ? (
        <footer className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface TooltipEntry {
  name?: string;
  dataKey?: string | number;
  value?: number;
  color?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label ? (
        <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      ) : null}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => {
          const name = entry.name ?? String(entry.dataKey ?? "");
          const value = Number(entry.value ?? 0);
          return (
            <div key={index} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-medium tabular-nums">
                {formatter ? formatter(value, name) : value.toLocaleString("en-US")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
