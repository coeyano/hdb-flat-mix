import { fetchWithRetry, sleep } from "./http";

export interface OneMapResult {
  BLK_NO: string;
  ROAD_NAME: string;
  POSTAL: string;
  LATITUDE: string;
  LONGITUDE: string;
}

const SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search";
// OneMap allows ~250 requests/minute; stay well under it.
const MIN_GAP_MS = 350;
let lastCall = 0;
let tokenWarningShown = false;

export async function oneMapSearch(searchVal: string): Promise<OneMapResult[]> {
  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();

  const params = new URLSearchParams({ searchVal, returnGeom: "Y", getAddrDetails: "Y", pageNum: "1" });
  const token = process.env.ONEMAP_TOKEN;
  const res = await fetchWithRetry(`${SEARCH_URL}?${params}`, token ? { headers: { Authorization: token } } : {});
  if (!res.ok) throw new Error(`OneMap HTTP ${res.status} for "${searchVal}"`);
  const body = (await res.json()) as { results?: OneMapResult[]; error?: string };
  if (body.error && !tokenWarningShown) {
    tokenWarningShown = true;
    console.warn(`  ! OneMap says: "${body.error}" (results still returned). If lookups start failing, set ONEMAP_TOKEN.`);
  }
  return body.results ?? [];
}
