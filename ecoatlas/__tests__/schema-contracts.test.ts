import { describe, it, expect } from "vitest";
import { MetricValueSchema } from "../src/lib/schemas/metrics";
import { metricsSnapshots } from "../data/metricsSnapshots";

describe("MetricValueSchema", () => {
  it("accepts a valid series object", () => {
    const valid = {
      kind: "series",
      unit: "ppm",
      sourceId: "noaa_mlo_co2_monthly",
      series: [
        { date: "2023-01", value: 418.5 },
        { date: "2023-02", value: 419.2 },
      ],
    };
    const result = MetricValueSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts a valid snapshot object", () => {
    const valid = {
      kind: "snapshot",
      unit: "%",
      value: 2.89,
      asOfYear: 2018,
      sourceId: "imo_shipping_emissions",
    };
    const result = MetricValueSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects an object with kind: 'unknown'", () => {
    const invalid = {
      kind: "unknown",
      unit: "ppm",
      value: 42,
    };
    const result = MetricValueSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a series with missing sourceId", () => {
    const invalid = {
      kind: "series",
      unit: "ppm",
      series: [{ date: "2023-01", value: 418.5 }],
    };
    const result = MetricValueSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a snapshot with value as a string", () => {
    const invalid = {
      kind: "snapshot",
      unit: "%",
      value: "not-a-number",
      asOfYear: 2023,
      sourceId: "test",
    };
    const result = MetricValueSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a series with missing unit", () => {
    const invalid = {
      kind: "series",
      sourceId: "test",
      series: [{ date: "2023-01", value: 418.5 }],
    };
    const result = MetricValueSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a snapshot with missing asOfYear", () => {
    const invalid = {
      kind: "snapshot",
      unit: "%",
      value: 2.89,
      sourceId: "test",
    };
    const result = MetricValueSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("metricsSnapshots", () => {
  it("has at least one entry", () => {
    expect(Object.keys(metricsSnapshots).length).toBeGreaterThan(0);
  });

  it("every entry passes MetricValueSchema", () => {
    for (const [key, value] of Object.entries(metricsSnapshots)) {
      const result = MetricValueSchema.safeParse(value);
      expect(result.success, `Snapshot '${key}' failed validation`).toBe(true);
    }
  });

  it("every snapshot entry has kind 'snapshot'", () => {
    for (const [key, value] of Object.entries(metricsSnapshots)) {
      expect(value.kind, `Snapshot '${key}' has wrong kind`).toBe("snapshot");
    }
  });
});
