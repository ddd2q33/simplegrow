"use client";

import { useMemo, useState } from "react";
import { Pause, Play, Plus, Sparkles, Trophy } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import {
  createExperiment,
  updateExperimentStatus,
} from "@/services/experiments";
import type { ExperimentInput } from "@/services/experiments";
import { formatNumber, formatPercent, formatShortDate } from "@/lib/utils";
import type { Experiment, ExperimentStatus, Platform } from "@/lib/types";

const STATUS_VARIANT: Record<
  ExperimentStatus,
  "success" | "warning" | "secondary" | "default"
> = {
  running: "default",
  completed: "success",
  draft: "secondary",
  paused: "warning",
};

const FILTERS: { key: ExperimentStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "running", label: "Running" },
  { key: "completed", label: "Completed" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Draft" },
];

export function ExperimentsView({ initial }: { initial: Experiment[] }) {
  const [experiments, setExperiments] = useState(initial);
  const [filter, setFilter] = useState<ExperimentStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "all"
        ? experiments
        : experiments.filter((item) => item.status === filter),
    [experiments, filter],
  );

  async function changeStatus(id: string, status: ExperimentStatus) {
    setPendingId(id);
    setError(null);
    try {
      const updated = await updateExperimentStatus(id, status);
      setExperiments((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }

  async function onCreate(input: ExperimentInput) {
    const created = await createExperiment(input);
    setExperiments((current) => [created, ...current]);
    setDialogOpen(false);
    setFilter("all");
  }

  return (
    <div>
      <PageHeader
        title="Experiments"
        description="A/B tests running across your channels, with an AI verdict on each."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New experiment
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => {
          const count =
            option.key === "all"
              ? experiments.length
              : experiments.filter((item) => item.status === option.key).length;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={filter === option.key}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === option.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
              <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="h-4 w-4" />}
            title="No experiments in this state"
            description="Create an A/B test to start collecting signal."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                New experiment
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              pending={pendingId === experiment.id}
              onChangeStatus={(status) => changeStatus(experiment.id, status)}
            />
          ))}
        </div>
      )}

      <CreateExperimentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={onCreate}
      />
    </div>
  );
}

function ExperimentCard({
  experiment,
  pending,
  onChangeStatus,
}: {
  experiment: Experiment;
  pending: boolean;
  onChangeStatus: (status: ExperimentStatus) => void;
}) {
  const leader = [...experiment.variants].sort((a, b) => b.rate - a.rate)[0];
  const hasSignal = experiment.variants.some((variant) => variant.impressions > 0);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PlatformBadge platform={experiment.platform} size="sm" />
            <h3 className="text-sm font-semibold">{experiment.name}</h3>
            <Badge variant={STATUS_VARIANT[experiment.status]} size="sm">
              {experiment.status}
            </Badge>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {experiment.hypothesis}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {experiment.status === "running" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onChangeStatus("paused")}
              className="gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
          ) : null}
          {experiment.status === "paused" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onChangeStatus("running")}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </Button>
          ) : null}
          {(experiment.status === "running" || experiment.status === "paused") &&
          experiment.confidence >= 90 ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => onChangeStatus("completed")}
            >
              Call it
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {experiment.variants.map((variant) => {
          const isLeader = hasSignal && variant.id === leader.id;
          return (
            <div key={variant.id} className="flex items-center gap-3">
              <span className="flex w-28 shrink-0 items-center gap-1.5 truncate text-xs">
                {isLeader ? (
                  <Trophy className="h-3 w-3 shrink-0 text-warning" />
                ) : null}
                <span className="truncate">{variant.name}</span>
              </span>
              <Progress
                value={leader.rate === 0 ? 0 : (variant.rate / leader.rate) * 100}
                barClassName={isLeader ? "bg-success" : "bg-muted-foreground"}
              />
              <span className="w-16 shrink-0 text-right text-xs tabular-nums">
                {hasSignal ? formatPercent(variant.rate, 2) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>Primary metric: {experiment.primaryMetric}</span>
        <span>
          Started {formatShortDate(experiment.startedAt)}
          {experiment.endedAt ? ` · ended ${formatShortDate(experiment.endedAt)}` : ""}
        </span>
        <span>Confidence {experiment.confidence}%</span>
      </div>

      {hasSignal ? (
        <p className="text-[11px] text-muted-foreground">
          {formatNumber(
            experiment.variants.reduce((sum, variant) => sum + variant.impressions, 0),
          )}{" "}
          impressions collected across two variants.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Not collecting yet — impressions appear once the test goes live.
        </p>
      )}

      {experiment.aiVerdict ? (
        <div className="rounded-md border border-border bg-accent/40 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-foreground">
            <Sparkles className="h-3 w-3" />
            AI verdict
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {experiment.aiVerdict}
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function CreateExperimentDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: ExperimentInput) => Promise<void>;
}) {
  const [form, setForm] = useState<ExperimentInput>({
    name: "",
    hypothesis: "",
    platform: "instagram",
    primaryMetric: "Engagement rate",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ExperimentInput>(key: K, value: ExperimentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setError(null);

    if (form.name.trim().length < 3) {
      setError("Give the experiment a name of at least 3 characters.");
      return;
    }
    if (form.hypothesis.trim().length < 10) {
      setError("Describe the hypothesis in at least 10 characters.");
      return;
    }

    setPending(true);
    try {
      await onCreate(form);
      setForm({ name: "", hypothesis: "", platform: "instagram", primaryMetric: "Engagement rate" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create experiment");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New experiment"
      description="Split traffic 50/50 between two variants and let the engine call it."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={pending}
            className="gap-1.5"
          >
            {pending ? "Creating…" : "Start experiment"}
          </Button>
        </>
      }
    >
      <form
        id="experiment-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <Field label="Experiment name">
          <Input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Question hook vs statement hook"
          />
        </Field>

        <Field label="Hypothesis">
          <Textarea
            value={form.hypothesis}
            onChange={(event) => update("hypothesis", event.target.value)}
            placeholder="If we change X, then Y will improve because…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Platform">
            <Select
              value={form.platform}
              onChange={(event) => update("platform", event.target.value as Platform)}
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="twitter">X / Twitter</option>
              <option value="facebook">Facebook</option>
            </Select>
          </Field>

          <Field label="Primary metric">
            <Select
              value={form.primaryMetric}
              onChange={(event) => update("primaryMetric", event.target.value)}
            >
              <option>Engagement rate</option>
              <option>3-second view rate</option>
              <option>Save rate</option>
              <option>Click-through rate</option>
              <option>Reach per post</option>
              <option>Comments per 1K views</option>
            </Select>
          </Field>
        </div>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
