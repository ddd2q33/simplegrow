"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, LogOut, Search, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { logout, readStoredSession } from "@/services/auth";
import { getNotifications } from "@/services/workspace";
import { formatRelativeTime } from "@/lib/utils";
import { FIXTURE_NOW } from "@/lib/mock/core";
import type { Notification, User } from "@/lib/types";

function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);

  return ref;
}

export function Topbar({ workspaceName }: { workspaceName: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [openPanel, setOpenPanel] = useState<"none" | "notifications" | "user">("none");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setUser(readStoredSession());
    getNotifications().then(setNotifications).catch(() => setNotifications([]));
  }, []);

  const unread = notifications.filter((item) => !item.read).length;
  const close = () => setOpenPanel("none");

  const panelRef = useClickOutside<HTMLDivElement>(close);

  async function onSignOut() {
    await logout();
    router.push("/login");
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-6"
      ref={panelRef}
    >
      <span className="truncate text-sm font-medium">{workspaceName}</span>
      <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline-flex">
        Growth
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search content, reports…"
            aria-label="Search"
            className="h-8 w-56 rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <ThemeToggle />

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
            onClick={() => setOpenPanel(openPanel === "notifications" ? "none" : "notifications")}
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
            ) : null}
          </Button>

          {openPanel === "notifications" ? (
            <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-xs font-semibold">Notifications</p>
                <span className="text-[11px] text-muted-foreground">{unread} unread</span>
              </div>
              <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-border px-4 py-3 last:border-0 hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-2">
                      {!item.read ? (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      ) : (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{item.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {item.body}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatRelativeTime(item.createdAt, FIXTURE_NOW)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenPanel(openPanel === "user" ? "none" : "user")}
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted"
          >
            <Avatar name={user?.fullName ?? "Guest User"} size="sm" />
          </button>

          {openPanel === "user" ? (
            <div className="absolute right-0 top-11 w-60 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-xs font-semibold">
                  {user?.fullName ?? "Guest User"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {user?.email ?? "Not signed in"}
                </p>
              </div>
              <div className="p-1">
                <LinkRow
                  href="/dashboard/settings"
                  onNavigate={close}
                  icon={UserIcon}
                >
                  Account settings
                </LinkRow>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function LinkRow({
  href,
  onNavigate,
  icon: Icon,
  children,
}: {
  href: string;
  onNavigate: () => void;
  icon: typeof Check;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}
