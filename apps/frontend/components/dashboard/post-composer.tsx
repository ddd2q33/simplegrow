"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileText, Loader2, Send, TriangleAlert } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { getIntegrations } from "@/services/workspace";
import { createPost } from "@/services/content";
import type { PostMode, ScheduledPost, SocialAccount } from "@/lib/types";

const MODES: { value: PostMode; label: string; submit: string; hint: string }[] = [
  {
    value: "now",
    label: "Publish now",
    submit: "Publish now",
    hint: "Goes out on every selected account immediately.",
  },
  {
    value: "schedule",
    label: "Schedule",
    submit: "Schedule",
    hint: "Zernio publishes it at the time below.",
  },
  {
    value: "draft",
    label: "Save draft",
    submit: "Save draft",
    hint: "Kept in the queue only; nothing is sent to the networks.",
  },
];

const MAX_LENGTH = 2200;

function localDatetimeValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function PostComposer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (post: ScheduledPost) => void;
}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<PostMode>("now");
  const [selected, setSelected] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezone = useMemo(
    () =>
      typeof Intl === "undefined"
        ? "UTC"
        : Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getIntegrations()
      .then((rows) => {
        if (cancelled) return;
        const connected = rows.filter((account) => account.connected);
        setAccounts(connected);
        setSelected(connected.map((account) => account.id));
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setContent("");
    setMode("now");
    setError(null);
    setScheduledFor(localDatetimeValue(new Date(Date.now() + 60 * 60 * 1000)));
  }, [open]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function submit() {
    setError(null);
    if (!content.trim()) {
      setError("Write the post content first.");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one account.");
      return;
    }
    if (mode === "schedule" && !scheduledFor) {
      setError("Pick a date and time to schedule.");
      return;
    }

    setSubmitting(true);
    try {
      const post = await createPost({
        content: content.trim(),
        accountIds: selected,
        mode,
        scheduledFor:
          mode === "schedule" ? new Date(scheduledFor).toISOString() : null,
        timezone,
      });
      onCreated(post);
      onClose();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const activeMode = MODES.find((item) => item.value === mode) ?? MODES[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New post"
      description={`Times are read in ${timezone}.`}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={submitting} className="gap-1.5">
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : mode === "schedule" ? (
              <CalendarClock className="h-3.5 w-3.5" />
            ) : mode === "draft" ? (
              <FileText className="h-3.5 w-3.5" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {submitting ? "Working…" : activeMode.submit}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Content" hint={`${content.length}/${MAX_LENGTH} characters`}>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, MAX_LENGTH))}
            placeholder="What do you want to say?"
            className="min-h-28"
          />
        </Field>

        <Field label="Action" hint={activeMode.hint}>
          <Select
            value={mode}
            onChange={(event) => setMode(event.target.value as PostMode)}
          >
            {MODES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        {mode === "schedule" ? (
          <Field label="Date and time">
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
            />
          </Field>
        ) : null}

        <Field label="Accounts">
          {accounts.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground">
              No connected accounts. Connect one in Settings first.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-xs transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(account.id)}
                    onChange={() => toggle(account.id)}
                    className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                  />
                  <PlatformBadge platform={account.platform} size="sm" />
                  <span className="font-medium">{account.displayName}</span>
                  <span className="text-muted-foreground">@{account.handle}</span>
                </label>
              ))}
            </div>
          )}
        </Field>

        {error ? (
          <p className="flex items-start gap-1.5 text-[11px] text-destructive">
            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
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
        return "Your Zernio plan does not cover publishing to this platform yet.";
      }
      if (error) return error;
    }
    if (typeof detail === "string") return detail;
  } catch {
    /* fall through to the raw message */
  }
  return raw;
}
