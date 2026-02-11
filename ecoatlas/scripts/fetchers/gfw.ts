/**
 * Global Forest Watch fetcher.
 *
 * Uses the GFW API to get tree cover loss data for deforestation hotspots.
 *
 * API docs: https://www.globalforestwatch.org/
 * Data API: https://data-api.globalforestwatch.org/
 *
 * Returns annual tree cover loss in hectares for a geographic area.
 */

import type { Fetcher, FetcherConfig, SeriesPoint } from "./types";

// GFW uses ISO country codes or GeoJSON for spatial queries.
// For simplicity, we use country-level data filtered by threshold.
const HOTSPOT_CONFIG: Record<
  string,
  { iso: string; region?: string; threshold: number }
> = {
  "hs-001": { iso: "BRA", region: "Mato Grosso", threshold: 30 },
  "hs-007": { iso: "IDN", region: "Kalimantan", threshold: 30 },
};

const GFW_API = "https://data-api.globalforestwatch.org";

type TreeLossEntry = {
  umd_tree_cover_loss__year?: number;
  year?: number;
  area__ha?: number;
  umd_tree_cover_loss__ha?: number;
  [key: string]: unknown;
};

export const fetchGfw: Fetcher = async (
  config: FetcherConfig
): Promise<SeriesPoint[]> => {
  const mapping = HOTSPOT_CONFIG[config.hotspotId];
  if (!mapping) {
    console.log(`  [gfw] No mapping for ${config.hotspotId}, skipping`);
    return [];
  }

  // Use the GFW dataset endpoint for tree cover loss by country
  // This endpoint provides annual tree cover loss data
  const url = `${GFW_API}/dataset/umd_tree_cover_loss/v1.11/query/json?sql=SELECT umd_tree_cover_loss__year, SUM(area__ha) as umd_tree_cover_loss__ha FROM data WHERE iso = '${mapping.iso}' AND umd_tree_cover_density_2000__threshold >= ${mapping.threshold} GROUP BY umd_tree_cover_loss__year ORDER BY umd_tree_cover_loss__year`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`GFW API ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      data?: TreeLossEntry[];
      [key: string]: unknown;
    };
    const entries: TreeLossEntry[] = json.data ?? (Array.isArray(json) ? json : []);

    const series: SeriesPoint[] = [];
    for (const entry of entries) {
      const year =
        entry.umd_tree_cover_loss__year ?? entry.year;
      const area =
        entry.umd_tree_cover_loss__ha ?? entry.area__ha;

      if (!year || area === undefined || !Number.isFinite(area)) continue;

      series.push({
        date: String(year),
        // Convert hectares to thousands of hectares for readability
        value: Number((area / 1000).toFixed(1)),
      });
    }

    return series.sort((a, b) => Number(a.date) - Number(b.date));
  } catch (err) {
    console.error(`  [gfw] Failed for ${config.hotspotId}: ${err}`);
    return [];
  }
};
