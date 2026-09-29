import { cn } from "@/lib/utils";
import { PLATFORM_META } from "@/lib/mock/core";
import type { Platform } from "@/lib/types";

const SIZES = {
  sm: "h-5 w-5 text-[9px]",
  md: "h-7 w-7 text-[10px]",
  lg: "h-9 w-9 text-xs",
} as const;

const GLYPHS: Record<Platform, string> = {
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  twitter: "X",
  facebook: "FB",
};

export function PlatformBadge({
  platform,
  size = "md",
  showLabel = false,
  className,
}: {
  platform: Platform;
  size?: keyof typeof SIZES;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = PLATFORM_META[platform];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md font-bold tracking-tight",
          SIZES[size],
        )}
        style={{ backgroundColor: meta.brand, color: meta.text }}
        aria-hidden="true"
      >
        {GLYPHS[platform]}
      </span>
      {showLabel ? (
        <span className="text-xs font-medium text-muted-foreground">
          {meta.label}
        </span>
      ) : null}
    </span>
  );
}
