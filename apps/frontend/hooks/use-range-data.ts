"use client";

import { useEffect, useRef, useState } from "react";
import { useDashboardFilters } from "@/components/dashboard/filters";
import type { DateRangeKey } from "@/lib/types";

/**
 * Keeps a range-scoped dataset in sync with the dashboard filter context.
 * Pages pass server-rendered data for `initialRange`, so the first paint is
 * complete and further range changes load through the service layer.
 */
export function useRangeData<T>(
  load: (range: DateRangeKey) => Promise<T>,
  initial: T,
  initialRange: DateRangeKey = "30d",
) {
  const { range } = useDashboardFilters();
  const [state, setState] = useState({ data: initial, range: initialRange });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (range === state.range) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadRef
      .current(range)
      .then((data) => {
        if (cancelled) return;
        setState({ data, range });
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Failed to load data");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, state.range]);

  return { data: state.data, loading, error, range: state.range };
}
