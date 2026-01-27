export type SourceRef = {
  id: string;
  name: string;
  url: string;
  publisher?: string;
  cadence?: "daily" | "weekly" | "monthly" | "annual" | "static";
  format?: "json" | "csv" | "txt" | "pdf";
  notes?: string;
};

export type MetricMapping = {
  metricKey: string;
  unit?: string;
  description: string;
  sources: string[];
  status: "implemented" | "planned";
  dataPath?: string;
};

export type HotspotSourceMapping = {
  hotspotId: string;
  hotspotName: string;
  hotspotType: "driver" | "impact";
  driverCategory?: "fossil" | "land-use" | "biogenic" | "infrastructure";
  primaryGas?: "CO2" | "CH4" | "N2O" | "CO2e";
  metrics: MetricMapping[];
};

export type SourceMap = {
  sources: SourceRef[];
  hotspots: HotspotSourceMapping[];
};

export const sourceMap: SourceMap = {
  sources: [
    {
      id: "noaa_mlo_co2_monthly",
      name: "NOAA GML Mauna Loa CO2 (Monthly Mean)",
      url: "https://gml.noaa.gov/ccgg/trends/data.html",
      publisher: "NOAA",
      cadence: "monthly",
      format: "txt",
      notes: "Mauna Loa record includes a pause in late 2022 and resumes in 2023.",
    },
    {
      id: "placeholder_ipcc_ar6",
      name: "IPCC AR6 (placeholder)",
      url: "https://www.ipcc.ch/report/ar6/",
      publisher: "IPCC",
      cadence: "static",
      format: "pdf",
      notes: "Placeholder until a metric-specific dataset is selected.",
    },
    {
      id: "placeholder_owid",
      name: "Our World in Data (placeholder)",
      url: "https://ourworldindata.org/",
      publisher: "Our World in Data",
      cadence: "annual",
      format: "csv",
      notes: "Placeholder until a metric-specific dataset is selected.",
    },
    {
      id: "imo_shipping_emissions",
      name: "International Maritime Organization (IMO)",
      url: "https://www.imo.org/en/OurWork/Environment/Pages/Greenhouse-Gas-Studies-2014.aspx",
      publisher: "IMO",
      cadence: "static",
      format: "pdf",
      notes: "Snapshot value used until a time series is integrated.",
    },
    {
      id: "icao_aviation_emissions",
      name: "International Civil Aviation Organization (ICAO)",
      url: "https://www.icao.int/environmental-protection/Pages/ClimateChange.aspx",
      publisher: "ICAO",
      cadence: "annual",
      format: "pdf",
      notes: "Snapshot value used until a time series is integrated.",
    },
    {
      id: "src-wri-01",
      name: "World Resources Institute (WRI)",
      url: "https://www.wri.org/",
      publisher: "World Resources Institute",
      cadence: "annual",
      format: "pdf",
      notes:
        "Focus on Southeast Asian peatland oxidation and fire emissions.",
    },
    {
      id: "src-iea-methane",
      name: "IEA Methane Tracker 2025",
      url: "https://www.iea.org/reports/methane-tracker",
      publisher: "IEA Methane Tracker 2025",
      cadence: "annual",
      format: "csv",
      notes:
        "Standard for satellite-verified methane leakage data.",
    },
    {
      id: "src-gfw-01",
      name: "Global Forest Watch (Primary Forest Loss)",
      url: "https://www.globalforestwatch.org/",
      publisher: "Global Forest Watch",
      cadence: "annual",
      format: "csv",
      notes: "Primary forest loss time series, used for Amazon Basin.",
    },
  ],
  hotspots: [
    {
      hotspotId: "hs-000",
      hotspotName: "Global Atmosphere (Mauna Loa CO2)",
      hotspotType: "driver",
      driverCategory: "infrastructure",
      primaryGas: "CO2",
      metrics: [
        {
          metricKey: "co2_ppm_monthly",
          unit: "ppm",
          description: "Atmospheric CO2 monthly mean from Mauna Loa.",
          sources: ["noaa_mlo_co2_monthly"],
          status: "implemented",
          dataPath: "data/series/co2_mlo_monthly.json",
        },
      ],
    },
    {
      hotspotId: "hs-001",
      hotspotName: "Amazon Deforestation Arc",
      hotspotType: "driver",
      driverCategory: "land-use",
      primaryGas: "CO2e",
      metrics: [
        {
          metricKey: "deforestation_rate_km2_per_year",
          unit: "km²/year",
          description: "Annual deforestation rate in the region.",
          sources: ["placeholder_ipcc_ar6"],
          status: "planned",
        },
        {
          metricKey: "land_use_emissions_mtco2e",
          unit: "MtCO2e",
          description: "Land-use change emissions attributable to deforestation.",
          sources: ["placeholder_ipcc_ar6"],
          status: "planned",
        },
        {
          metricKey: "amazon_primary_forest_loss_mha",
          unit: "Million Hectares",
          description: "Primary forest loss in the Amazon Basin.",
          sources: ["src-gfw-01"],
          status: "implemented",
          dataPath: "src/data/metricsAmazonForestLoss.ts",
        },
      ],
    },
    {
      hotspotId: "hs-008",
      hotspotName: "Shipping Lanes",
      hotspotType: "driver",
      driverCategory: "infrastructure",
      primaryGas: "CO2",
      metrics: [
        {
          metricKey: "shipping_co2_share_pct",
          unit: "% of global CO2",
          description: "Share of global CO2 emissions attributable to shipping.",
          sources: ["imo_shipping_emissions"],
          status: "implemented",
          dataPath: "data/metricsSnapshots.ts",
        },
      ],
    },
    {
      hotspotId: "hs-009",
      hotspotName: "Aviation Corridors",
      hotspotType: "driver",
      driverCategory: "infrastructure",
      primaryGas: "CO2",
      metrics: [
        {
          metricKey: "aviation_co2_share_pct",
          unit: "% of global CO2",
          description:
            "Share of global CO2 emissions from aviation (non-CO2 effects noted separately).",
          sources: ["icao_aviation_emissions"],
          status: "implemented",
          dataPath: "data/metricsSnapshots.ts",
        },
      ],
    },
    {
      hotspotId: "hs-007",
      hotspotName: "Southeast Asian Peatlands",
      hotspotType: "driver",
      driverCategory: "land-use",
      primaryGas: "CO2e",
      metrics: [
        {
          metricKey: "peatland_emissions_mtco2e",
          unit: "MtCO2e/yr",
          description: "Emissions from peatland oxidation and fires.",
          sources: ["src-wri-01"],
          status: "implemented",
          dataPath: "data/metricsSnapshots.ts",
        },
      ],
    },
    {
      hotspotId: "hs-012",
      hotspotName: "West Siberian Gas",
      hotspotType: "driver",
      driverCategory: "fossil",
      primaryGas: "CH4",
      metrics: [
        {
          metricKey: "siberian_methane_leakage_mt",
          unit: "Mt CH4/yr",
          description: "Estimated methane leakage from West Siberian gas systems.",
          sources: ["src-iea-methane"],
          status: "implemented",
          dataPath: "data/series/siberian_methane_leakage_mt_annual.json",
        },
      ],
    },
  ],
};

