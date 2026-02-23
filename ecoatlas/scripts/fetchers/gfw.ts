/**
 * Global Forest Watch fetcher — annual tree cover loss by country.
 *
 * Uses the GFW data API to query the UMD tree cover loss dataset, which
 * combines Landsat imagery with the Hansen Global Forest Change data.
 * Returns annual tree cover loss in thousands of hectares.
 *
 * Also aliased for INPE PRODES in the fetcher registry because both
 * track deforestation in the same regions and the GFW API covers Brazil.
 *
 * Coverage:
 *   hs-001: Brazil (Amazon/Mato Grosso) — threshold 30% canopy density
 *   hs-007: Indonesia (Kalimantan) — threshold 30% canopy density
 *
 * API: https://data-api.globalforestwatch.org/
 * The SQL endpoint allows filtering by ISO country code and minimum
 * canopy density threshold (to exclude sparse/scrub vegetation).
 */

import type { Fetcher, FetcherConfig, SeriesPoint } from "./types";

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

  // SQL query against the GFW dataset endpoint. Groups by year, sums area,
  // and filters to pixels with >= threshold % canopy density in the year 2000
  // baseline (standard practice to exclude non-forest land).
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
        // Convert to thousands of hectares for readability in charts
        value: Number((area / 1000).toFixed(1)),
      });
    }

    return series.sort((a, b) => Number(a.date) - Number(b.date));
  } catch (err) {
    console.error(`  [gfw] Failed for ${config.hotspotId}: ${err}`);
    return [];
  }
};
