import type { AccountId, DataScope, Experiment, ExperimentStatus } from "@/lib/types";
import { ALL_ACCOUNTS } from "@/lib/types";
import { mutate, query } from "@/lib/api";
import {
  experiments as seedExperiments,
  experimentsInScope,
} from "@/lib/mock/experiments";
import { getAccount } from "@/lib/mock/accounts";

/** In-browser store so prototype mutations survive client-side navigation. */
let store: Experiment[] | null = null;

function experiments(): Experiment[] {
  store ??= structuredClone(seedExperiments);
  return store;
}

export interface ExperimentInput {
  accountId: AccountId;
  name: string;
  hypothesis: string;
  platform: Experiment["platform"];
  primaryMetric: string;
}

function scopeParams(scope: DataScope): string {
  const params = new URLSearchParams({ range: scope.range });
  if (scope.accountId !== ALL_ACCOUNTS) params.set("account_id", scope.accountId);
  if (scope.platform !== "all") params.set("platform", scope.platform);
  return params.toString();
}

export function getExperiments(scope: DataScope) {
  return query<Experiment[]>(`/experiments?${scopeParams(scope)}`, () =>
    experimentsInScope(scope),
  );
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
      const account = getAccount(input.accountId);
      if (!account) throw new Error(`Account ${input.accountId} not found`);

      const created: Experiment = {
        id: `exp_${Math.random().toString(36).slice(2, 8)}`,
        accountId: input.accountId,
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
