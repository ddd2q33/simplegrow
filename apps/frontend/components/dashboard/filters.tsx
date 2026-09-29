"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DateRangeKey, Platform } from "@/lib/types";

interface DashboardFilters {
  range: DateRangeKey;
  platform: Platform | "all";
  setRange: (range: DateRangeKey) => void;
  setPlatform: (platform: Platform | "all") => void;
}

const DashboardFilterContext = createContext<DashboardFilters | null>(null);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRangeKey>("30d");
  const [platform, setPlatform] = useState<Platform | "all">("all");

  const value = useMemo(
    () => ({ range, platform, setRange, setPlatform }),
    [range, platform],
  );

  return (
    <DashboardFilterContext.Provider value={value}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error("useDashboardFilters must be used inside DashboardFilterProvider");
  }
  return context;
}

const RANGES: { key: DateRangeKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export function RangePicker({ className }: { className?: string }) {
  const { range, setRange } = useDashboardFilters();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5",
        className,
      )}
      role="group"
      aria-label="Date range"
    >
      {RANGES.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setRange(item.key)}
          aria-pressed={range === item.key}
          className={cn(
            "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
            range === item.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function PlatformFilter({ className }: { className?: string }) {
  const { platform, setPlatform } = useDashboardFilters();

  const options: { key: Platform | "all"; label: string }[] = [
    { key: "all", label: "All platforms" },
    { key: "instagram", label: "Instagram" },
    { key: "tiktok", label: "TikTok" },
    { key: "youtube", label: "YouTube" },
    { key: "twitter", label: "X / Twitter" },
    { key: "facebook", label: "Facebook" },
  ];

  return (
    <select
      value={platform}
      onChange={(event) => setPlatform(event.target.value as Platform | "all")}
      aria-label="Platform filter"
      className={cn(
        "h-9 cursor-pointer rounded-md border border-border bg-card px-3 text-xs font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
