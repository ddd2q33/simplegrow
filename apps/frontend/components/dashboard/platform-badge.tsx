import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { cn } from "@/lib/utils";
import { PLATFORM_META } from "@/lib/mock/core";
import type { Platform } from "@/lib/types";

/** Official brand marks, monochrome so the brand colour is applied by us. */
const PLATFORM_ICONS: Record<Platform, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  twitter: SiX,
  facebook: SiFacebook,
};

/**
 * TikTok's mark is near-black, which disappears on the dark card background.
 * These fall back to the brand colour unless a contrast-safe one is needed.
 */
const DARK_BRAND: Partial<Record<Platform, string>> = {
  tiktok: "#25F4EE",
};

const SIZES = {
  sm: { box: "h-5 w-5", icon: "h-3.5 w-3.5" },
  md: { box: "h-7 w-7", icon: "h-4 w-4" },
  lg: { box: "h-9 w-9", icon: "h-5 w-5" },
} as const;

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
  const Icon = PLATFORM_ICONS[platform];
  const { box, icon } = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md [--pc-dark:var(--pc)]",
          "bg-[var(--pc)] text-[var(--pc-text)] dark:bg-[var(--pc-dark)] dark:text-[var(--pc-dark-text)]",
          box,
        )}
        style={
          {
            "--pc": meta.brand,
            "--pc-text": meta.text,
            "--pc-dark": DARK_BRAND[platform] ?? meta.brand,
            "--pc-dark-text": DARK_BRAND[platform] ? "#111111" : meta.text,
          } as CSSProperties
        }
        aria-hidden="true"
      >
        <Icon className={icon} />
      </span>
      {showLabel ? (
        <span className="text-xs font-medium text-muted-foreground">
          {meta.label}
        </span>
      ) : null}
    </span>
  );
}

/** Icon-only variant for dense rows and switchers. */
export function PlatformIcon({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  const meta = PLATFORM_META[platform];
  const Icon = PLATFORM_ICONS[platform];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 leading-none [--pc-dark:var(--pc)]",
        "text-[var(--pc)] dark:text-[var(--pc-dark)]",
        className,
      )}
      style={
        {
          "--pc": meta.brand,
          "--pc-dark": DARK_BRAND[platform] ?? meta.brand,
        } as CSSProperties
      }
      title={meta.label}
      role="img"
      aria-label={meta.label}
    >
      <Icon />
    </span>
  );
}
