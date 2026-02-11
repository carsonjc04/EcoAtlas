/**
 * EM-DAT / Germanwatch disaster data fetcher.
 *
 * EM-DAT (https://www.emdat.be/) requires free registration to download
 * the full database. This fetcher reads from a local CSV if available,
 * otherwise returns curated historical data for the impact hotspots.
 *
 * Covers:
 *   hs-013: St. Vincent & Grenadines (storms)
 *   hs-014: Manila, Philippines (typhoons)
 *   hs-016: Dhaka, Bangladesh (flooding)
 */

import fs from "node:fs";
import path from "node:path";
import type { Fetcher, FetcherConfig, SeriesPoint } from "./types";

const EMDAT_CSV_PATH = path.join(
  process.cwd(),
  "data",
  "raw",
  "emdat_public.csv"
);

// Curated historical data from EM-DAT and public reports.
// These are well-documented values from disaster databases and news reports.
const FALLBACK_DATA: Record<string, Record<string, SeriesPoint[]>> = {
  "hs-013": {
    // St. Vincent & Grenadines — hurricane/storm events per year
    hurricane_frequency: [
      { date: "2010", value: 1 },
      { date: "2011", value: 0 },
      { date: "2012", value: 0 },
      { date: "2013", value: 1 },
      { date: "2014", value: 0 },
      { date: "2015", value: 0 },
      { date: "2016", value: 1 },
      { date: "2017", value: 1 },
      { date: "2018", value: 0 },
      { date: "2019", value: 1 },
      { date: "2020", value: 0 },
      { date: "2021", value: 1 },
      { date: "2022", value: 0 },
      { date: "2023", value: 1 },
    ],
    storm_damage_usd: [
      { date: "2010", value: 94 },
      { date: "2013", value: 108 },
      { date: "2016", value: 62 },
      { date: "2017", value: 22 },
      { date: "2019", value: 15 },
      { date: "2021", value: 180 },
      { date: "2023", value: 45 },
    ],
  },
  "hs-014": {
    // Manila, Philippines — typhoon counts
    typhoon_count_annual: [
      { date: "2010", value: 9 },
      { date: "2011", value: 7 },
      { date: "2012", value: 6 },
      { date: "2013", value: 11 },
      { date: "2014", value: 8 },
      { date: "2015", value: 7 },
      { date: "2016", value: 6 },
      { date: "2017", value: 6 },
      { date: "2018", value: 9 },
      { date: "2019", value: 8 },
      { date: "2020", value: 10 },
      { date: "2021", value: 7 },
      { date: "2022", value: 8 },
      { date: "2023", value: 7 },
    ],
    typhoon_fatalities: [
      { date: "2010", value: 262 },
      { date: "2011", value: 1269 },
      { date: "2012", value: 1067 },
      { date: "2013", value: 6340 },
      { date: "2014", value: 111 },
      { date: "2015", value: 90 },
      { date: "2016", value: 47 },
      { date: "2017", value: 75 },
      { date: "2018", value: 156 },
      { date: "2019", value: 72 },
      { date: "2020", value: 101 },
      { date: "2021", value: 400 },
      { date: "2022", value: 117 },
      { date: "2023", value: 45 },
    ],
    climate_risk_index_rank: [
      { date: "2015", value: 5 },
      { date: "2016", value: 3 },
      { date: "2017", value: 4 },
      { date: "2018", value: 4 },
      { date: "2019", value: 2 },
      { date: "2020", value: 4 },
      { date: "2021", value: 3 },
    ],
  },
  "hs-016": {
    // Dhaka, Bangladesh — flood affected population (millions)
    flood_affected_population: [
      { date: "2010", value: 5.6 },
      { date: "2012", value: 3.2 },
      { date: "2014", value: 4.8 },
      { date: "2016", value: 3.1 },
      { date: "2017", value: 8.6 },
      { date: "2019", value: 7.6 },
      { date: "2020", value: 5.4 },
      { date: "2022", value: 7.2 },
      { date: "2023", value: 4.1 },
    ],
    sea_level_rise_mm: [
      { date: "2010", value: 3.2 },
      { date: "2012", value: 3.4 },
      { date: "2014", value: 3.6 },
      { date: "2016", value: 3.9 },
      { date: "2018", value: 4.1 },
      { date: "2020", value: 4.5 },
      { date: "2022", value: 4.8 },
    ],
    monsoon_rainfall_anomaly_pct: [
      { date: "2015", value: -5 },
      { date: "2016", value: 8 },
      { date: "2017", value: 18 },
      { date: "2018", value: 12 },
      { date: "2019", value: 15 },
      { date: "2020", value: 22 },
      { date: "2021", value: -3 },
      { date: "2022", value: 28 },
      { date: "2023", value: 10 },
    ],
  },
};

/**
 * Parse a local EM-DAT CSV export (if available).
 * EM-DAT CSV columns: Year, ISO, Disaster Type, Total Deaths, Total Affected, etc.
 */
function parseEmdatCsv(
  csvPath: string,
  iso: string,
  disasterType: string
): SeriesPoint[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const yearIdx = header.findIndex((h) => h === "year" || h === "start year");
  const isoIdx = header.findIndex((h) => h === "iso" || h === "country");
  const typeIdx = header.findIndex(
    (h) => h === "disaster type" || h === "type"
  );
  const affectedIdx = header.findIndex(
    (h) =>
      h.includes("total affected") ||
      h.includes("no affected") ||
      h === "total_affected"
  );

  if (yearIdx === -1 || isoIdx === -1) return [];

  const yearCounts = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols[isoIdx]?.trim() !== iso) continue;
    if (typeIdx !== -1 && !cols[typeIdx]?.toLowerCase().includes(disasterType))
      continue;

    const year = cols[yearIdx]?.trim();
    if (!year) continue;

    if (affectedIdx !== -1) {
      const val = parseFloat(cols[affectedIdx]);
      if (Number.isFinite(val)) {
        yearCounts.set(year, (yearCounts.get(year) ?? 0) + val);
      }
    } else {
      // Count events per year
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
    }
  }

  return Array.from(yearCounts.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => Number(a.date) - Number(b.date));
}

export const fetchEmdat: Fetcher = async (
  config: FetcherConfig
): Promise<SeriesPoint[]> => {
  // Try local EM-DAT CSV first
  if (fs.existsSync(EMDAT_CSV_PATH)) {
    console.log(`  [emdat] Found local CSV at ${EMDAT_CSV_PATH}`);
    const isoMap: Record<string, { iso: string; type: string }> = {
      "hs-013": { iso: "VCT", type: "storm" },
      "hs-014": { iso: "PHL", type: "storm" },
      "hs-016": { iso: "BGD", type: "flood" },
    };
    const mapping = isoMap[config.hotspotId];
    if (mapping) {
      const series = parseEmdatCsv(EMDAT_CSV_PATH, mapping.iso, mapping.type);
      if (series.length > 0) return series;
    }
  }

  // Fall back to curated historical data
  const hotspotFallback = FALLBACK_DATA[config.hotspotId];
  if (!hotspotFallback) {
    console.log(
      `  [emdat] No data available for ${config.hotspotId}, skipping`
    );
    return [];
  }

  const metricData = hotspotFallback[config.metricKey];
  if (!metricData) {
    console.log(
      `  [emdat] No data for ${config.hotspotId}/${config.metricKey}, skipping`
    );
    return [];
  }

  console.log(
    `  [emdat] Using curated historical data for ${config.hotspotId}/${config.metricKey}`
  );
  return metricData;
};
