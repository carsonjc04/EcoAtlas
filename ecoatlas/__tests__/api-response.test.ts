import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MetricValueSchema } from "../src/lib/schemas/metrics";

import { GET as getHotspotsList } from "../app/api/hotspots/route";
import {
  GET as getHotspotDetail,
  generateStaticParams,
} from "../app/api/hotspots/[id]/route";

function makeRequest(url: string): Request {
  return new Request(`http://localhost:3000${url}`);
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// GET /api/hotspots
// ---------------------------------------------------------------------------
describe("GET /api/hotspots", () => {
  it("returns 200 with a JSON array", async () => {
    const response = await getHotspotsList();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("every item has the required fields", async () => {
    const response = await getHotspotsList();
    const body = (await response.json()) as Record<string, unknown>[];

    const requiredFields = ["id", "name", "lat", "lng", "severity", "topic", "type"];

    for (const item of body) {
      for (const field of requiredFields) {
        expect(item).toHaveProperty(field);
      }
    }
  });

  it("type is always 'driver' or 'impact'", async () => {
    const response = await getHotspotsList();
    const body = (await response.json()) as { type: string }[];

    for (const item of body) {
      expect(["driver", "impact"]).toContain(item.type);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/hotspots/[id]
// ---------------------------------------------------------------------------
describe("GET /api/hotspots/[id]", () => {
  it("returns 200 with story, sources, series, and metrics for hs-001", async () => {
    const response = await getHotspotDetail(makeRequest("/api/hotspots/hs-001"), makeParams("hs-001"));
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("story");
    expect(body).toHaveProperty("sources");
    expect(body).toHaveProperty("series");
    expect(body).toHaveProperty("metrics");
  });

  it("story has all required fields", async () => {
    const response = await getHotspotDetail(makeRequest("/api/hotspots/hs-001"), makeParams("hs-001"));
    const body = (await response.json()) as {
      story: Record<string, unknown>;
    };

    expect(body.story).toHaveProperty("headline");
    expect(body.story).toHaveProperty("summary");
    expect(body.story).toHaveProperty("climateImpact");
    expect(body.story).toHaveProperty("causeEffect");
    expect(Array.isArray(body.story.causeEffect)).toBe(true);
  });

  it("metrics values pass MetricValueSchema", async () => {
    const response = await getHotspotDetail(makeRequest("/api/hotspots/hs-001"), makeParams("hs-001"));
    const body = (await response.json()) as {
      metrics?: Record<string, unknown>;
    };

    if (body.metrics) {
      for (const [key, value] of Object.entries(body.metrics)) {
        const result = MetricValueSchema.safeParse(value);
        expect(result.success, `Metric '${key}' failed MetricValueSchema`).toBe(true);
      }
    }
  });

  it("returns 404 for a nonexistent hotspot", async () => {
    const response = await getHotspotDetail(
      makeRequest("/api/hotspots/nonexistent"),
      makeParams("nonexistent")
    );
    expect(response.status).toBe(404);

    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Hotspot not found");
  });
});

// ---------------------------------------------------------------------------
// generateStaticParams covers all hotspots
// ---------------------------------------------------------------------------
describe("generateStaticParams", () => {
  it("returns params for every hotspot in hotspots.json", async () => {
    const raw = await readFile(
      path.resolve(__dirname, "../data/hotspots.json"),
      "utf-8"
    );
    const hotspots = JSON.parse(raw) as { id: string }[];
    const params = await generateStaticParams();

    const paramIds = new Set(params.map((p) => p.id));
    for (const h of hotspots) {
      expect(paramIds.has(h.id), `generateStaticParams missing ${h.id}`).toBe(true);
    }
  });

  it("every param produces a 200 response", async () => {
    const params = await generateStaticParams();

    for (const { id } of params) {
      const response = await getHotspotDetail(
        makeRequest(`/api/hotspots/${id}`),
        makeParams(id)
      );
      expect(response.status, `Non-200 for hotspot ${id}`).toBe(200);
    }
  });
});
