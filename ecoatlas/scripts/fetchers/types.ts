/**
 * A single data point in a time series.
 * `date` is a string like "2022" (annual) or "2022-03-01" (monthly).
 */
export type SeriesPoint = {
  date: string;
  value: number;
};

/**
 * Configuration passed to each fetcher, derived from sourceMap + hotspots.json.
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
 * Every fetcher module must export a function matching this signature.
 * It receives the config for one metric and returns the series data.
 */
export type Fetcher = (config: FetcherConfig) => Promise<SeriesPoint[]>;

/**
 * Registry entry mapping a source ID to its fetcher function.
 */
export type FetcherRegistry = Record<string, Fetcher>;
