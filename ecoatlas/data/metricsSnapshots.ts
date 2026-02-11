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

  // Svalbard / Arctic — NOAA Arctic Report Card
  arctic_temperature_anomaly_c: {
    kind: "snapshot",
    unit: "°C",
    value: 2.8,
    asOfYear: 2023,
    sourceId: "noaa_arctic_report",
  },
  sea_ice_extent_km2: {
    kind: "snapshot",
    unit: "million km²",
    value: 4.23,
    asOfYear: 2023,
    sourceId: "noaa_arctic_report",
  },
  permafrost_thaw_depth_cm: {
    kind: "snapshot",
    unit: "cm",
    value: 89,
    asOfYear: 2023,
    sourceId: "noaa_arctic_report",
  },

  // Lake Chad — NASA GRACE / FAO AQUASTAT
  lake_surface_area_km2: {
    kind: "snapshot",
    unit: "km²",
    value: 1200,
    asOfYear: 2023,
    sourceId: "nasa_grace",
  },
  water_availability_m3_capita: {
    kind: "snapshot",
    unit: "m³/person/year",
    value: 920,
    asOfYear: 2022,
    sourceId: "fao_aquastat",
  },

  // Great Barrier Reef — AIMS
  coral_cover_pct: {
    kind: "snapshot",
    unit: "%",
    value: 27,
    asOfYear: 2023,
    sourceId: "aims_reef_monitoring",
  },
  mass_bleaching_events: {
    kind: "snapshot",
    unit: "events",
    value: 7,
    asOfYear: 2024,
    sourceId: "aims_reef_monitoring",
  },

  // California — drought
  drought_severity_index: {
    kind: "snapshot",
    unit: "index",
    value: -2.4,
    asOfYear: 2023,
    sourceId: "noaa_mlo_co2_monthly",
  },

  // Pantanal — flood pulse
  flood_pulse_anomaly: {
    kind: "snapshot",
    unit: "days",
    value: -20,
    asOfYear: 2023,
    sourceId: "nasa_grace",
  },
};

