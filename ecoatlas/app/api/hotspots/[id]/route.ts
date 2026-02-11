import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { metricsSnapshots } from "../../../../data/metricsSnapshots";
import { sourceMap } from "../../../../src/data/sourceMap";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const raw = await readFile(
    path.join(process.cwd(), "data", "hotspots.json"),
    "utf-8"
  );
  const hotspots = JSON.parse(raw) as { id: string }[];
  return hotspots.map((h) => ({ id: h.id }));
}

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

const storySchema = z.object({
  headline: z.string(),
  summary: z.string(),
  climateImpact: z.string(),
  causeEffect: z.array(z.string()),
  scaleContext: z.string().optional(),
  outlook: z.string().optional(),
});

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

// Returns full details for a single hotspot.
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

  let metrics: Record<string, unknown> | undefined = undefined;
  const mapping = sourceMap.hotspots.find((item) => item.hotspotId === id);

  if (mapping) {
    metrics = {};

    for (const metric of mapping.metrics) {
      // Try reading a series JSON file from data/series/{hotspotId}/{metricKey}.json
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
        // No series file found — fall through to snapshot lookup
      }

      // Fall back to snapshot values
      const snapshot = snapshotLookup.get(metric.metricKey);
      if (snapshot) {
        metrics[metric.metricKey] = metricValueSchema.parse(snapshot);
      }
    }

    if (Object.keys(metrics).length === 0) {
      metrics = undefined;
    }
  }

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
