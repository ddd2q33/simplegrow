"use client";

import { useMemo } from "react";
import type { AudienceActivityWindow } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * 7 x 24 activity grid. Opacity encodes relative activity rather than colour,
 * so it stays readable in both themes.
 */
export function ActivityHeatmap({
  cells,
  onSelect,
  className,
}: {
  cells: AudienceActivityWindow[];
  onSelect?: (cell: AudienceActivityWindow) => void;
  className?: string;
}) {
  const { max, grid } = useMemo(() => {
    const byDay = new Map<string, AudienceActivityWindow[]>();
    for (const cell of cells) {
      const bucket = byDay.get(cell.day) ?? [];
      bucket.push(cell);
      byDay.set(cell.day, bucket);
    }
    return {
      max: Math.max(...cells.map((cell) => cell.value)),
      grid: DAYS.map((day) => byDay.get(day) ?? []),
    };
  }, [cells]);

  const hourLabels = [0, 6, 12, 18, 23];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-0.5 text-[10px] text-muted-foreground">
          {DAYS.map((day) => (
            <span key={day} className="flex h-4 items-center">
              {day}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {grid.map((row, dayIndex) => (
            <div key={DAYS[dayIndex]} className="flex gap-0.5">
              {Array.from({ length: 24 }).map((_, hour) => {
                const cell = row[hour];
                const intensity = cell ? cell.value / max : 0;
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => cell && onSelect?.(cell)}
                    title={
                      cell
                        ? `${cell.day} ${String(hour).padStart(2, "0")}:00 — ${cell.value}`
                        : undefined
                    }
                    className="h-4 min-w-0 flex-1 rounded-[3px] bg-primary transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    style={{ opacity: 0.12 + intensity * 0.88 }}
                  />
                );
              })}
            </div>
          ))}

          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            {hourLabels.map((hour) => (
              <span key={hour}>{String(hour).padStart(2, "0")}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((opacity) => (
          <span
            key={opacity}
            className="h-3 w-3 rounded-[3px] bg-primary"
            style={{ opacity }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
