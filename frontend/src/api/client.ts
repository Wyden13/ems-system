export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(
    status: number,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
let accessToken: string | null = null;
let epoch = 0;
let refreshPending: Promise<void> | null = null;
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("ems-session")
    : null;
export function clearSession(broadcast = true) {
  accessToken = null;
  epoch++;
  window.dispatchEvent(new Event("ems:session-cleared"));
  if (broadcast) channel?.postMessage("logout");
}
channel?.addEventListener("message", ({ data }) => {
  if (data === "logout") clearSession(false);
});
async function decode<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const fields = Object.fromEntries(
      (body?.errors ?? body?.validationErrors ?? []).map(
        (e: { field: string; message: string }) => [e.field, e.message],
      ),
    );
    throw new ApiError(
      response.status,
      body?.message ?? `Request failed (${response.status}). Please try again.`,
      fields,
    );
  }
  return body as T;
}
async function sessionRequest<T>(path: string, body?: unknown): Promise<T> {
  const csrf = await decode<{ token: string; headerName: string }>(
    await fetch("/api/v1/auth/csrf", {
      credentials: "same-origin",
      cache: "no-store",
    }),
  );
  return decode<T>(
    await fetch(`/api/v1/auth/${path}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        [csrf.headerName]: csrf.token,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}
async function sessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (navigator.locks)
    return navigator.locks.request("ems-cookie-session", action);
  return action();
}
export async function login(email: string, password: string) {
  await sessionLock(async () => {
    const session = await sessionRequest<{ accessToken: string }>("login", {
      email,
      password,
    });
    epoch++;
    accessToken = session.accessToken;
    channel?.postMessage("logout");
  });
}
export async function refreshSession() {
  if (!refreshPending) {
    const started = epoch;
    refreshPending = sessionLock(async () => {
      const session = await sessionRequest<{ accessToken: string }>("refresh");
      if (started === epoch) {
        accessToken = session.accessToken;
        window.dispatchEvent(new Event("ems:session-refreshed"));
      }
    })
      .catch((error) => {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          started === epoch
        )
          clearSession();
        throw error;
      })
      .finally(() => {
        refreshPending = null;
      });
  }
  return refreshPending;
}
export async function logout() {
  await sessionLock(() => sessionRequest<void>("logout"));
  clearSession();
}
export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const started = epoch;
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (started !== epoch)
    throw new ApiError(401, "Your session has ended. Please sign in again.");
  if (response.status === 401 && retry && !init.signal?.aborted) {
    await refreshSession();
    if (started !== epoch)
      throw new ApiError(401, "Your session has ended. Please sign in again.");
    return api<T>(path, init, false);
  }
  if (response.status === 401) clearSession();
  return decode<T>(response);
}
export const send = <T>(path: string, method: string, body?: unknown) =>
  api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export function params(
  values: Record<string, string | number | boolean | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") query.set(key, String(value));
  return query.toString();
}
