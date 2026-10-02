"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AccountId, DataScope, DateRangeKey, Platform } from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";

interface DashboardFilters {
  range: DateRangeKey;
  accountId: AccountId | typeof ALL_ACCOUNTS;
  platform: Platform | "all";
  setRange: (range: DateRangeKey) => void;
  setAccountId: (accountId: AccountId | typeof ALL_ACCOUNTS) => void;
  setPlatform: (platform: Platform | "all") => void;
  /** Immutable snapshot every scope-aware service call receives. */
  scope: DataScope;
  reset: () => void;
}

const DashboardFilterContext = createContext<DashboardFilters | null>(null);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRangeKey>("30d");
  const [accountId, setAccountId] = useState<AccountId | typeof ALL_ACCOUNTS>(
    ALL_ACCOUNTS,
  );
  const [platform, setPlatform] = useState<Platform | "all">("all");

  // Switching account narrows the platform, so a stale platform would render an
  // empty dashboard with no obvious cause.
  const selectAccount = (next: AccountId | typeof ALL_ACCOUNTS) => {
    setAccountId(next);
    if (next !== ALL_ACCOUNTS) {
      setPlatform("all");
    }
  };

  const scope = useMemo<DataScope>(
    () => ({ range, accountId, platform }),
    [range, accountId, platform],
  );

  const value = useMemo(
    () => ({
      range,
      accountId,
      platform,
      setRange,
      setAccountId: selectAccount,
      setPlatform,
      scope,
      reset: () => {
        setRange("30d");
        setAccountId(ALL_ACCOUNTS);
        setPlatform("all");
      },
    }),
    [range, accountId, platform, scope],
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
  const { platform, setPlatform, accountId } = useDashboardFilters();
  const locked = accountId !== ALL_ACCOUNTS;

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
      disabled={locked}
      onChange={(event) => setPlatform(event.target.value as Platform | "all")}
      aria-label="Platform filter"
      title={locked ? "Platform is fixed by the selected account" : undefined}
      className={cn(
        "h-9 cursor-pointer rounded-md border border-border bg-card px-3 text-xs font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
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
