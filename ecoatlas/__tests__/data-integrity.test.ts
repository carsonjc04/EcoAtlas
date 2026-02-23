import { describe, it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const dataDir = path.resolve(__dirname, "../data");

const listItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  severity: z.number(),
  topic: z.string(),
  type: z.enum(["driver", "impact"]),
});

const storySchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  climateImpact: z.string().min(1),
  causeEffect: z.array(z.string()).min(1),
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

// ---------------------------------------------------------------------------
// hotspots.json
// ---------------------------------------------------------------------------
describe("data/hotspots.json", () => {
  let hotspots: unknown[];

  it("is valid JSON", async () => {
    const raw = await readFile(path.join(dataDir, "hotspots.json"), "utf-8");
    hotspots = JSON.parse(raw);
    expect(Array.isArray(hotspots)).toBe(true);
    expect(hotspots.length).toBeGreaterThan(0);
  });

  it("every entry passes listItemSchema", async () => {
    const raw = await readFile(path.join(dataDir, "hotspots.json"), "utf-8");
    hotspots = JSON.parse(raw);

    for (const entry of hotspots) {
      const result = listItemSchema.safeParse(entry);
      expect(result.success, `Failed for: ${JSON.stringify(entry)}`).toBe(true);
    }
  });

  it("lat/lng are within valid ranges", async () => {
    const raw = await readFile(path.join(dataDir, "hotspots.json"), "utf-8");
    hotspots = JSON.parse(raw);

    for (const entry of hotspots) {
      const parsed = listItemSchema.parse(entry);
      expect(parsed.lat).toBeGreaterThanOrEqual(-90);
      expect(parsed.lat).toBeLessThanOrEqual(90);
      expect(parsed.lng).toBeGreaterThanOrEqual(-180);
      expect(parsed.lng).toBeLessThanOrEqual(180);
    }
  });

  it("severity is between 1 and 10", async () => {
    const raw = await readFile(path.join(dataDir, "hotspots.json"), "utf-8");
    hotspots = JSON.parse(raw);

    for (const entry of hotspots) {
      const parsed = listItemSchema.parse(entry);
      expect(parsed.severity).toBeGreaterThanOrEqual(1);
      expect(parsed.severity).toBeLessThanOrEqual(10);
    }
  });

  it("has no duplicate IDs", async () => {
    const raw = await readFile(path.join(dataDir, "hotspots.json"), "utf-8");
    hotspots = JSON.parse(raw);

    const ids = (hotspots as { id: string }[]).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// hotspotDetails/{id}.json
// ---------------------------------------------------------------------------
describe("data/hotspotDetails/*.json", () => {
  it("every detail file passes detailSchema", async () => {
    const detailDir = path.join(dataDir, "hotspotDetails");
    const files = await readdir(detailDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    expect(jsonFiles.length).toBeGreaterThan(0);

    for (const file of jsonFiles) {
      const raw = await readFile(path.join(detailDir, file), "utf-8");
      const parsed = JSON.parse(raw);
      const result = detailSchema.safeParse(parsed);
      expect(result.success, `Validation failed for ${file}`).toBe(true);
    }
  });

  it("every story has non-empty required fields", async () => {
    const detailDir = path.join(dataDir, "hotspotDetails");
    const files = await readdir(detailDir);

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const raw = await readFile(path.join(detailDir, file), "utf-8");
      const parsed = detailSchema.parse(JSON.parse(raw));

      if (parsed.story) {
        expect(parsed.story.headline.length, `Empty headline in ${file}`).toBeGreaterThan(0);
        expect(parsed.story.summary.length, `Empty summary in ${file}`).toBeGreaterThan(0);
        expect(parsed.story.climateImpact.length, `Empty climateImpact in ${file}`).toBeGreaterThan(0);
        expect(parsed.story.causeEffect.length, `No causeEffect in ${file}`).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// data/series/{id}/*.json
// ---------------------------------------------------------------------------
describe("data/series/**/*.json", () => {
  it("every series file passes seriesPointSchema", async () => {
    const seriesBaseDir = path.join(dataDir, "series");
    const hotspotDirs = await readdir(seriesBaseDir);

    for (const dir of hotspotDirs) {
      const dirPath = path.join(seriesBaseDir, dir);
      const files = await readdir(dirPath);

      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const raw = await readFile(path.join(dirPath, file), "utf-8");
        const parsed = JSON.parse(raw);
        const result = seriesPointSchema.safeParse(parsed);
        expect(result.success, `Validation failed for series/${dir}/${file}`).toBe(true);
      }
    }
  });

  it("no series file is empty", async () => {
    const seriesBaseDir = path.join(dataDir, "series");
    const hotspotDirs = await readdir(seriesBaseDir);

    for (const dir of hotspotDirs) {
      const dirPath = path.join(seriesBaseDir, dir);
      const files = await readdir(dirPath);

      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const raw = await readFile(path.join(dirPath, file), "utf-8");
        const series = JSON.parse(raw) as unknown[];
        expect(series.length, `Empty series in series/${dir}/${file}`).toBeGreaterThan(0);
      }
    }
  });

  it("series dates are in chronological order", async () => {
    const seriesBaseDir = path.join(dataDir, "series");
    const hotspotDirs = await readdir(seriesBaseDir);

    for (const dir of hotspotDirs) {
      const dirPath = path.join(seriesBaseDir, dir);
      const files = await readdir(dirPath);

      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const raw = await readFile(path.join(dirPath, file), "utf-8");
        const series = seriesPointSchema.parse(JSON.parse(raw));

        for (let i = 1; i < series.length; i++) {
          expect(
            series[i].date >= series[i - 1].date,
            `Out-of-order dates in series/${dir}/${file}: ${series[i - 1].date} > ${series[i].date}`
          ).toBe(true);
        }
      }
    }
  });

  it("series values are finite numbers", async () => {
    const seriesBaseDir = path.join(dataDir, "series");
    const hotspotDirs = await readdir(seriesBaseDir);

    for (const dir of hotspotDirs) {
      const dirPath = path.join(seriesBaseDir, dir);
      const files = await readdir(dirPath);

      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const raw = await readFile(path.join(dirPath, file), "utf-8");
        const series = seriesPointSchema.parse(JSON.parse(raw));

        for (const point of series) {
          expect(Number.isFinite(point.value), `Non-finite value in series/${dir}/${file}`).toBe(true);
        }
      }
    }
  });
});
