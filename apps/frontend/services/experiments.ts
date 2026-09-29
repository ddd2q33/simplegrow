import type { Experiment, ExperimentStatus } from "@/lib/types";
import { mutate, query } from "@/lib/api";
import { experiments as seedExperiments } from "@/lib/mock/experiments";

/** In-browser store so prototype mutations survive client-side navigation. */
let store: Experiment[] | null = null;

function experiments(): Experiment[] {
  store ??= structuredClone(seedExperiments);
  return store;
}

export interface ExperimentInput {
  name: string;
  hypothesis: string;
  platform: Experiment["platform"];
  primaryMetric: string;
}

export function getExperiments() {
  return query<Experiment[]>("/experiments", () => experiments());
}

export function getExperiment(id: string) {
  return query<Experiment | null>(`/experiments/${id}`, () =>
    experiments().find((item) => item.id === id) ?? null,
  );
}

export function updateExperimentStatus(id: string, status: ExperimentStatus) {
  return mutate<Experiment>(
    `/experiments/${id}/status`,
    () => {
      const experiment = experiments().find((item) => item.id === id);
      if (!experiment) throw new Error(`Experiment ${id} not found`);

      experiment.status = status;
      if (status === "completed") {
        experiment.endedAt = new Date().toISOString();
      }
      return experiment;
    },
    { method: "PATCH", body: { status } },
  );
}

export function createExperiment(input: ExperimentInput) {
  return mutate<Experiment>(
    "/experiments",
    () => {
      const created: Experiment = {
        id: `exp_${Math.random().toString(36).slice(2, 8)}`,
        name: input.name,
        hypothesis: input.hypothesis,
        platform: input.platform,
        status: "running",
        primaryMetric: input.primaryMetric,
        confidence: 0,
        startedAt: new Date().toISOString(),
        endedAt: null,
        winnerVariantId: null,
        variants: [
          {
            id: "var_a",
            name: "Variant A",
            trafficPct: 50,
            impressions: 0,
            conversions: 0,
            rate: 0,
          },
          {
            id: "var_b",
            name: "Variant B",
            trafficPct: 50,
            impressions: 0,
            conversions: 0,
            rate: 0,
          },
        ],
        aiVerdict: null,
      };

      experiments().unshift(created);
      return created;
    },
    { method: "POST", body: input },
  );
}
