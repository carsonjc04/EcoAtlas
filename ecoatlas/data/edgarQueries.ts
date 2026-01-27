export type EdgarQuery = {
  release: string;
  gas: "CO2" | "CH4" | "N2O";
  sector: string;
  bbox: [number, number, number, number];
  unit: string;
  outputPath: string;
  var: string;
};

export const edgarQueries: Record<string, EdgarQuery> = {
  siberian_methane_leakage_mt: {
    release: "v8.0_FT2022",
    gas: "CH4",
    sector: "TOTALS",
    bbox: [60, 52, 95, 72],
    unit: "Mt CH4/yr",
    outputPath: "data/series/siberian_methane_leakage_mt.json",
    var: "emissions",
  },
  peatland_emissions_mtco2e: {
    release: "v8.0_FT2022",
    gas: "CO2",
    sector: "TOTALS",
    bbox: [95, -10, 140, 10],
    unit: "MtCO2e/yr",
    outputPath: "data/series/peatland_emissions_mtco2e.json",
    var: "emissions",
  },
};

