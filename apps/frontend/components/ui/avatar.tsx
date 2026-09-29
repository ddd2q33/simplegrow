import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
} as const;

const PALETTE = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

function initialsFrom(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)}
      />
    );
  }

  const paletteIndex = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return (
    <div
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        PALETTE[paletteIndex % PALETTE.length],
        SIZES[size],
        className,
      )}
    >
      {initialsFrom(name)}
    </div>
  );
}
