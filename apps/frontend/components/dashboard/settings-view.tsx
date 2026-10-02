"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2, Plug, PlugZap, RefreshCw, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { AddAccountForm } from "@/components/dashboard/add-account-form";
import {
  beginConnect,
  disconnectAccount,
  getActivity,
  importConnectedAccounts,
  syncAllAccounts,
} from "@/services/workspace";
import { USE_MOCK } from "@/lib/api";
import { workspace, FIXTURE_NOW } from "@/lib/mock/core";
import { accountGroups } from "@/lib/mock/accounts";
import { formatCompact, formatDate, formatRelativeTime } from "@/lib/utils";
import type { AccountGroup, SocialAccount } from "@/lib/types";

const STATUS_VARIANT = {
  active: "success",
  syncing: "default",
  error: "destructive",
  disconnected: "secondary",
} as const;

const UNASSIGNED: AccountGroup = {
  id: "unassigned",
  name: "Added accounts",
  description: "Not filed under a brand or client yet",
  color: "var(--chart-4)",
};

export function SettingsView({ initial }: { initial: SocialAccount[] }) {
  const [accounts, setAccounts] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activity = getActivity();

  // Zernio sends the browser back here with `connected=1` plus the account it
  // created. Mirror whatever it now reports as connected and clean the URL.
  useEffect(() => {
    if (USE_MOCK) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("connected")) return;

    setNotice("Finishing connection…");
    importConnectedAccounts()
      .then((rows) => {
        setAccounts(rows);
        const handle = params.get("username");
        setNotice(
          handle
            ? `Connected @${handle}. Pulling its history in the background.`
            : `Connected ${rows.length} account(s). Pulling their history…`,
        );
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not import accounts");
      });
  }, []);

  const groups = [
    ...accountGroups,
    ...(accounts.some((account) => !accountGroups.some((group) => group.id === account.groupId))
      ? [UNASSIGNED]
      : []),
  ];

  async function toggle(account: SocialAccount) {
    setPendingId(account.id);
    setError(null);

    // Zernio has no "re-enable" call: a disconnected account comes back with a
    // fresh OAuth grant, so send the browser through the connect flow again.
    if (!account.connected) {
      try {
        const { auth_url } = await beginConnect(account.platform);
        window.location.assign(auth_url);
        return;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not start OAuth");
        setPendingId(null);
        return;
      }
    }

    try {
      const updated = await disconnectAccount(account.id);
      setAccounts((current) =>
        current.map((item) => (item.id === account.id ? updated : item)),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Integration update failed");
    } finally {
      setPendingId(null);
    }
  }

  async function syncEverything() {
    setSyncingAll(true);
    setError(null);
    setNotice(null);
    try {
      const report = await syncAllAccounts();
      setNotice(
        `Synced ${report.accounts_synced} of ${accounts.length} accounts` +
          (report.accounts_failed > 0 ? ` · ${report.accounts_failed} failed` : "") +
          ` (${report.api_calls} API call${report.api_calls === 1 ? "" : "s"}).`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sync failed");
    } finally {
      setSyncingAll(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Workspace, connected channels and recent sync activity."
      />

      {error ? (
        <Card className="flex items-center gap-2 border-destructive/40 p-4 text-xs text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Row label="Name" value={workspace.name} />
              <Row label="Slug" value={workspace.slug} />
              <Row label="Plan" value={workspace.plan} />
              <Row label="Timezone" value={workspace.timezone} />
              <Row label="Created" value={formatDate(workspace.createdAt)} />
              <Row
                label="Connected channels"
                value={`${accounts.filter((account) => account.connected).length} of ${accounts.length}`}
              />
            </dl>
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader>
            <CardTitle>Owner</CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <div className="mt-4 flex items-center gap-3">
              <Avatar name="Manuela Duarte" size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Manuela Duarte</p>
                <p className="truncate text-xs text-muted-foreground">
                  manuela@northwind.studio
                </p>
                <Badge variant="secondary" size="sm" className="mt-1">
                  owner
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CardHeader>
            <CardTitle>Connected accounts</CardTitle>
            <CardDescription>
              Accounts are grouped by brand, client or region. Disconnected accounts stop
              receiving metrics and their history drops out of comparisons.
            </CardDescription>
          </CardHeader>
          <Button
            variant="outline"
            size="sm"
            onClick={syncEverything}
            disabled={syncingAll || USE_MOCK}
            className="gap-1.5"
          >
            {syncingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync all now
          </Button>
        </div>

        {notice ? (
          <Card className="flex items-center gap-2 border-success/40 p-4 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {notice}
          </Card>
        ) : null}

        <AddAccountForm
          disabled={USE_MOCK}
          disabledReason="connecting accounts needs the real backend. Set NEXT_PUBLIC_USE_MOCK=false and start the FastAPI server."
        />

        {groups.map((group) => {
          const isUnassigned = group.id === UNASSIGNED.id;
          const members = accounts.filter((account) =>
            isUnassigned
              ? !accountGroups.some((known) => known.id === account.groupId)
              : account.groupId === group.id,
          );
          if (members.length === 0) return null;

          const connected = members.filter((account) => account.connected);

          return (
            <div key={group.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <CardTitle className="!text-sm !font-semibold">{group.name}</CardTitle>
                <span className="text-[11px] text-muted-foreground">
                  {group.description}
                </span>
                <Badge variant="secondary" size="sm" className="ml-auto">
                  {connected.length} of {members.length} connected
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {members.map((account) => {
                  const pending = pendingId === account.id;

                  return (
                    <Card key={account.id} className="flex flex-col gap-4 p-5">
                      <div className="flex items-start gap-3">
                        <PlatformBadge platform={account.platform} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {account.handle}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {account.displayName} · {account.accountType}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[account.status]} size="sm">
                          {account.status === "syncing" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : account.status === "active" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : null}
                          {account.status}
                        </Badge>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Followers</p>
                          <p className="text-lg font-semibold tabular-nums">
                            {account.followers === 0
                              ? "—"
                              : formatCompact(account.followers)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">Last sync</p>
                          <p className="text-xs">
                            {account.connected
                              ? formatRelativeTime(account.lastSyncAt, FIXTURE_NOW)
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {account.scopes.length > 0 ? (
                        <ul className="flex flex-wrap gap-1.5">
                          {account.scopes.map((scope) => (
                            <li
                              key={scope}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {scope}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <Button
                        variant={account.connected ? "outline" : "default"}
                        size="sm"
                        disabled={pending}
                        onClick={() => toggle(account)}
                        className="mt-auto gap-1.5"
                      >
                        {pending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : account.connected ? (
                          <PlugZap className="h-3.5 w-3.5" />
                        ) : (
                          <Plug className="h-3.5 w-3.5" />
                        )}
                        {account.connected ? "Disconnect" : "Connect"}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="!p-0 !pb-0">
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-border">
          {activity.map((event) => (
            <li key={event.id} className="flex items-center gap-3 px-5 py-3 text-xs">
              <span className="font-medium">{event.actor}</span>
              <span className="text-muted-foreground">{event.action}</span>
              <span className="font-medium">{event.target}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {formatRelativeTime(event.createdAt, FIXTURE_NOW)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
