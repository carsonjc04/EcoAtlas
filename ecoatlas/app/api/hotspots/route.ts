/**
 * GET /api/hotspots — Hotspot list endpoint.
 *
 * Returns a lightweight JSON array of all 16 climate hotspots with position,
 * severity, and type. This is the first request GlobeView makes on load to
 * populate globe points, rings, and labels.
 *
 * Statically generated at build time (force-static) so it ships as a plain
 * JSON file on the CDN. Zod validates the data file at build time to catch
 * schema drift between hotspots.json and the frontend expectations.
 */

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

// Pre-rendered at build time — no server-side request handling at runtime
export const dynamic = "force-static";

// Validates each hotspot entry. "type" discriminates between emission sources
// (drivers) and climate consequences (impacts), which controls globe coloring.
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

type HotspotListItem = z.infer<typeof listItemSchema>;

const dataPath = path.join(process.cwd(), "data", "hotspots.json");

const readHotspotsList = async (): Promise<HotspotListItem[]> => {
  const raw = await readFile(dataPath, "utf-8");
  const parsed = JSON.parse(raw);
  return listSchema.parse(parsed);
};

export async function GET() {
  const list = await readHotspotsList();

  return NextResponse.json(list, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

