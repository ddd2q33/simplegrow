import { Clock, Megaphone, Sparkles, Target, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "./platform-badge";
import { formatPercent, formatRelativeTime } from "@/lib/utils";
import { FIXTURE_NOW } from "@/lib/mock/core";
import type { Insight, InsightCategory } from "@/lib/types";

export const CATEGORY_ICON: Record<InsightCategory, LucideIcon> = {
  audience: Users,
  content: Sparkles,
  timing: Clock,
  cadence: Target,
  conversion: Megaphone,
};

export const IMPACT_VARIANT = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
} as const;

export function InsightCard({ insight }: { insight: Insight }) {
  const Icon = CATEGORY_ICON[insight.category];

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{insight.title}</h3>
            <Badge variant={IMPACT_VARIANT[insight.impact]} size="sm">
              {insight.impact} impact
            </Badge>
            {insight.platform !== "all" ? (
              <PlatformBadge platform={insight.platform} size="sm" />
            ) : null}
          </div>

          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {insight.detail}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Confidence {formatPercent(insight.confidence, 0)}</span>
            <span>{formatRelativeTime(insight.createdAt, FIXTURE_NOW)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
