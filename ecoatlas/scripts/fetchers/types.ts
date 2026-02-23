/**
 * Shared types for the data ingestion pipeline.
 *
 * Every fetcher module (climatetrace, edgar, gfw, etc.) imports these types
 * to ensure a consistent interface. The ingest orchestrator builds a
 * FetcherConfig for each metric and dispatches it to the matching Fetcher.
 */

/**
 * A single data point in a time series.
 * `date` is either a year string ("2022") for annual data or an ISO date
 * ("2022-03-01") for monthly/daily data. The API and frontend handle both.
 */
export type SeriesPoint = {
  date: string;
  value: number;
};

/**
 * Context passed to each fetcher, assembled by ingest.ts from sourceMap
 * and hotspots.json. Fetchers use the lat/lng and bbox for spatial API
 * queries, and metricKey to know which metric they're populating.
 */
export type FetcherConfig = {
  hotspotId: string;
  metricKey: string;
  lat: number;
  lng: number;
  /** Bounding box [lonMin, latMin, lonMax, latMax] for spatial queries */
  bbox?: [number, number, number, number];
  unit?: string;
  sourceIds: string[];
};

/**
 * The function signature every fetcher must implement. Receives config for
 * one metric, returns the time-series data. Returning an empty array signals
 * "no data available" and the ingest pipeline skips writing a file (the API
 * will fall back to metricsSnapshots).
 */
export type Fetcher = (config: FetcherConfig) => Promise<SeriesPoint[]>;

/**
 * Registry mapping source IDs (from sourceMap.sources[].id) to their
 * fetcher functions. Defined in ingest.ts.
 */
export type FetcherRegistry = Record<string, Fetcher>;
