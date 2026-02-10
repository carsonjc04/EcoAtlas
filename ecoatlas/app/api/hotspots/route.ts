import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const dynamic = "force-static";

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

// Returns a lightweight list for the globe points.
export async function GET() {
  const list = await readHotspotsList();

  return NextResponse.json(list, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

