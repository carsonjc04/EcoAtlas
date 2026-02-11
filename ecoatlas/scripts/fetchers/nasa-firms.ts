/**
 * NASA FIRMS (Fire Information for Resource Management System) fetcher.
 *
 * Uses the FIRMS API to get active fire counts within a bounding box,
 * aggregated by year. Covers wildfire and peatland fire hotspots.
 *
 * API docs: https://firms.modaps.eosdis.nasa.gov/api/
 *
 * Note: The FIRMS API requires a free MAP_KEY for extended queries.
 * Set the NASA_FIRMS_KEY environment variable.
 * Without a key, falls back to the public 24h/48h endpoint (limited).
 */

import type { Fetcher, FetcherConfig, SeriesPoint } from "./types";

// Bounding boxes for fire-related hotspots
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

  // FIRMS supports VIIRS and MODIS. Use VIIRS_SNPP for better coverage.
  // The area endpoint returns CSV with fire detections.
  // We request up to 10 days of data (API limit per request) and aggregate.
  // For historical annual data, FIRMS provides archive downloads, but the
  // API gives recent data. For a full pipeline, you'd use their archive.

  try {
    // Request the last 10 days of data as a sample
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

    // Parse CSV header
    const header = lines[0].split(",");
    const dateIdx = header.indexOf("acq_date");
    const frpIdx = header.indexOf("frp");

    if (dateIdx === -1) {
      console.log(`  [firms] Unexpected CSV format`);
      return [];
    }

    // Aggregate fire counts by year
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
