"use client";

import { Building2 } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/dashboard/page-header";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { DeltaBadge } from "@/components/dashboard/kpi-card";
import { accountGroups, getAccount } from "@/lib/mock/accounts";
import { formatCompact, formatPercent } from "@/lib/utils";
import { useDashboardFilters } from "./filters";
import type { AccountBreakdown } from "@/lib/types";

/**
 * Per-account performance, grouped by account group so the workspace
 * structure stays visible without navigating away.
 */
export function AccountBreakdownTable({
  rows,
  title = "Account performance",
  description = "Every account in the current scope",
}: {
  rows: AccountBreakdown[];
  title?: string;
  description?: string;
}) {
  const { setAccountId } = useDashboardFilters();

  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <SectionHeader title={title} description={description} />
        <EmptyState
          title="No connected accounts in this scope"
          description="Reconnect an account in Settings to bring its history back."
        />
      </Card>
    );
  }

  const grouped = accountGroups
    .map((group) => ({
      group,
      rows: rows
        .filter((row) => getAccount(row.accountId)?.groupId === group.id)
        .sort((a, b) => b.reach - a.reach),
    }))
    .filter((entry) => entry.rows.length > 0);

  const ungrouped = rows.filter(
    (row) => !accountGroups.some((g) => g.id === getAccount(row.accountId)?.groupId),
  );

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-5 pb-4">
        <SectionHeader title={title} description={description} />
      </div>

      {grouped.map(({ group, rows: groupRows }) => (
        <div key={group.id}>
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-2">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {groupRows.length} {groupRows.length === 1 ? "account" : "accounts"}
            </span>
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Account</TH>
                <TH className="text-right">Followers</TH>
                <TH className="text-right">Change</TH>
                <TH className="text-right">Reach</TH>
                <TH className="text-right">Engagement</TH>
                <TH className="w-32">Reach share</TH>
              </TR>
            </THead>
            <TBody>
              {groupRows.map((row) => (
                <TR
                  key={row.accountId}
                  onClick={() => setAccountId(row.accountId)}
                  className="cursor-pointer"
                >
                  <TD>
                    <span className="flex items-center gap-2">
                      <PlatformBadge platform={row.platform} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">
                          {row.handle}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {row.displayName}
                        </span>
                      </span>
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatCompact(row.followers)}
                  </TD>
                  <TD className="text-right">
                    <DeltaBadge changePct={row.followersChangePct} size="sm" />
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatCompact(row.reach)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatPercent(row.engagementRate, 2)}
                  </TD>
                  <TD>
                    <Progress value={row.sharePct * 2.5} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      ))}

      {ungrouped.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border p-5">
          {ungrouped.map((row) => (
            <Badge key={row.accountId} variant="secondary" size="sm">
              {row.handle}
            </Badge>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
