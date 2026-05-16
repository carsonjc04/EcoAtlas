import { describe, expect, it } from "vitest";
import {
  buildImpactTrajectory,
  getTrajectoryValueAtYear,
  normalizeSeriesToAnnualPoints,
  selectPrimarySeriesMetric,
} from "../lib/impactTrajectory";
import type { MetricValue } from "../src/lib/schemas/metrics";

const seriesMetric = (series: { date: string; value: number }[]): MetricValue => ({
  kind: "series",
  unit: "MtCO2e",
  sourceId: "test-source",
  series,
});

describe("impact trajectory helper", () => {
  it("selects the first available series metric", () => {
    const metrics: Record<string, MetricValue> = {
      snapshot_metric: {
        kind: "snapshot",
        unit: "%",
        value: 42,
        asOfYear: 2024,
        sourceId: "test-source",
      },
      annual_emissions: seriesMetric([{ date: "2024", value: 100 }]),
    };

    const selected = selectPrimarySeriesMetric(metrics);

    expect(selected?.metricKey).toBe("annual_emissions");
  });

  it("normalizes duplicate monthly points into latest annual values", () => {
    const annual = normalizeSeriesToAnnualPoints([
      { date: "2024-01", value: 10 },
      { date: "2024-12", value: 18 },
      { date: "2023", value: 8 },
    ]);

    expect(annual).toEqual([
      { year: 2023, value: 8 },
      { year: 2024, value: 18 },
    ]);
  });

  it("generates a monotonic projection through 2050 for worsening impact scenarios", () => {
    const trajectory = buildImpactTrajectory({
      metrics: {
        flood_affected_population: seriesMetric([
          { date: "2020", value: 100 },
          { date: "2024", value: 120 },
        ]),
      },
      severity: 8,
      type: "impact",
    });

    expect(trajectory).not.toBeNull();
    expect(trajectory?.projected[0]).toEqual({ year: 2024, value: 120 });
    expect(trajectory?.projected.at(-1)?.year).toBe(2050);
    expect(trajectory?.endValue).toBeGreaterThan(trajectory?.latestObservedValue ?? 0);

    const projectedValues = trajectory?.projected.map((point) => point.value) ?? [];
    for (let index = 1; index < projectedValues.length; index += 1) {
      expect(projectedValues[index]).toBeGreaterThanOrEqual(projectedValues[index - 1]);
    }
  });

  it("returns null when no series metric exists", () => {
    const trajectory = buildImpactTrajectory({
      metrics: {
        snapshot_metric: {
          kind: "snapshot",
          unit: "%",
          value: 42,
          asOfYear: 2024,
          sourceId: "test-source",
        },
      },
      severity: 5,
      type: "impact",
    });

    expect(trajectory).toBeNull();
  });

  it("returns the selected trajectory value for timeline marker years", () => {
    const trajectory = buildImpactTrajectory({
      metrics: {
        wildfire_area_burned_ha: seriesMetric([
          { date: "2020", value: 100 },
          { date: "2024", value: 150 },
        ]),
      },
      severity: 7,
      type: "impact",
    });

    expect(trajectory).not.toBeNull();

    const selected = getTrajectoryValueAtYear(trajectory!, 2030);

    expect(selected?.year).toBe(2030);
    expect(selected?.value).toBeGreaterThan(150);
  });
});
