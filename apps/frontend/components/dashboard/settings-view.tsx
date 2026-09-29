"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Plug, PlugZap, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import {
  connectAccount,
  disconnectAccount,
  getActivity,
} from "@/services/workspace";
import { PLATFORMS, PLATFORM_META, workspace } from "@/lib/mock/core";
import { formatCompact, formatDate, formatRelativeTime } from "@/lib/utils";
import { FIXTURE_NOW } from "@/lib/mock/core";
import type { SocialAccount } from "@/lib/types";

const STATUS_VARIANT = {
  active: "success",
  syncing: "default",
  error: "destructive",
  disconnected: "secondary",
} as const;

export function SettingsView({ initial }: { initial: SocialAccount[] }) {
  const [accounts, setAccounts] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activity = getActivity();

  async function toggle(account: SocialAccount) {
    setPendingId(account.id);
    setError(null);

    try {
      const updated = account.connected
        ? await disconnectAccount(account.id)
        : await connectAccount(account.id);

      setAccounts((current) =>
        current.map((item) => (item.id === account.id ? updated : item)),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Integration update failed");
    } finally {
      setPendingId(null);
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
          <h2 className="text-sm font-semibold">Workspace</h2>
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
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Owner</h2>
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
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Connected channels</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Disconnected channels stop receiving metrics and their history drops out
            of comparisons.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((platform) => {
            const account = accounts.find((item) => item.platform === platform);
            if (!account) return null;
            const pending = pendingId === account.id;
            const meta = PLATFORM_META[platform];

            return (
              <Card key={account.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <PlatformBadge platform={platform} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{meta.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {account.handle}
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

      <Card className="overflow-hidden">
        <div className="border-b border-border p-5 pb-4">
          <h2 className="text-sm font-semibold">Recent activity</h2>
        </div>
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
