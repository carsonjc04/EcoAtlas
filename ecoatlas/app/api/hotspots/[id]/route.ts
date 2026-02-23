/**
 * GET /api/hotspots/[id] — Single hotspot detail endpoint.
 *
 * Assembles a composite response by merging three data layers:
 *   1. Base fields (lat, lng, severity, type) from hotspots.json
 *   2. Narrative content (story, sources) from hotspotDetails/{id}.json
 *   3. Metric data resolved from sourceMap — prefers time-series files
 *      in data/series/, falls back to point-in-time snapshots
 *
 * Statically generated at build time via generateStaticParams so each
 * hotspot detail page is a pre-built JSON file on the CDN.
 *
 * The story field uses a fallback chain (story → title/summary → defaults)
 * because early hotspot detail files used a flat format before the structured
 * story schema was introduced.
 */

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { metricsSnapshots } from "../../../../data/metricsSnapshots";
import { sourceMap } from "../../../../src/data/sourceMap";

export const dynamic = "force-static";

/**
 * Tells Next.js which [id] values to pre-render. Every id in hotspots.json
 * gets a static page — no fallback rendering at runtime.
 */
export async function generateStaticParams() {
  const raw = await readFile(
    path.join(process.cwd(), "data", "hotspots.json"),
    "utf-8"
  );
  const hotspots = JSON.parse(raw) as { id: string }[];
  return hotspots.map((h) => ({ id: h.id }));
}

// Same schema as the list route — shared shape for the base hotspot fields
const listItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  severity: z.number(),
  topic: z.string(),
  type: z.enum(["driver", "impact"]),
});
const listSchema = z.array(listItemSchema);

// Structured narrative for the sidebar Story tab
const storySchema = z.object({
  headline: z.string(),
  summary: z.string(),
  climateImpact: z.string(),
  causeEffect: z.array(z.string()),
  scaleContext: z.string().optional(),
  outlook: z.string().optional(),
});

// Detail files may contain legacy fields (title, summary) from before the
// story schema was standardised, so those are optional here
const detailSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  story: storySchema.optional(),
  sources: z.array(z.string()),
  series: z.array(
    z.object({
      year: z.number(),
      value: z.number(),
    })
  ),
});

// Shape for ingested time-series data files (date strings + numeric values)
const seriesPointSchema = z.array(
  z.object({
    date: z.string(),
    value: z.number(),
  })
);

type HotspotListItem = z.infer<typeof listItemSchema>;
type HotspotDetail = z.infer<typeof detailSchema>;
type HotspotStory = z.infer<typeof storySchema>;

const dataDir = path.join(process.cwd(), "data");
const detailDir = path.join(dataDir, "hotspotDetails");
const seriesDir = path.join(dataDir, "series");
const listPath = path.join(dataDir, "hotspots.json");

/**
 * Discriminated union for metric values. A metric is either:
 *   - "series": chronological data points (from data/series/ files)
 *   - "snapshot": a single value at a point in time (from metricsSnapshots.ts)
 *
 * The frontend renders series with Sparkline charts and snapshots as
 * static MetricCards.
 */
const metricValueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("series"),
    unit: z.string(),
    series: seriesPointSchema,
    sourceId: z.string(),
  }),
  z.object({
    kind: z.literal("snapshot"),
    unit: z.string(),
    value: z.number(),
    asOfYear: z.number(),
    sourceId: z.string(),
  }),
]);

// Pre-validate and index snapshots at module load so lookups during
// request handling are a simple Map.get()
const snapshotLookup = new Map(
  Object.entries(metricsSnapshots).map(([key, value]) => [
    key,
    metricValueSchema.parse(value),
  ])
);

const readHotspotsList = async (): Promise<HotspotListItem[]> => {
  const raw = await readFile(listPath, "utf-8");
  const parsed = JSON.parse(raw);
  return listSchema.parse(parsed);
};

const readHotspotDetail = async (id: string): Promise<HotspotDetail> => {
  const filePath = path.join(detailDir, `${id}.json`);
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  return detailSchema.parse(parsed);
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let detail: HotspotDetail | null = null;
  try {
    detail = await readHotspotDetail(id);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      detail = null;
    } else {
      throw error;
    }
  }

  if (!detail) {
    return NextResponse.json(
      { error: "Hotspot not found" },
      {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      }
    );
  }

  const list = await readHotspotsList();
  const base = list.find((item) => item.id === id);

  if (!base) {
    return NextResponse.json(
      { error: "Hotspot not found" },
      {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      }
    );
  }

  // --- Metric resolution ---
  // Walk the sourceMap to find every metric mapped to this hotspot,
  // then resolve each one: try a series file first, fall back to a snapshot.
  let metrics: Record<string, unknown> | undefined = undefined;
  const mapping = sourceMap.hotspots.find((item) => item.hotspotId === id);

  if (mapping) {
    metrics = {};

    for (const metric of mapping.metrics) {
      // Priority 1: ingested time-series file (produced by scripts/ingest.ts)
      const seriesPath = path.join(seriesDir, id, `${metric.metricKey}.json`);
      try {
        const raw = await readFile(seriesPath, "utf-8");
        const series = seriesPointSchema.parse(JSON.parse(raw));
        metrics[metric.metricKey] = metricValueSchema.parse({
          kind: "series",
          unit: metric.unit ?? "",
          sourceId: metric.sources[0],
          series,
        });
        continue;
      } catch {
        // No series file — fall through to snapshot
      }

      // Priority 2: static snapshot value (manually curated in metricsSnapshots.ts)
      const snapshot = snapshotLookup.get(metric.metricKey);
      if (snapshot) {
        metrics[metric.metricKey] = metricValueSchema.parse(snapshot);
      }
    }

    // Don't attach an empty metrics object — let the frontend know there's no data
    if (Object.keys(metrics).length === 0) {
      metrics = undefined;
    }
  }

  // --- Story fallback chain ---
  // Newer detail files have a full `story` object. Older ones only had flat
  // `title` and `summary` fields. This normalises both formats into the
  // structured shape the sidebar expects.
  const fallbackStory: HotspotStory = {
    headline: detail.story?.headline ?? detail.title ?? "Story unavailable",
    summary: detail.story?.summary ?? detail.summary ?? "Summary unavailable.",
    climateImpact:
      detail.story?.climateImpact ??
      "Global warming impacts are being assessed.",
    causeEffect:
      detail.story?.causeEffect ?? [
        "Data is being gathered",
        "Impacts are under review",
        "More analysis is expected",
      ],
    scaleContext: detail.story?.scaleContext,
    outlook: detail.story?.outlook,
  };

  return NextResponse.json({ ...base, ...detail, story: fallbackStory, metrics }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
