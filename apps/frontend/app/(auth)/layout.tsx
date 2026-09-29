import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-border bg-card lg:block">
        <div className="grid-fade absolute inset-0 opacity-60" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Prototype
            </p>
            <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-tight tracking-tight">
              Every channel, every metric, one growth loop.
            </h2>
          </div>

          <ul className="flex flex-col gap-4 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Analytics</span> — reach,
              views and engagement across five platforms.
            </li>
            <li>
              <span className="font-medium text-foreground">Audience</span> — segments,
              demographics and peak activity windows.
            </li>
            <li>
              <span className="font-medium text-foreground">AI insights</span> — what
              changed, why it changed, what to do next.
            </li>
          </ul>

          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </aside>
    </main>
  );
}
