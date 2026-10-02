"use client";

import { Filter, Users } from "lucide-react";
import { getAccount, accountGroups } from "@/lib/mock/accounts";
import { PLATFORM_META } from "@/lib/mock/core";
import { formatCompact } from "@/lib/utils";
import { ALL_ACCOUNTS } from "@/lib/types";
import type { DataScope } from "@/lib/types";
import { useDashboardFilters } from "./filters";
import { PlatformBadge } from "./platform-badge";

/**
 * Makes the active scope explicit. Multi-account workspaces are ambiguous
 * without it, because every page aggregates silently.
 */
export function ScopeBanner({
  scope,
  accountCount,
  totalFollowers,
  className,
}: {
  scope: DataScope;
  accountCount: number;
  totalFollowers: number;
  className?: string;
}) {
  const { setAccountId, setPlatform } = useDashboardFilters();

  const account = scope.accountId === ALL_ACCOUNTS ? null : getAccount(scope.accountId);
  const group = account
    ? accountGroups.find((item) => item.id === account.groupId)
    : null;

  const label = account
    ? account.handle
    : scope.platform !== "all"
      ? `All ${PLATFORM_META[scope.platform].label} accounts`
      : "All accounts";

  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs"
      }
    >
      <span className="flex items-center gap-1.5 font-medium">
        {account ? (
          <PlatformBadge platform={account.platform} size="sm" />
        ) : (
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {label}
      </span>

      {group && account ? (
        <span className="text-muted-foreground">in {group.name}</span>
      ) : null}

      <span className="text-muted-foreground">
        {accountCount} {accountCount === 1 ? "account" : "accounts"} ·{" "}
        {formatCompact(totalFollowers)} followers · {scope.range}
      </span>

      {account || scope.platform !== "all" ? (
        <button
          type="button"
          onClick={() => {
            setAccountId(ALL_ACCOUNTS);
            setPlatform("all");
          }}
          className="ml-auto flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Filter className="h-3 w-3" />
          Clear scope
        </button>
      ) : null}
    </div>
  );
}
