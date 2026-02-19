export type SourceRef = {
  id: string;
  name: string;
  url: string;
  publisher?: string;
  cadence?: "daily" | "weekly" | "monthly" | "annual" | "static";
  format?: "json" | "csv" | "txt" | "pdf" | "api";
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
  driverCategory?: "fossil-oil" | "fossil-coal" | "fossil-gas" | "land-use" | "natural";
  impactCategory?: "temperature" | "storms" | "flooding" | "ecosystem" | "water";
  primaryGas?: "CO2" | "CH4" | "N2O" | "CO2e";
  superEmitter?: boolean;
  metrics: MetricMapping[];
};

export type SourceMap = {
  sources: SourceRef[];
  hotspots: HotspotSourceMapping[];
};

export const sourceMap: SourceMap = {
  sources: [
    // ============================================
    // Atmospheric & General Climate Data
    // ============================================
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
      id: "noaa_arctic_report",
      name: "NOAA Arctic Report Card",
      url: "https://arctic.noaa.gov/Report-Card",
      publisher: "NOAA",
      cadence: "annual",
      format: "pdf",
      notes: "Annual assessment of Arctic environmental conditions.",
    },
    {
      id: "copernicus_era5",
      name: "Copernicus ERA5 Reanalysis",
      url: "https://cds.climate.copernicus.eu/",
      publisher: "ECMWF/Copernicus",
      cadence: "monthly",
      format: "api",
      notes: "Global climate reanalysis data from 1940 to present.",
    },

    // ============================================
    // Emissions Databases
    // ============================================
    {
      id: "climate_trace",
      name: "Climate TRACE",
      url: "https://climatetrace.org/",
      publisher: "Climate TRACE Coalition",
      cadence: "annual",
      format: "api",
      notes: "Facility-level emissions data using satellite and AI analysis.",
    },
    {
      id: "edgar_jrc",
      name: "EDGAR v8.0 (JRC)",
      url: "https://edgar.jrc.ec.europa.eu/",
      publisher: "European Commission JRC",
      cadence: "annual",
      format: "csv",
      notes: "Global gridded emissions inventory 1970-2022.",
    },
    {
      id: "src-iea-methane",
      name: "IEA Methane Tracker 2025",
      url: "https://www.iea.org/reports/methane-tracker",
      publisher: "International Energy Agency",
      cadence: "annual",
      format: "csv",
      notes: "Standard for satellite-verified methane leakage data.",
    },
    {
      id: "epa_ghgrp",
      name: "EPA Greenhouse Gas Reporting Program",
      url: "https://www.epa.gov/ghgreporting",
      publisher: "US EPA",
      cadence: "annual",
      format: "csv",
      notes: "Facility-level US emissions reporting (required by law).",
    },

    // ============================================
    // Energy & Fossil Fuel Sources
    // ============================================
    {
      id: "global_energy_monitor",
      name: "Global Energy Monitor",
      url: "https://globalenergymonitor.org/",
      publisher: "Global Energy Monitor",
      cadence: "monthly",
      format: "csv",
      notes: "Tracks coal mines, oil/gas fields, and power plants globally.",
    },
    {
      id: "sentinel_5p",
      name: "Sentinel-5P TROPOMI",
      url: "https://sentinel.esa.int/web/sentinel/missions/sentinel-5p",
      publisher: "ESA/Copernicus",
      cadence: "daily",
      format: "api",
      notes: "Satellite methane and NO2 plume detection for super-emitters.",
    },

    // ============================================
    // Land Use & Deforestation
    // ============================================
    {
      id: "src-gfw-01",
      name: "Global Forest Watch",
      url: "https://www.globalforestwatch.org/",
      publisher: "World Resources Institute",
      cadence: "weekly",
      format: "api",
      notes: "Near-real-time deforestation alerts and annual tree cover loss.",
    },
    {
      id: "inpe_prodes",
      name: "INPE PRODES/DETER",
      url: "http://terrabrasilis.dpi.inpe.br/",
      publisher: "INPE (Brazil)",
      cadence: "monthly",
      format: "api",
      notes: "Official Amazon deforestation monitoring system.",
    },
    {
      id: "nasa_firms",
      name: "NASA FIRMS (Fire Information)",
      url: "https://firms.modaps.eosdis.nasa.gov/",
      publisher: "NASA",
      cadence: "daily",
      format: "api",
      notes: "Active fire detection from MODIS and VIIRS satellites.",
    },

    // ============================================
    // Disaster & Impact Databases
    // ============================================
    {
      id: "emdat_cred",
      name: "EM-DAT International Disaster Database",
      url: "https://www.emdat.be/",
      publisher: "CRED (Université catholique de Louvain)",
      cadence: "monthly",
      format: "csv",
      notes: "Comprehensive disaster database since 1900.",
    },
    {
      id: "germanwatch_cri",
      name: "Global Climate Risk Index",
      url: "https://www.germanwatch.org/en/cri",
      publisher: "Germanwatch",
      cadence: "annual",
      format: "pdf",
      notes: "Annual ranking of countries by climate-related losses.",
    },
    {
      id: "pagasa_typhoon",
      name: "PAGASA Tropical Cyclone Data",
      url: "https://www.pagasa.dph.gov.ph/",
      publisher: "PAGASA (Philippines)",
      cadence: "annual",
      format: "csv",
      notes: "Philippine typhoon tracks and intensity records.",
    },

    // ============================================
    // Ocean & Coral Data
    // ============================================
    {
      id: "aims_reef_monitoring",
      name: "AIMS Long-Term Reef Monitoring",
      url: "https://www.aims.gov.au/",
      publisher: "Australian Institute of Marine Science",
      cadence: "annual",
      format: "csv",
      notes: "Great Barrier Reef coral cover and bleaching surveys since 1985.",
    },
    {
      id: "noaa_coral_reef_watch",
      name: "NOAA Coral Reef Watch",
      url: "https://coralreefwatch.noaa.gov/",
      publisher: "NOAA",
      cadence: "daily",
      format: "api",
      notes: "Sea surface temperature and bleaching alerts.",
    },

    // ============================================
    // Water & Hydrology
    // ============================================
    {
      id: "nasa_grace",
      name: "NASA GRACE-FO",
      url: "https://grace.jpl.nasa.gov/",
      publisher: "NASA/DLR",
      cadence: "monthly",
      format: "api",
      notes: "Tracks groundwater and surface water changes via gravity measurements.",
    },
    {
      id: "fao_aquastat",
      name: "FAO AQUASTAT",
      url: "https://www.fao.org/aquastat/",
      publisher: "FAO",
      cadence: "annual",
      format: "csv",
      notes: "Global water resources and usage statistics.",
    },
  ],

  hotspots: [
    // ============================================
    // DRIVERS - Fossil Fuels
    // ============================================
    {
      hotspotId: "hs-006",
      hotspotName: "Ghawar Oil Field, Saudi Arabia",
      hotspotType: "driver",
      driverCategory: "fossil-oil",
      primaryGas: "CO2",
      superEmitter: true,
      metrics: [
        {
          metricKey: "oil_extraction_emissions_mtco2",
          unit: "MtCO2/yr",
          description: "CO2 emissions from oil extraction and flaring.",
          sources: ["climate_trace", "edgar_jrc"],
          status: "implemented",
          dataPath: "data/series/hs-006/oil_extraction_emissions_mtco2.json",
        },
        {
          metricKey: "oil_production_barrels",
          unit: "Million barrels/day",
          description: "Daily oil production volume.",
          sources: ["global_energy_monitor"],
          status: "implemented",
          dataPath: "data/series/hs-006/oil_production_barrels.json",
        },
      ],
    },
    {
      hotspotId: "hs-008",
      hotspotName: "Shanxi Coal Mines, China",
      hotspotType: "driver",
      driverCategory: "fossil-coal",
      primaryGas: "CO2",
      superEmitter: true,
      metrics: [
        {
          metricKey: "coal_mining_emissions_mtco2",
          unit: "MtCO2/yr",
          description: "CO2 emissions from coal extraction and combustion.",
          sources: ["climate_trace", "global_energy_monitor", "edgar_jrc"],
          status: "implemented",
          dataPath: "data/series/hs-008/coal_mining_emissions_mtco2.json",
        },
        {
          metricKey: "methane_venting_mt",
          unit: "Mt CH4/yr",
          description: "Methane released from coal seams.",
          sources: ["sentinel_5p", "src-iea-methane"],
          status: "implemented",
          dataPath: "data/series/hs-008/methane_venting_mt.json",
        },
      ],
    },
    {
      hotspotId: "hs-009",
      hotspotName: "Permian Basin, USA",
      hotspotType: "driver",
      driverCategory: "fossil-gas",
      primaryGas: "CH4",
      superEmitter: true,
      metrics: [
        {
          metricKey: "permian_methane_leakage_mt",
          unit: "Mt CH4/yr",
          description: "Methane leakage from oil and gas operations.",
          sources: ["epa_ghgrp", "sentinel_5p", "src-iea-methane"],
          status: "implemented",
          dataPath: "data/series/hs-009/permian_methane_leakage_mt.json",
        },
        {
          metricKey: "flaring_emissions_mtco2",
          unit: "MtCO2/yr",
          description: "CO2 from natural gas flaring.",
          sources: ["climate_trace", "epa_ghgrp"],
          status: "implemented",
          dataPath: "data/series/hs-009/flaring_emissions_mtco2.json",
        },
      ],
    },
    {
      hotspotId: "hs-010",
      hotspotName: "Turkmenistan Gas Fields",
      hotspotType: "driver",
      driverCategory: "fossil-gas",
      primaryGas: "CH4",
      superEmitter: true,
      metrics: [
        {
          metricKey: "turkmenistan_methane_leakage_mt",
          unit: "Mt CH4/yr",
          description: "Methane leakage from gas infrastructure.",
          sources: ["src-iea-methane", "sentinel_5p"],
          status: "implemented",
          dataPath: "data/series/hs-010/turkmenistan_methane_leakage_mt.json",
        },
      ],
    },
    {
      hotspotId: "hs-012",
      hotspotName: "West Siberian Gas",
      hotspotType: "driver",
      driverCategory: "fossil-gas",
      primaryGas: "CH4",
      metrics: [
        {
          metricKey: "siberian_methane_leakage_mt",
          unit: "Mt CH4/yr",
          description: "Estimated methane leakage from West Siberian gas systems.",
          sources: ["src-iea-methane"],
          status: "implemented",
          dataPath: "data/series/hs-012/siberian_methane_leakage_mt.json",
        },
      ],
    },

    // ============================================
    // DRIVERS - Land Use
    // ============================================
    {
      hotspotId: "hs-001",
      hotspotName: "Amazon Basin (Mato Grosso)",
      hotspotType: "driver",
      driverCategory: "land-use",
      primaryGas: "CO2e",
      metrics: [
        {
          metricKey: "amazon_deforestation_km2",
          unit: "km²/year",
          description: "Annual deforestation rate in Mato Grosso region.",
          sources: ["src-gfw-01", "inpe_prodes"],
          status: "implemented",
          dataPath: "data/series/hs-001/amazon_deforestation_km2.json",
        },
        {
          metricKey: "amazon_primary_forest_loss_mha",
          unit: "Million Hectares",
          description: "Primary forest loss in the Amazon Basin.",
          sources: ["src-gfw-01"],
          status: "implemented",
          dataPath: "data/series/hs-001/amazon_primary_forest_loss_mha.json",
        },
        {
          metricKey: "land_use_emissions_mtco2e",
          unit: "MtCO2e",
          description: "Land-use change emissions from deforestation.",
          sources: ["climate_trace", "edgar_jrc"],
          status: "implemented",
          dataPath: "data/series/hs-001/land_use_emissions_mtco2e.json",
        },
      ],
    },
    {
      hotspotId: "hs-007",
      hotspotName: "Kalimantan, Indonesia",
      hotspotType: "driver",
      driverCategory: "land-use",
      primaryGas: "CO2e",
      metrics: [
        {
          metricKey: "peatland_fire_emissions_mtco2e",
          unit: "MtCO2e/yr",
          description: "Emissions from peatland fires.",
          sources: ["nasa_firms", "src-gfw-01"],
          status: "implemented",
          dataPath: "data/series/hs-007/peatland_fire_emissions_mtco2e.json",
        },
        {
          metricKey: "fire_count_annual",
          unit: "fire detections/year",
          description: "Number of active fire detections.",
          sources: ["nasa_firms"],
          status: "implemented",
          dataPath: "data/series/hs-007/fire_count_annual.json",
        },
        {
          metricKey: "peatland_area_burned_ha",
          unit: "hectares",
          description: "Peatland area affected by fires.",
          sources: ["src-gfw-01"],
          status: "implemented",
          dataPath: "data/series/hs-007/peatland_area_burned_ha.json",
        },
      ],
    },

    // ============================================
    // DRIVERS - Natural
    // ============================================
    {
      hotspotId: "hs-011",
      hotspotName: "Sudd Wetlands, South Sudan",
      hotspotType: "driver",
      driverCategory: "natural",
      primaryGas: "CH4",
      metrics: [
        {
          metricKey: "wetland_methane_emissions_mt",
          unit: "Mt CH4/yr",
          description: "Natural methane emissions from wetland decomposition.",
          sources: ["edgar_jrc"],
          status: "implemented",
          dataPath: "data/series/hs-011/wetland_methane_emissions_mt.json",
        },
      ],
    },

    // ============================================
    // IMPACTS - Temperature
    // ============================================
    {
      hotspotId: "hs-005",
      hotspotName: "Svalbard, Norway",
      hotspotType: "impact",
      impactCategory: "temperature",
      metrics: [
        {
          metricKey: "arctic_temperature_anomaly_c",
          unit: "°C",
          description: "Temperature anomaly vs 1951-1980 baseline.",
          sources: ["noaa_arctic_report", "copernicus_era5"],
          status: "implemented",
          dataPath: "data/series/hs-005/arctic_temperature_anomaly_c.json",
        },
        {
          metricKey: "sea_ice_extent_km2",
          unit: "million km²",
          description: "September minimum sea ice extent.",
          sources: ["noaa_arctic_report"],
          status: "implemented",
          dataPath: "data/series/hs-005/sea_ice_extent_km2.json",
        },
        {
          metricKey: "permafrost_thaw_depth_cm",
          unit: "cm",
          description: "Active layer thickness increase.",
          sources: ["noaa_arctic_report"],
          status: "implemented",
          dataPath: "data/series/hs-005/permafrost_thaw_depth_cm.json",
        },
      ],
    },

    // ============================================
    // IMPACTS - Storms
    // ============================================
    {
      hotspotId: "hs-013",
      hotspotName: "St. Vincent & Grenadines",
      hotspotType: "impact",
      impactCategory: "storms",
      metrics: [
        {
          metricKey: "hurricane_frequency",
          unit: "events/year",
          description: "Number of hurricane-force storms affecting the region.",
          sources: ["emdat_cred", "germanwatch_cri"],
          status: "implemented",
          dataPath: "data/series/hs-013/hurricane_frequency.json",
        },
        {
          metricKey: "storm_damage_usd",
          unit: "USD millions",
          description: "Economic losses from storm damage.",
          sources: ["emdat_cred"],
          status: "implemented",
          dataPath: "data/series/hs-013/storm_damage_usd.json",
        },
      ],
    },
    {
      hotspotId: "hs-014",
      hotspotName: "Manila, Philippines",
      hotspotType: "impact",
      impactCategory: "storms",
      metrics: [
        {
          metricKey: "typhoon_count_annual",
          unit: "typhoons/year",
          description: "Number of typhoons making landfall.",
          sources: ["pagasa_typhoon", "emdat_cred"],
          status: "implemented",
          dataPath: "data/series/hs-014/typhoon_count_annual.json",
        },
        {
          metricKey: "typhoon_fatalities",
          unit: "deaths/year",
          description: "Fatalities attributed to typhoons.",
          sources: ["emdat_cred", "germanwatch_cri"],
          status: "implemented",
          dataPath: "data/series/hs-014/typhoon_fatalities.json",
        },
        {
          metricKey: "climate_risk_index_rank",
          unit: "rank",
          description: "Position in Global Climate Risk Index.",
          sources: ["germanwatch_cri"],
          status: "implemented",
          dataPath: "data/series/hs-014/climate_risk_index_rank.json",
        },
      ],
    },

    // ============================================
    // IMPACTS - Flooding
    // ============================================
    {
      hotspotId: "hs-016",
      hotspotName: "Dhaka, Bangladesh",
      hotspotType: "impact",
      impactCategory: "flooding",
      metrics: [
        {
          metricKey: "flood_affected_population",
          unit: "millions",
          description: "Population affected by annual flooding.",
          sources: ["emdat_cred"],
          status: "implemented",
          dataPath: "data/series/hs-016/flood_affected_population.json",
        },
        {
          metricKey: "sea_level_rise_mm",
          unit: "mm/year",
          description: "Local sea level rise rate.",
          sources: ["copernicus_era5"],
          status: "implemented",
          dataPath: "data/series/hs-016/sea_level_rise_mm.json",
        },
        {
          metricKey: "monsoon_rainfall_anomaly_pct",
          unit: "%",
          description: "Monsoon rainfall deviation from average.",
          sources: ["copernicus_era5"],
          status: "implemented",
          dataPath: "data/series/hs-016/monsoon_rainfall_anomaly_pct.json",
        },
      ],
    },

    // ============================================
    // IMPACTS - Ecosystem
    // ============================================
    {
      hotspotId: "hs-002",
      hotspotName: "Great Barrier Reef",
      hotspotType: "impact",
      impactCategory: "ecosystem",
      metrics: [
        {
          metricKey: "coral_cover_pct",
          unit: "%",
          description: "Live coral cover percentage.",
          sources: ["aims_reef_monitoring"],
          status: "implemented",
          dataPath: "data/series/hs-002/coral_cover_pct.json",
        },
        {
          metricKey: "bleaching_severity",
          unit: "DHW",
          description: "Degree Heating Weeks - bleaching stress metric.",
          sources: ["noaa_coral_reef_watch"],
          status: "implemented",
          dataPath: "data/series/hs-002/bleaching_severity.json",
        },
        {
          metricKey: "mass_bleaching_events",
          unit: "events",
          description: "Number of mass bleaching events recorded.",
          sources: ["aims_reef_monitoring"],
          status: "implemented",
          dataPath: "data/series/hs-002/mass_bleaching_events.json",
        },
      ],
    },
    {
      hotspotId: "hs-015",
      hotspotName: "The Pantanal, Brazil",
      hotspotType: "impact",
      impactCategory: "ecosystem",
      metrics: [
        {
          metricKey: "wetland_area_burned_ha",
          unit: "hectares",
          description: "Area of wetland affected by fires.",
          sources: ["nasa_firms", "inpe_prodes"],
          status: "implemented",
          dataPath: "data/series/hs-015/wetland_area_burned_ha.json",
        },
        {
          metricKey: "flood_pulse_anomaly",
          unit: "days",
          description: "Deviation in annual flood pulse duration.",
          sources: ["nasa_grace"],
          status: "implemented",
          dataPath: "data/series/hs-015/flood_pulse_anomaly.json",
        },
      ],
    },
    {
      hotspotId: "hs-003",
      hotspotName: "California Coast",
      hotspotType: "impact",
      impactCategory: "ecosystem",
      metrics: [
        {
          metricKey: "wildfire_area_burned_ha",
          unit: "hectares",
          description: "Annual area burned by wildfires.",
          sources: ["nasa_firms"],
          status: "implemented",
          dataPath: "data/series/hs-003/wildfire_area_burned_ha.json",
        },
        {
          metricKey: "drought_severity_index",
          unit: "index",
          description: "Palmer Drought Severity Index.",
          sources: ["noaa_mlo_co2_monthly"],
          status: "implemented",
          dataPath: "data/series/hs-003/drought_severity_index.json",
        },
      ],
    },

    // ============================================
    // IMPACTS - Water Scarcity
    // ============================================
    {
      hotspotId: "hs-004",
      hotspotName: "Lake Chad",
      hotspotType: "impact",
      impactCategory: "water",
      metrics: [
        {
          metricKey: "lake_surface_area_km2",
          unit: "km²",
          description: "Lake surface area (90% reduction since 1960s).",
          sources: ["nasa_grace", "fao_aquastat"],
          status: "implemented",
          dataPath: "data/series/hs-004/lake_surface_area_km2.json",
        },
        {
          metricKey: "water_availability_m3_capita",
          unit: "m³/person/year",
          description: "Per capita water availability in the basin.",
          sources: ["fao_aquastat"],
          status: "implemented",
          dataPath: "data/series/hs-004/water_availability_m3_capita.json",
        },
      ],
    },

    // ============================================
    // GLOBAL REFERENCE
    // ============================================
    {
      hotspotId: "hs-000",
      hotspotName: "Global Atmosphere (Mauna Loa CO2)",
      hotspotType: "driver",
      driverCategory: "fossil-gas",
      primaryGas: "CO2",
      metrics: [
        {
          metricKey: "co2_ppm_monthly",
          unit: "ppm",
          description: "Atmospheric CO2 monthly mean from Mauna Loa.",
          sources: ["noaa_mlo_co2_monthly"],
          status: "implemented",
          dataPath: "data/series/hs-000/co2_ppm_monthly.json",
        },
      ],
    },
  ],
};
