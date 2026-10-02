"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardFilters } from "@/components/dashboard/filters";
import type { DataScope } from "@/lib/types";

function scopeKey(scope: DataScope): string {
  return `${scope.range}|${scope.accountId}|${scope.platform}`;
}

/**
 * Keeps a scope-scoped dataset in sync with the dashboard filter context.
 * Pages pass server-rendered data for `initialScope`, so the first paint is
 * complete; later range, account or platform changes load through the
 * service layer. Renders the previous dataset while a new scope loads, which
 * avoids a layout jump on every account switch.
 */
export function useScopedData<T>(
  load: (scope: DataScope) => Promise<T>,
  initial: T,
  initialScope: DataScope,
) {
  const { scope } = useDashboardFilters();
  const [state, setState] = useState({ data: initial, key: scopeKey(initialScope) });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRef = useRef(load);
  loadRef.current = load;

  const key = useMemo(() => scopeKey(scope), [scope]);

  useEffect(() => {
    if (key === state.key) return;

    let cancelled = false;
    setPendingKey(key);
    setError(null);

    loadRef
      .current(scope)
      .then((data) => {
        if (cancelled) return;
        setState({ data, key });
        setPendingKey(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Failed to load data");
        setPendingKey(null);
      });

    return () => {
      cancelled = true;
    };
    // `scope` is captured in `key`, so the effect only re-runs on real changes.
  }, [key, scope, state.key]);

  return {
    data: state.data,
    loading: pendingKey !== null,
    error,
    scope,
  };
}
