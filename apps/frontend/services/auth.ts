"use client";

import { mutate, query } from "@/lib/api";
import { currentUser, workspace } from "@/lib/mock/core";
import type { User } from "@/lib/types";

const SESSION_KEY = "simplegrow.session";

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterInput extends Credentials {
  fullName: string;
  workspaceName: string;
}

export function readStoredSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function login({ email }: Credentials) {
  return mutate<User>(
    "/auth/login",
    () => {
      const user: User = { ...currentUser, email };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    },
    { method: "POST", body: { email } },
  );
}

export function register({ fullName, email }: RegisterInput) {
  return mutate<User>(
    "/auth/register",
    () => {
      const user: User = {
        ...currentUser,
        id: `usr_${Math.random().toString(36).slice(2, 8)}`,
        fullName,
        email,
        role: "owner",
        initials: fullName
          .split(" ")
          .map((part) => part.charAt(0).toUpperCase())
          .slice(0, 2)
          .join(""),
      };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    },
    { method: "POST", body: { fullName, email, workspaceName: workspace.name } },
  );
}

export function logout() {
  return mutate<{ ok: true }>(
    "/auth/logout",
    () => {
      window.localStorage.removeItem(SESSION_KEY);
      return { ok: true } as const;
    },
    { method: "POST" },
  );
}

export function whoAmI() {
  return query<User | null>("/auth/me", () => currentUser);
}
