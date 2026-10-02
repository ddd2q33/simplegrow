export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * The prototype runs against in-repo fixtures. Flip to `false` (and start the
 * FastAPI backend) to serve every request from the real API with no other
 * code change — the service layer signatures are the contract.
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(
      detail || `${method} ${path} failed with status ${response.status}`,
      response.status,
      path,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Artificial latency in the browser only, so loading states are actually visible. */
async function mockLatency() {
  if (typeof window === "undefined") return;
  const ms = 140 + Math.random() * 180;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The backend is being built module by module. While some routes are not
 * implemented yet they answer 404, so a live request falls back to its fixture
 * instead of blanking the page. Remove this once every route exists.
 */
async function withFallback<T>(
  path: string,
  mock: () => T | Promise<T>,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await mockLatency();
      return mock();
    }
    throw error;
  }
}

/** Read through the API. Serves fixtures while `USE_MOCK` is on. */
export async function query<T>(
  path: string,
  mock: () => T | Promise<T>,
  init?: RequestOptions,
): Promise<T> {
  if (USE_MOCK) {
    await mockLatency();
    return mock();
  }
  return withFallback(path, mock, () => apiFetch<T>(path, init));
}

/** Write through the API. Applies the fixture mutation while `USE_MOCK` is on. */
export async function mutate<T>(
  path: string,
  mock: () => T | Promise<T>,
  init: RequestOptions = { method: "POST" },
): Promise<T> {
  if (USE_MOCK) {
    await mockLatency();
    return mock();
  }
  return withFallback(path, mock, () => apiFetch<T>(path, init));
}
