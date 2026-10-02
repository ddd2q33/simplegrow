"use client";

import { useState } from "react";
import { Loader2, PlugZap, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { beginConnect } from "@/services/workspace";
import type { SocialAccount } from "@/lib/types";

/** Only the platforms the dashboard models today. Zernio supports more. */
const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "twitter", label: "X / Twitter" },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

export function AddAccountForm({
  disabled,
  disabledReason,
}: {
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [platform, setPlatform] = useState<PlatformId>("instagram");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setPending(true);
    setError(null);
    try {
      const { auth_url } = await beginConnect(platform);
      window.location.assign(auth_url);
    } catch (caught) {
      setError(readableError(caught));
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <CardHeader className="!p-0">
        <CardTitle>Connect an account</CardTitle>
        <CardDescription>
          You authorise the account on the platform itself. That gives us real
          Insights — private reach, watch time and saves — not public estimates.
        </CardDescription>
      </CardHeader>

      <CardContent className="!p-0">
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlatform(item.id as PlatformId)}
                aria-pressed={platform === item.id}
                disabled={pending || disabled}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  platform === item.id
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <PlatformBadge platform={item.id as SocialAccount["platform"]} size="sm" />
                {item.label}
              </button>
            ))}
          </div>

          <div>
            <Button
              type="button"
              onClick={connect}
              disabled={pending || disabled}
              className="gap-1.5"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlugZap className="h-3.5 w-3.5" />
              )}
              {pending ? "Redirecting" : "Connect with OAuth"}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Business or creator accounts expose the most data. A personal account
            connects but returns no Insights.
          </p>

          {disabled && disabledReason ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Badge variant="secondary" size="sm">
                mock
              </Badge>
              {disabledReason}
            </p>
          ) : null}

          {error ? (
            <p className="flex items-start gap-1.5 text-[11px] text-destructive">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function readableError(caught: unknown): string {
  const raw = caught instanceof Error ? caught.message : String(caught);
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown };
    const detail = parsed.detail;
    if (detail && typeof detail === "object") {
      const { error, code } = detail as { error?: string; code?: string };
      if (code === "not_configured") {
        return "Zernio is not configured on the server. Set ZERNIO_API_KEY.";
      }
      if (code === "plan_required") {
        return "Your Zernio plan does not cover connecting this platform yet.";
      }
      if (error) return error;
    }
    if (typeof detail === "string") return detail;
  } catch {
    /* fall through to the raw message */
  }
  return raw;
}
