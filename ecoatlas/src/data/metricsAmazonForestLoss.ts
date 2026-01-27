import type { MetricValue } from "../lib/schemas/metrics";

export const amazonPrimaryForestLoss: MetricValue = {
  kind: "series",
  unit: "Million Hectares",
  sourceId: "src-gfw-01",
  series: [
    { date: "2019", value: 3.9 },
    { date: "2020", value: 4.5 },
    { date: "2021", value: 3.7 },
    { date: "2022", value: 4.1 },
    { date: "2023", value: 3.3 },
  ],
};

