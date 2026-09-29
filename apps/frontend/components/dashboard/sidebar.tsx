"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    group: "Analysis",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/audience", label: "Audience", icon: Users },
    ],
  },
  {
    group: "Execution",
    items: [
      { href: "/dashboard/content", label: "Content", icon: FileText },
      { href: "/dashboard/experiments", label: "Experiments", icon: FlaskConical },
      { href: "/dashboard/reports", label: "Reports", icon: Sparkles },
    ],
  },
  {
    group: "Workspace",
    items: [{ href: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex w-60 shrink-0 flex-col border-r border-border bg-card",
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-border px-5">
        <Logo />
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {NAV.map((section) => (
          <div key={section.group} className="mb-4 last:mb-0">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {section.group}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-md bg-muted/60 p-3">
          <p className="text-[11px] font-medium">Growth plan</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            4 of 5 channels connected
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full w-4/5 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </aside>
  );
}
