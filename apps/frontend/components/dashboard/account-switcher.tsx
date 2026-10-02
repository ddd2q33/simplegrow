"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Users } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { ALL_ACCOUNTS } from "@/lib/types";
import type { AccountId, Platform, SocialAccount } from "@/lib/types";
import { PLATFORM_META } from "@/lib/mock/core";
import { accountGroups, getAccount, socialAccounts } from "@/lib/mock/accounts";
import { useDashboardFilters } from "./filters";
import { PlatformIcon } from "./platform-badge";

interface SwitcherEntry {
  id: AccountId | typeof ALL_ACCOUNTS;
  label: string;
  sublabel: string;
  account?: SocialAccount;
  platform?: Platform;
  count?: number;
}

interface SwitcherGroup {
  id: string;
  name: string;
  rows: SwitcherEntry[];
}

function groupLabel(): SwitcherEntry {
  return {
    id: ALL_ACCOUNTS,
    label: "All accounts",
    sublabel: `${socialAccounts.filter((item) => item.connected).length} connected · ${socialAccounts.length} total`,
  };
}

function buildEntries(): { head: SwitcherEntry[]; groups: SwitcherGroup[] } {
  const head: SwitcherEntry[] = [groupLabel()];

  head.push(
    ...accountGroups.map((group) => {
      const members = socialAccounts.filter((account) => account.groupId === group.id);
      return {
        id: `${group.id}::group`,
        label: group.name,
        sublabel: group.description,
        count: members.length,
      };
    }),
  );

  const groups: SwitcherGroup[] = accountGroups.map((group) => {
    const members = socialAccounts.filter((account) => account.groupId === group.id);
    const byPlatform = new Map<Platform, SocialAccount[]>();
    for (const account of members) {
      const bucket = byPlatform.get(account.platform) ?? [];
      bucket.push(account);
      byPlatform.set(account.platform, bucket);
    }

    const rows: SwitcherEntry[] = [];

    for (const [platform, accounts] of byPlatform) {
      if (accounts.length > 1) {
        rows.push({
          id: `${group.id}::${platform}::platform`,
          label: `All ${PLATFORM_META[platform].label}`,
          sublabel: `${accounts.length} accounts`,
          platform,
          count: accounts.length,
        });
      }
      for (const account of accounts) {
        rows.push({
          id: account.id,
          label: account.handle,
          sublabel: account.displayName,
          account,
        });
      }
    }

    return { id: group.id, name: group.name, rows };
  });

  return { head, groups };
}

export function AccountSwitcher({ className }: { className?: string }) {
  const { accountId, setAccountId } = useDashboardFilters();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { head, groups } = useMemo(buildEntries, []);

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;

    return groups
      .map((group) => ({
        ...group,
        rows: group.rows.filter((row) =>
          `${row.label} ${row.sublabel}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.rows.length > 0);
  }, [groups, query]);

  const filteredHead = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return head;
    return head.filter((row) => row.label.toLowerCase().includes(needle));
  }, [head, query]);

  const selected = accountId === ALL_ACCOUNTS ? null : getAccount(accountId);
  const activeGroup = selected
    ? accountGroups.find((group) => group.id === selected.groupId)
    : null;

  const triggerLabel = selected
    ? selected.handle
    : activeGroup
      ? activeGroup.name
      : "All accounts";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(id: AccountId | typeof ALL_ACCOUNTS) {
    if (!id.includes("::")) setAccountId(id as AccountId | typeof ALL_ACCOUNTS);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Account scope: ${triggerLabel}`}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs font-medium",
          "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {selected ? (
          <PlatformIcon platform={selected.platform} className="h-3.5 w-3.5" />
        ) : (
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="max-w-[9rem] truncate">{triggerLabel}</span>
        {selected ? (
          <span className="text-[10px] font-normal text-muted-foreground">
            {formatCompact(selected.followers)}
          </span>
        ) : null}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-11 z-40 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
        >
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search accounts…"
              aria-label="Search accounts"
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="max-h-[26rem] overflow-y-auto scrollbar-thin py-1">
            {filteredHead.map((row) => (
              <HeadRow
                key={row.id}
                row={row}
                active={accountId === ALL_ACCOUNTS}
                onSelect={() => choose(row.id)}
              />
            ))}

            {filteredGroups.map((group) => (
              <div key={group.id} className="mt-1 border-t border-border pt-1">
                {group.rows.map((row) => (
                  <GroupRow
                    key={row.id}
                    row={row}
                    active={row.id === accountId}
                    onSelect={() => choose(row.id)}
                  />
                ))}
              </div>
            ))}

            {filteredHead.length === 0 && filteredGroups.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No accounts match “{query}”.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeadRow({
  row,
  active,
  onSelect,
}: {
  row: SwitcherEntry;
  active: boolean;
  onSelect: () => void;
}) {
  const isGroup = row.id.includes("::group");

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      disabled={isGroup}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
        isGroup ? "cursor-default" : "hover:bg-muted",
        active && "bg-primary/5",
      )}
    >
      {isGroup ? (
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{row.label}</span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {row.sublabel}
        </span>
      </span>
      {active ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
    </button>
  );
}

function GroupRow({
  row,
  active,
  onSelect,
}: {
  row: SwitcherEntry;
  active: boolean;
  onSelect: () => void;
}) {
  const isPlatformRow = row.id.includes("::platform");
  const account = row.account;

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      disabled={isPlatformRow}
      className={cn(
        "flex w-full items-center gap-2 py-1.5 pl-8 pr-3 text-left transition-colors",
        isPlatformRow
          ? "cursor-default"
          : "hover:bg-muted",
        active && "bg-primary/5",
      )}
    >
      {account ? (
        <>
          <PlatformIcon platform={account.platform} className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-xs font-medium">{row.label}</span>
              {account.status !== "active" ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold uppercase",
                    account.status === "error"
                      ? "bg-destructive/10 text-destructive"
                      : account.status === "syncing"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {account.status}
                </span>
              ) : null}
            </span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {row.sublabel} · {formatCompact(account.followers)} followers
            </span>
          </span>
          {active ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
        </>
      ) : (
        <>
          {row.platform ? (
            <PlatformIcon platform={row.platform} className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <span className="h-3 w-3 shrink-0" />
          )}
          <span className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </span>
        </>
      )}
    </button>
  );
}
