"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlatformBadge } from "./platform-badge";
import { CATEGORY_ICON } from "./insight-card";
import { setRecommendationStatus } from "@/services/workspace";
import { formatPercent, formatRelativeTime } from "@/lib/utils";
import { FIXTURE_NOW } from "@/lib/mock/core";
import type { Recommendation } from "@/lib/types";

const PRIORITY_VARIANT = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
} as const;

export function RecommendationCard({
  recommendation,
  onChange,
}: {
  recommendation: Recommendation;
  onChange?: (updated: Recommendation) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const Icon = CATEGORY_ICON[recommendation.category];
  const closed = recommendation.status !== "open";

  function update(status: Recommendation["status"]) {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await setRecommendationStatus(recommendation.id, status);
        onChange?.(updated);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Update failed");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{recommendation.title}</h3>
            <Badge variant={PRIORITY_VARIANT[recommendation.priority]} size="sm">
              {recommendation.priority}
            </Badge>
            {recommendation.platform !== "all" ? (
              <PlatformBadge platform={recommendation.platform} size="sm" />
            ) : null}
          </div>

          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {recommendation.detail}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Effort: {recommendation.effort}</span>
            <span>{formatRelativeTime(recommendation.createdAt, FIXTURE_NOW)}</span>
            {recommendation.estimatedImpactPct > 0 ? (
              <span className="text-success">
                est. +{formatPercent(recommendation.estimatedImpactPct, 0)} reach
              </span>
            ) : null}
          </div>

          {recommendation.estimatedImpactPct > 0 ? (
            <Progress
              value={Math.min(recommendation.estimatedImpactPct * 4, 100)}
              className="mt-3"
              barClassName="bg-success"
            />
          ) : null}

          {error ? (
            <p className="mt-2 text-[11px] text-destructive">{error}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {closed ? (
            <Badge
              variant={recommendation.status === "applied" ? "success" : "secondary"}
              size="sm"
            >
              {recommendation.status}
            </Badge>
          ) : (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => update("applied")}
                className="gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => update("dismissed")}
                className="gap-1.5 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Dismiss
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export function RecommendationSkeleton() {
  return (
    <Card className="flex items-start gap-3 p-5">
      <div className="h-8 w-8 shrink-0 rounded-md bg-muted" />
      <div className="flex-1">
        <div className="h-3.5 w-2/3 rounded bg-muted" />
        <div className="mt-2 h-3 w-full rounded bg-muted" />
        <div className="mt-1.5 h-3 w-4/5 rounded bg-muted" />
      </div>
    </Card>
  );
}

export function AiBadge() {
  return (
    <Badge variant="default" size="sm" className="gap-1">
      <Sparkles className="h-3 w-3" />
      AI
    </Badge>
  );
}
