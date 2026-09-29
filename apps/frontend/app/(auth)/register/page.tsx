"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { register } from "@/services/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    workspaceName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.fullName.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (form.workspaceName.trim().length < 2) {
      setError("Enter a workspace name.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPending(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed");
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Create your workspace</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your channels and get AI insights in minutes.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Field label="Full name">
          <Input
            name="fullName"
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder="Ada Lovelace"
          />
        </Field>

        <Field label="Workspace name">
          <Input
            name="workspaceName"
            autoComplete="organization"
            value={form.workspaceName}
            onChange={(event) => update("workspaceName", event.target.value)}
            placeholder="Northwind Studio"
          />
        </Field>

        <Field label="Email">
          <Input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="you@company.com"
          />
        </Field>

        <Field label="Password" hint="At least 8 characters.">
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? "Creating workspace…" : "Create workspace"}
          {!pending ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
