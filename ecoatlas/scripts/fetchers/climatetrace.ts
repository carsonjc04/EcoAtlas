/**
 * Climate TRACE fetcher — satellite-derived emissions by country and sector.
 *
 * Climate TRACE (https://climatetrace.org/) provides facility- and country-level
 * emissions estimates using satellite imagery and AI. This fetcher pulls
 * country-level timeseries data for fossil fuel driver hotspots.
 *
 * Coverage:
 *   hs-001: Brazil — forest land clearing (CO2e)
 *   hs-006: Saudi Arabia — oil & gas production (CO2)
 *   hs-008: China — coal mining (CO2)
 *   hs-009: USA — oil & gas production (CH4)
 *
 * The API has gone through multiple versions. We try the v6 endpoint first
 * and fall back to the older v4 API at api.c10e.org if v6 fails.
 */

import type { Fetcher, FetcherConfig, SeriesPoint } from "./types";

const BASE_URL = "https://api.climatetrace.org/v6";

// Each hotspot maps to a specific country + sector + gas combination.
// The gas field determines which emissions value to extract from the response
// (the API returns multiple gases per entry).
const HOTSPOT_CONFIG: Record<
  string,
  { country: string; sector: string; gas: string }
> = {
  "hs-001": {
    country: "BRA",
    sector: "forest-land-clearing",
    gas: "co2e_100yr",
  },
  "hs-006": {
    country: "SAU",
    sector: "oil-and-gas-production-and-transport",
    gas: "co2",
  },
  "hs-008": {
    country: "CHN",
    sector: "coal-mining",
    gas: "co2",
  },
  "hs-009": {
    country: "USA",
    sector: "oil-and-gas-production-and-transport",
    gas: "ch4",
  },
};

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Climate TRACE API ${response.status}: ${url}`);
  }
  return response.json();
}

type TimeseriesEntry = {
  year?: number;
  date?: string;
  emissions?: Record<string, number>;
  co2?: number;
  ch4?: number;
  co2e_100yr?: number;
  [key: string]: unknown;
};

/**
 * Extracts a sorted SeriesPoint[] from an array of API response entries.
 * Handles two response shapes: emissions nested in an `emissions` object,
 * or flat top-level gas fields. Values > 1M are assumed to be in tonnes
 * and are converted to megatonnes for display consistency.
 */
function extractSeries(entries: TimeseriesEntry[], gas: string): SeriesPoint[] {
  const series: SeriesPoint[] = [];
  for (const entry of entries) {
    const year = entry.year ?? (entry.date ? parseInt(entry.date) : null);
    if (!year) continue;

    let value: number | undefined;
    if (entry.emissions && typeof entry.emissions === "object") {
      value = entry.emissions[gas];
    }
    if (value === undefined) {
      value =
        (entry as Record<string, unknown>)[gas] as number | undefined;
    }
    if (value === undefined || !Number.isFinite(value)) continue;

    const mtValue = value > 1_000_000 ? value / 1_000_000 : value;

    series.push({
      date: String(year),
      value: Number(mtValue.toFixed(3)),
    });
  }
  return series.sort((a, b) => Number(a.date) - Number(b.date));
}

export const fetchClimatTrace: Fetcher = async (
  config: FetcherConfig
): Promise<SeriesPoint[]> => {
  const mapping = HOTSPOT_CONFIG[config.hotspotId];
  if (!mapping) {
    console.log(
      `  [climatetrace] No mapping for ${config.hotspotId}, skipping`
    );
    return [];
  }

  const url = `${BASE_URL}/country/emissions/timeseries?since=2015&to=2023&countries=${mapping.country}&sectors=${mapping.sector}`;

  try {
    const data = await fetchJson(url);
    const entries: TimeseriesEntry[] = Array.isArray(data)
      ? data
      : (data as { data?: TimeseriesEntry[] }).data ?? [];

    return extractSeries(entries, mapping.gas);
  } catch (err) {
    // v6 endpoint is occasionally unstable; try the older API as a fallback
    console.log(`  [climatetrace] v6 failed, trying fallback API...`);
    const fallbackUrl = `https://api.c10e.org/v4/country/emissions/timeseries?since=2015&to=2023&countries=${mapping.country}&sectors=${mapping.sector}&download=json&combined=false`;

    try {
      const data = await fetchJson(fallbackUrl);
      const entries: TimeseriesEntry[] = Array.isArray(data) ? data : [];
      return extractSeries(entries, mapping.gas);
    } catch (fallbackErr) {
      console.error(`  [climatetrace] Fallback also failed: ${fallbackErr}`);
      return [];
    }
  }
};
