/**
 * Climate TRACE fetcher.
 *
 * Uses the Climate TRACE API (api.climatetrace.org) to pull country-level
 * emissions data by sector. Covers fossil fuel driver hotspots.
 *
 * API docs: https://climatetrace.org/data
 *
 * Sectors used:
 *  - oil-and-gas-production-and-transport
 *  - coal-mining
 *  - other-fossil-fuel-operations (flaring)
 */

import type { Fetcher, FetcherConfig, SeriesPoint } from "./types";

const BASE_URL = "https://api.climatetrace.org/v6";

// Map hotspot IDs to the Climate TRACE country code + sector
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

  // Try the v6 country emissions timeseries endpoint
  const url = `${BASE_URL}/country/emissions/timeseries?since=2015&to=2023&countries=${mapping.country}&sectors=${mapping.sector}`;

  try {
    const data = await fetchJson(url);

    // The API returns an array of yearly entries or an object with a data array
    const entries: TimeseriesEntry[] = Array.isArray(data)
      ? data
      : (data as { data?: TimeseriesEntry[] }).data ?? [];

    const series: SeriesPoint[] = [];
    for (const entry of entries) {
      const year = entry.year ?? (entry.date ? parseInt(entry.date) : null);
      if (!year) continue;

      // Try to extract the right gas value
      let value: number | undefined;
      if (entry.emissions && typeof entry.emissions === "object") {
        value = entry.emissions[mapping.gas];
      }
      if (value === undefined) {
        value =
          (entry as Record<string, unknown>)[mapping.gas] as number | undefined;
      }
      if (value === undefined || !Number.isFinite(value)) continue;

      // Convert tonnes to Mt
      const mtValue = value > 1_000_000 ? value / 1_000_000 : value;

      series.push({
        date: String(year),
        value: Number(mtValue.toFixed(3)),
      });
    }

    return series.sort((a, b) => Number(a.date) - Number(b.date));
  } catch (err) {
    // Fallback: try the older API at api.c10e.org
    console.log(`  [climatetrace] v6 failed, trying fallback API...`);
    const fallbackUrl = `https://api.c10e.org/v4/country/emissions/timeseries?since=2015&to=2023&countries=${mapping.country}&sectors=${mapping.sector}&download=json&combined=false`;

    try {
      const data = await fetchJson(fallbackUrl);
      const entries: TimeseriesEntry[] = Array.isArray(data) ? data : [];

      const series: SeriesPoint[] = [];
      for (const entry of entries) {
        const year = entry.year ?? (entry.date ? parseInt(entry.date) : null);
        if (!year) continue;

        let value: number | undefined;
        if (entry.emissions && typeof entry.emissions === "object") {
          value = entry.emissions[mapping.gas];
        }
        if (value === undefined) {
          value =
            (entry as Record<string, unknown>)[mapping.gas] as
              | number
              | undefined;
        }
        if (value === undefined || !Number.isFinite(value)) continue;

        const mtValue = value > 1_000_000 ? value / 1_000_000 : value;
        series.push({
          date: String(year),
          value: Number(mtValue.toFixed(3)),
        });
      }

      return series.sort((a, b) => Number(a.date) - Number(b.date));
    } catch (fallbackErr) {
      console.error(`  [climatetrace] Fallback also failed: ${fallbackErr}`);
      return [];
    }
  }
};
