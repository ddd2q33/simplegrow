import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 7h-6M21 7v6" strokeLinecap="round" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="text-sm font-semibold tracking-tight">SimpleGrow</span>
      ) : null}
    </span>
  );
}
