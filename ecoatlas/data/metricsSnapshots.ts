import type { MetricValue } from "../src/lib/schemas/metrics";

export const metricsSnapshots: Record<string, MetricValue> = {
  shipping_co2_share_pct: {
    kind: "snapshot",
    unit: "%",
    value: 2.89,
    asOfYear: 2018,
    sourceId: "imo_shipping_emissions",
  },
  aviation_co2_share_pct: {
    kind: "snapshot",
    unit: "%",
    value: 2.5,
    asOfYear: 2023,
    sourceId: "icao_aviation_emissions",
  },
  peatland_emissions_mtco2e: {
    kind: "snapshot",
    unit: "MtCO2e/yr",
    value: 800,
    asOfYear: 2024,
    sourceId: "src-wri-01",
  },
};

