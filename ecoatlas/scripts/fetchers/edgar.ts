/**
 * EDGAR v8.0 fetcher.
 *
 * Wraps the existing Python script (scripts/edgar/aggregate_bbox.py) to
 * aggregate gridded CH4 emissions within a bounding box for each hotspot.
 *
 * Requires: Python 3 with xarray, netCDF4, numpy installed.
 * Requires: NetCDF files in data/raw/edgar/TOTALS_emi_nc/
 *
 * If the raw NetCDF files are not present, this fetcher returns an empty array
 * (graceful skip).
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Fetcher, FetcherConfig, SeriesPoint } from "./types";

// Bounding boxes for EDGAR driver hotspots (wider than default for regional coverage)
const HOTSPOT_BBOX: Record<string, [number, number, number, number]> = {
  "hs-006": [47, 23, 52, 28], // Ghawar, Saudi Arabia
  "hs-008": [110, 35, 115, 40], // Shanxi, China
  "hs-009": [-105, 30, -100, 34], // Permian Basin, USA
  "hs-010": [51, 37, 57, 42], // Turkmenistan
  "hs-011": [28, 5, 33, 10], // Sudd Wetlands, South Sudan
  "hs-012": [70, 56, 80, 64], // West Siberia
};

const NC_DIR = path.join(process.cwd(), "data", "raw", "edgar", "TOTALS_emi_nc");
const PYTHON_SCRIPT = path.join(process.cwd(), "scripts", "edgar", "aggregate_bbox.py");

export const fetchEdgar: Fetcher = async (
  config: FetcherConfig
): Promise<SeriesPoint[]> => {
  // Check if raw data exists
  if (!fs.existsSync(NC_DIR)) {
    console.log(
      `  [edgar] NetCDF directory not found at ${NC_DIR}, skipping. Download from https://edgar.jrc.ec.europa.eu/`
    );
    return [];
  }

  if (!fs.existsSync(PYTHON_SCRIPT)) {
    console.log(`  [edgar] Python script not found at ${PYTHON_SCRIPT}, skipping`);
    return [];
  }

  const bbox = HOTSPOT_BBOX[config.hotspotId] ?? config.bbox;
  if (!bbox) {
    console.log(`  [edgar] No bbox for ${config.hotspotId}, skipping`);
    return [];
  }

  // Find all NetCDF files
  const files = fs
    .readdirSync(NC_DIR)
    .filter((f) => f.endsWith(".nc"))
    .map((f) => path.join(NC_DIR, f));

  if (files.length === 0) {
    console.log(`  [edgar] No .nc files found in ${NC_DIR}`);
    return [];
  }

  // Write output to a temp file
  const tmpOutput = path.join(
    process.cwd(),
    "data",
    "series",
    config.hotspotId,
    `_edgar_tmp_${config.metricKey}.json`
  );

  try {
    const cmd = [
      "python3",
      PYTHON_SCRIPT,
      `--input "${files.join(",")}"`,
      `--bbox "${bbox.join(",")}"`,
      `--var "emi_ch4"`,
      `--output "${tmpOutput}"`,
    ].join(" ");

    execSync(cmd, { stdio: "pipe", timeout: 120_000 });

    // Read and return the output
    const raw = await fsp.readFile(tmpOutput, "utf-8");
    const series: SeriesPoint[] = JSON.parse(raw);

    // Clean up temp file
    fs.unlinkSync(tmpOutput);

    // Convert from kg/m²/s (EDGAR units) to more readable units if needed
    return series.sort((a, b) => Number(a.date) - Number(b.date));
  } catch (err) {
    console.error(`  [edgar] Python aggregation failed: ${err}`);
    // Clean up temp file if it exists
    if (fs.existsSync(tmpOutput)) {
      fs.unlinkSync(tmpOutput);
    }
    return [];
  }
};
