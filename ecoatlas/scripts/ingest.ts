/**
 * Ingestion orchestrator — the main data pipeline entry point.
 *
 * Walks every hotspot in sourceMap, finds the first registered fetcher for
 * each metric's source list, calls it, and writes the resulting time-series
 * to data/series/{hotspotId}/{metricKey}.json.
 *
 * The output files are what the API detail route reads at build time to
 * populate the "series" kind of MetricValue. If a fetcher fails or returns
 * no data, the metric silently falls back to metricsSnapshots in the API.
 *
 * Usage:
 *   npx tsx scripts/ingest.ts                        # run all fetchers
 *   npx tsx scripts/ingest.ts --source climate_trace  # run one source only
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { sourceMap } from "../src/data/sourceMap";
import type { FetcherConfig, FetcherRegistry, SeriesPoint } from "./fetchers/types";

import { fetchClimatTrace } from "./fetchers/climatetrace";
import { fetchEdgar } from "./fetchers/edgar";
import { fetchNasaFirms } from "./fetchers/nasa-firms";
import { fetchGfw } from "./fetchers/gfw";
import { fetchReef } from "./fetchers/reef";
import { fetchEmdat } from "./fetchers/emdat";

/**
 * Maps source IDs (from sourceMap) to fetcher functions.
 *
 * A metric in sourceMap can list multiple source IDs (e.g. ["climate_trace", "edgar_jrc"]).
 * The pipeline tries them in order and uses the first one present in this registry.
 * Sources that share a fetcher (e.g. inpe_prodes → fetchGfw) are aliased here
 * because they use the same underlying API with compatible spatial queries.
 */
const registry: FetcherRegistry = {
  climate_trace: fetchClimatTrace,
  edgar_jrc: fetchEdgar,
  nasa_firms: fetchNasaFirms,
  "src-gfw-01": fetchGfw,
  inpe_prodes: fetchGfw,
  aims_reef_monitoring: fetchReef,
  noaa_coral_reef_watch: fetchReef,
  emdat_cred: fetchEmdat,
  germanwatch_cri: fetchEmdat,
  pagasa_typhoon: fetchEmdat,
};

type HotspotEntry = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: number;
  topic: string;
  type: "driver" | "impact";
};

const DATA_DIR = path.join(process.cwd(), "data");
const SERIES_DIR = path.join(DATA_DIR, "series");

/**
 * Creates a ~4° × 4° bounding box centered on the hotspot for spatial
 * API queries (EDGAR, FIRMS). Some fetchers override this with their own
 * wider boxes for regional coverage.
 */
function defaultBbox(lat: number, lng: number): [number, number, number, number] {
  return [lng - 2, lat - 2, lng + 2, lat + 2];
}

async function main() {
  // Parse --source flag
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf("--source");
  const filterSource = sourceIdx !== -1 ? args[sourceIdx + 1] : undefined;

  // Load hotspot locations
  const hotspotsRaw = await fsp.readFile(
    path.join(DATA_DIR, "hotspots.json"),
    "utf-8"
  );
  const hotspots: HotspotEntry[] = JSON.parse(hotspotsRaw);
  const hotspotMap = new Map(hotspots.map((h) => [h.id, h]));

  let totalWritten = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const mapping of sourceMap.hotspots) {
    const hotspot = hotspotMap.get(mapping.hotspotId);
    // hs-000 (Global Atmosphere) won't be in hotspots.json — use fallback coords
    const lat = hotspot?.lat ?? 0;
    const lng = hotspot?.lng ?? 0;

    for (const metric of mapping.metrics) {
      // Find the first source that has a registered fetcher
      const sourceId = metric.sources.find((s) => registry[s]);

      if (!sourceId) {
        totalSkipped++;
        continue;
      }

      // If filtering by source, skip non-matching
      if (filterSource && sourceId !== filterSource) {
        continue;
      }

      const fetcher = registry[sourceId];
      const config: FetcherConfig = {
        hotspotId: mapping.hotspotId,
        metricKey: metric.metricKey,
        lat,
        lng,
        bbox: defaultBbox(lat, lng),
        unit: metric.unit,
        sourceIds: metric.sources,
      };

      try {
        console.log(
          `[ingest] ${mapping.hotspotId}/${metric.metricKey} via ${sourceId}...`
        );
        const series: SeriesPoint[] = await fetcher(config);

        if (series.length === 0) {
          console.log(`  -> 0 points, skipping write`);
          totalSkipped++;
          continue;
        }

        // Write to data/series/{hotspotId}/{metricKey}.json
        const outDir = path.join(SERIES_DIR, mapping.hotspotId);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        const outPath = path.join(outDir, `${metric.metricKey}.json`);
        await fsp.writeFile(
          outPath,
          JSON.stringify(series, null, 2) + "\n",
          "utf-8"
        );
        console.log(`  -> ${series.length} points written to ${outPath}`);
        totalWritten++;
      } catch (err) {
        console.error(
          `  [error] ${mapping.hotspotId}/${metric.metricKey}: ${err}`
        );
        totalFailed++;
      }
    }
  }

  console.log(
    `\nDone. Written: ${totalWritten}, Skipped: ${totalSkipped}, Failed: ${totalFailed}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
