# EcoAtlas

A web-based climate data visualization tool that maps global climate hotspots on an interactive 3D globe. Users can explore 16 locations — from fossil fuel super-emitters to regions facing severe climate impacts — with narrative context, time series data, and links to primary scientific sources.

> **Live:** [your-link-here]

![EcoAtlas Screenshot](./screenshot.png)

## What It Does

- Renders a 3D globe with 16 climate hotspots (8 drivers, 8 impacts)
- Each hotspot has a detail sidebar with story, data, trends, and source citations
- A time slider ("Climate Time Machine") adjusts hotspot size and color across 1990–2050
- A climate clock counts down the remaining carbon budget based on IPCC AR6 figures
- Search bar for quick hotspot lookup with globe rotation to the selected location

## Tech Stack

| Layer | Tools |
|-------|-------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| 3D Rendering | [Three.js](https://threejs.org/) + [react-globe.gl](https://github.com/vasturiano/react-globe.gl) |
| Styling | Tailwind CSS v4, Inter font |
| UI Primitives | Radix UI (Tabs, ScrollArea, Separator) |
| Data Validation | Zod |
| Analytics | PostHog |
| Data Processing | Python (xarray, netCDF4) for EDGAR NetCDF files; Node.js scripts for NOAA/IEA ingestion |

## Data Sources

Hotspot data is sourced from publicly available climate datasets. A typed source catalog in `src/data/sourceMap.ts` maps each hotspot to its relevant metrics and upstream sources.

Currently referenced sources include:

- **NOAA** — Mauna Loa CO₂ monthly, Arctic Report Card, Coral Reef Watch
- **EDGAR v8.0** (EU JRC) — Gridded CH₄ emissions, 1970–2022
- **IEA** — Methane Tracker
- **Climate TRACE** — Facility-level emissions
- **ESA Sentinel-5P** — Satellite methane plume detection
- **NASA** — FIRMS fire detection, GRACE-FO water monitoring
- **Global Forest Watch** — Deforestation alerts
- **EM-DAT / Germanwatch** — Disaster and climate risk indices

Not all sources are fully integrated yet. Each metric in the source map is marked `implemented` or `planned`.

## Project Structure

```
ecoatlas/
├── app/
│   ├── components/
│   │   └── GlobeView.tsx        # Main application component
│   ├── globe/page.tsx           # Globe route
│   └── layout.tsx
├── components/
│   ├── Sidebar.tsx              # Hotspot detail panel
│   ├── MetricCard.tsx           # Data display card with sparkline
│   ├── InfoTable.tsx            # Tabular data display
│   ├── Sparkline.tsx            # Inline chart component
│   └── ui/                      # Radix-based primitives
├── data/
│   ├── hotspots.json            # 16 hotspot locations
│   ├── hotspotDetails/          # Per-hotspot detail JSON (hs-001 through hs-016)
│   └── series/                  # Time series data (CO₂, methane)
├── src/data/
│   └── sourceMap.ts             # Typed catalog of all data sources and metrics
├── scripts/
│   ├── fetch_co2_mlo.js         # NOAA CO₂ data fetcher
│   ├── import_iea_methane_series.js
│   └── edgar/                   # EDGAR NetCDF aggregation scripts
└── lib/
    ├── analytics.ts             # PostHog wrapper
    └── utils.ts
```

## Getting Started

```bash
cd ecoatlas
npm install
npm run dev
```

Open [http://localhost:3000/globe](http://localhost:3000/globe).

### Data Scripts

Fetch updated CO₂ data from NOAA:
```bash
npm run update:co2
```

Import IEA methane series:
```bash
npm run update:methane
```

Run EDGAR NetCDF aggregation (requires Python with xarray, netCDF4, numpy):
```bash
pip install -r requirements.txt
npm run update:edgar
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hotspots` | GET | Returns all 16 hotspot locations |
| `/api/hotspots/:id` | GET | Returns detail for a single hotspot |

Both routes use `generateStaticParams` and `dynamic = "force-static"` so responses are pre-rendered at build time.

## How the Time Machine Works

The time slider spans 1990–2050. For each year, hotspot visualization properties are recalculated:

- **Drivers** grow larger and shift from orange → crimson → dark red
- **High-severity impacts** darken and grow
- **Low-severity impacts** lighten and shrink (representing potential improvement)

Color blending uses linear interpolation between hex values converted to RGB. Ring animations (propagation speed, max radius, opacity) also respond to the selected year.

## Climate Clock

The header displays a live countdown to carbon budget exhaustion based on:

- **Carbon budget:** 250 Gt CO₂ remaining (IPCC AR6, as of Jan 2024)
- **Emissions rate:** 40.2 Gt CO₂/year
- **Current warming:** +1.29°C above pre-industrial

The countdown ticks every second. Clicking it opens a sidebar with a detailed breakdown.

## Deployment

Built for Vercel. No environment variables are required for core functionality.

Optional:
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog host (defaults to `https://app.posthog.com`)

## Notes

- Raw EDGAR NetCDF files (~15GB) are excluded from the repo via `.gitignore`. Only processed JSON is committed.
- The `data/raw/` directory is gitignored. If you need the raw NetCDF files, download them directly from [EDGAR](https://edgar.jrc.ec.europa.eu/).
