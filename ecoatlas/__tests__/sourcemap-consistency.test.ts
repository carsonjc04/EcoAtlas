import { describe, it, expect } from "vitest";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { sourceMap } from "../src/data/sourceMap";

const dataDir = path.resolve(__dirname, "../data");

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadHotspotIds(): Promise<string[]> {
  const raw = await readFile(path.join(dataDir, "hotspots.json"), "utf-8");
  const list = JSON.parse(raw) as { id: string }[];
  return list.map((h) => h.id);
}

describe("sourceMap <-> hotspots.json consistency", () => {
  it("every hotspot in hotspots.json has a sourceMap entry", async () => {
    const ids = await loadHotspotIds();
    const sourceMapIds = new Set(sourceMap.hotspots.map((h) => h.hotspotId));

    for (const id of ids) {
      expect(sourceMapIds.has(id), `${id} missing from sourceMap.hotspots`).toBe(true);
    }
  });

  it("every hotspot in hotspots.json has a detail file", async () => {
    const ids = await loadHotspotIds();
    const detailDir = path.join(dataDir, "hotspotDetails");

    for (const id of ids) {
      const exists = await fileExists(path.join(detailDir, `${id}.json`));
      expect(exists, `Missing detail file: hotspotDetails/${id}.json`).toBe(true);
    }
  });
});

describe("sourceMap dataPaths", () => {
  it("every dataPath points to a file that exists", async () => {
    const projectRoot = path.resolve(__dirname, "..");

    for (const hotspot of sourceMap.hotspots) {
      for (const metric of hotspot.metrics) {
        if (metric.dataPath) {
          const fullPath = path.join(projectRoot, metric.dataPath);
          const exists = await fileExists(fullPath);
          expect(
            exists,
            `dataPath not found: ${metric.dataPath} (hotspot ${hotspot.hotspotId}, metric ${metric.metricKey})`
          ).toBe(true);
        }
      }
    }
  });
});

describe("sourceMap source references", () => {
  it("every sourceId referenced by a metric exists in sourceMap.sources", () => {
    const sourceIds = new Set(sourceMap.sources.map((s) => s.id));

    for (const hotspot of sourceMap.hotspots) {
      for (const metric of hotspot.metrics) {
        for (const srcId of metric.sources) {
          expect(
            sourceIds.has(srcId),
            `Unknown sourceId '${srcId}' in metric '${metric.metricKey}' of hotspot '${hotspot.hotspotId}'`
          ).toBe(true);
        }
      }
    }
  });
});

describe("no duplicates in sourceMap", () => {
  it("no duplicate hotspot IDs", () => {
    const ids = sourceMap.hotspots.map((h) => h.hotspotId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no duplicate metric keys within any single hotspot", () => {
    for (const hotspot of sourceMap.hotspots) {
      const keys = hotspot.metrics.map((m) => m.metricKey);
      expect(
        new Set(keys).size,
        `Duplicate metric keys in hotspot ${hotspot.hotspotId}`
      ).toBe(keys.length);
    }
  });

  it("no duplicate source IDs", () => {
    const ids = sourceMap.sources.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
