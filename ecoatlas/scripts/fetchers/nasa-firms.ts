/**
 * NASA FIRMS fetcher — active fire detection counts by region.
 *
 * FIRMS (Fire Information for Resource Management System) provides
 * near-real-time active fire data from MODIS and VIIRS satellites.
 * This fetcher counts fire detections within a bounding box per year.
 *
 * The FIRMS API has two tiers:
 *   - Public: last 24h/48h only (very limited)
 *   - MAP_KEY: up to 10 days per request (free, requires registration)
 *
 * For historical annual data, FIRMS provides bulk archive downloads at
 * https://firms.modaps.eosdis.nasa.gov/download/ — those would need
 * a separate offline import script for full coverage.
 *
 * Coverage:
 *   hs-003: California — wildfire area burned
 *   hs-007: Kalimantan — peatland fires
 *   hs-015: Pantanal — wetland fires
 *
 * Requires: NASA_FIRMS_KEY env var (free at https://firms.modaps.eosdis.nasa.gov/api/)
 */

import type { Fetcher, FetcherConfig, SeriesPoint } from "./types";

const HOTSPOT_BBOX: Record<string, [number, number, number, number]> = {
  "hs-003": [-124, 32, -114, 42], // California
  "hs-007": [109, -5, 119, 3], // Kalimantan, Indonesia
  "hs-015": [-59, -22, -54, -15], // Pantanal, Brazil
};

const BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api";

type FirmsEntry = {
  latitude: number;
  longitude: number;
  acq_date: string;
  confidence: string | number;
  frp: number;
  [key: string]: unknown;
};

export const fetchNasaFirms: Fetcher = async (
  config: FetcherConfig
): Promise<SeriesPoint[]> => {
  const apiKey = process.env.NASA_FIRMS_KEY;
  if (!apiKey) {
    console.log(
      `  [firms] NASA_FIRMS_KEY not set. Get a free key at https://firms.modaps.eosdis.nasa.gov/api/`
    );
    console.log(`  [firms] Skipping ${config.hotspotId}/${config.metricKey}`);
    return [];
  }

  const bbox = HOTSPOT_BBOX[config.hotspotId] ?? config.bbox;
  if (!bbox) {
    console.log(`  [firms] No bbox for ${config.hotspotId}, skipping`);
    return [];
  }

  const [lonMin, latMin, lonMax, latMax] = bbox;
  const area = `${lonMin},${latMin},${lonMax},${latMax}`;

  try {
    // VIIRS_SNPP_SP offers better spatial resolution than MODIS.
    // The /area/ endpoint returns CSV with one row per fire detection.
    // We request the maximum 10-day window the API allows per call.
    const url = `${BASE_URL}/area/csv/${apiKey}/VIIRS_SNPP_SP/${area}/10`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FIRMS API ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const lines = csvText.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      console.log(`  [firms] No fire data returned for ${config.hotspotId}`);
      return [];
    }

    const header = lines[0].split(",");
    const dateIdx = header.indexOf("acq_date");
    const frpIdx = header.indexOf("frp");

    if (dateIdx === -1) {
      console.log(`  [firms] Unexpected CSV format`);
      return [];
    }

    // Aggregate raw fire detections into annual counts
    const yearCounts = new Map<string, number>();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const date = cols[dateIdx];
      if (!date) continue;
      const year = date.substring(0, 4);
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
    }

    const series: SeriesPoint[] = Array.from(yearCounts.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => Number(a.date) - Number(b.date));

    return series;
  } catch (err) {
    console.error(`  [firms] Failed: ${err}`);
    return [];
  }
};
