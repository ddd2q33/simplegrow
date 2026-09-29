import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grid-fade flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 7h-6M21 7v6" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="text-lg font-semibold tracking-tight">SimpleGrow</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          AI growth dashboard for social teams.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Create a workspace
          </Link>
          <Link
            href="/dashboard"
            className="pt-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip to the dashboard
          </Link>
        </div>

        <p className="mt-6 border-t border-border pt-4 text-[11px] text-muted-foreground">
          Prototype build — running on local fixture data. The FastAPI backend is
          not connected yet.
        </p>
      </div>
    </main>
  );
}
