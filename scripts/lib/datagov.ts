import { fetchWithRetry, sleep } from "./http";

const METADATA_URL = "https://api-production.data.gov.sg/v2/public/api/datasets";
const DOWNLOAD_URL = "https://api-open.data.gov.sg/v1/public/api/datasets";

export interface DatasetMeta {
  id: string;
  name: string;
  lastUpdatedAt: string;
  pageUrl: string;
}

interface ApiEnvelope<T> {
  code: number;
  data: T | null;
  errorMsg?: string;
}

// An optional key raises data.gov.sg's anonymous rate limit; it is not required.
function headers(): Record<string, string> {
  const key = process.env.DATAGOV_API_KEY;
  return key ? { "x-api-key": key } : {};
}

/** data.gov.sg reports rate limiting as HTTP 200 with code 24, so retry on that too. */
async function getJson<T>(url: string): Promise<T> {
  for (let i = 0; i < 8; i++) {
    const res = await fetchWithRetry(url, { headers: headers() });
    const body = (await res.json()) as ApiEnvelope<T>;
    if (body.code === 0 && body.data) return body.data;
    if (body.code !== 24) throw new Error(`data.gov.sg error ${body.code}: ${body.errorMsg ?? "unknown"}`);
    await sleep(11_000);
  }
  throw new Error(`data.gov.sg kept rate-limiting ${url}`);
}

export async function fetchMetadata(id: string): Promise<DatasetMeta> {
  const data = await getJson<{ name: string; lastUpdatedAt: string }>(`${METADATA_URL}/${id}/metadata`);
  return { id, name: data.name, lastUpdatedAt: data.lastUpdatedAt, pageUrl: `https://data.gov.sg/datasets/${id}/view` };
}

/** Full-file download: initiate, then poll until a signed S3 URL is ready. */
export async function downloadDataset(id: string): Promise<string> {
  await getJson<unknown>(`${DOWNLOAD_URL}/${id}/initiate-download`);
  for (let i = 0; i < 20; i++) {
    await sleep(3_000);
    const poll = await getJson<{ status?: string; url?: string }>(`${DOWNLOAD_URL}/${id}/poll-download`);
    if (poll.url) {
      const res = await fetchWithRetry(poll.url);
      if (!res.ok) throw new Error(`Download of ${id} failed: HTTP ${res.status}`);
      return res.text();
    }
  }
  throw new Error(`Download of ${id} was not ready after polling`);
}
