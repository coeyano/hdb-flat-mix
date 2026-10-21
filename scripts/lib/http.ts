export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** fetch with retries on network errors, HTTP 429 and 5xx. */
export async function fetchWithRetry(url: string, init: RequestInit = {}, attempts = 6): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
    await sleep(Math.min(2_000 * 2 ** i, 30_000));
  }
  throw new Error(`Giving up on ${new URL(url).host}${new URL(url).pathname}: ${String(lastError)}`);
}
