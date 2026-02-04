# EcoAtlas Data Documentation

This document explains the data sources, structure, and how data is used throughout the EcoAtlas application.

## Data Overview

EcoAtlas visualizes climate change hotspots on an interactive 3D globe. The application uses several types of data to provide users with meaningful insights into global climate impacts and drivers.

## Data Sources

### 1. Hotspot Data

#### Hotspot List (`/api/hotspots`)
Returns a list of all climate hotspots for globe visualization.

**File:** `data/hotspots.json`

**Structure:**
```json
{
  "id": "hs-001",
  "name": "Amazon Basin",
  "lat": -3.4653,
  "lng": -62.2159,
  "severity": 4,
  "topic": "Deforestation",
  "type": "driver"
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the hotspot |
| `name` | string | Human-readable location name |
| `lat` | number | Latitude coordinate |
| `lng` | number | Longitude coordinate |
| `severity` | number | Severity rating (1-5, where 5 is most severe) |
| `topic` | string | Climate topic category |
| `type` | "driver" \| "impact" | Whether this is a climate driver or impact |

**Usage:**
- Rendered as points on the 3D globe
- Color-coded: Red for drivers, Blue for impacts
- Size/color intensity varies with the Climate Time Machine year selection
- Searchable via the search bar

#### Hotspot Details (`/api/hotspots/:id`)
Returns detailed information about a specific hotspot.

**Files:** `data/hotspotDetails/hs-*.json`

**Structure:**
```json
{
  "id": "hs-001",
  "story": {
    "headline": "Forest Loss Accelerates Along New Road Corridors",
    "summary": "Recent satellite readings show...",
    "climateImpact": "Deforestation releases stored carbon...",
    "causeEffect": [
      "Road access expands logging and land clearing",
      "Tree loss reduces carbon storage",
      "More CO₂ stays in the atmosphere"
    ],
    "scaleContext": "The Amazon stores billions of tons of carbon...",
    "outlook": "If current clearing rates persist..."
  },
  "sources": [
    "https://example.org/amazon-report"
  ],
  "series": [
    { "year": 2019, "value": 42 },
    { "year": 2020, "value": 50 }
  ]
}
```

**Usage:**
- Displayed in the sidebar when a hotspot is selected
- **Story tab:** Narrative explanation with headline, summary, cause-effect chain
- **Data tab:** Time series visualization showing trends
- **Sources tab:** External reference links for verification

### 2. EDGAR Emissions Data

**Source:** European Commission Joint Research Centre (JRC) EDGAR Database v8.0

**Files:** `data/raw/edgar/TOTALS_emi_nc/*.nc`

**Description:**
NetCDF files containing global greenhouse gas emissions data, specifically methane (CH₄) total emissions from 1970-2022.

**File naming:** `v8.0_FT2022_GHG_CH4_{YEAR}_TOTALS_emi.nc`

**Coverage:**
- Years: 1970-2022 (53 annual files)
- Gas: CH₄ (Methane)
- Spatial: Global gridded data

**Usage:**
- Provides historical emissions context
- Can be aggregated for regional analysis
- Supports the Climate Time Machine temporal visualization

### 3. Time Series Data

**Files:** `data/series/*.json`

Additional time series for specific metrics:
- `co2_mlo_monthly.json` - CO₂ measurements from Mauna Loa Observatory
- `siberian_methane_leakage_mt.json` - Methane leakage estimates
- `siberian_methane_leakage_mt_annual.json` - Annual methane data

## How Data is Used

### Globe Visualization

1. **Initial Load:** Fetches all hotspots from `/api/hotspots`
2. **Point Rendering:** Each hotspot becomes a clickable point on the globe
3. **Dynamic Styling:** 
   - Drivers (red): Grow larger and shift from orange to dark red as years progress
   - Impacts (blue): Behavior varies by severity - high severity worsens, low severity improves

### Climate Time Machine

The time dial (1990-2050) dynamically adjusts hotspot visualization:

**Drivers:**
- Size increases over time (simulating worsening conditions)
- Color shifts: Pale orange (1990) → Crimson (2024) → Dark red (2050)

**Impacts:**
- High severity (≥3): Size increases, color darkens
- Low severity (<3): Size decreases, color lightens (representing improvement)

### Sidebar Content

When a user clicks a hotspot:
1. Fetches detailed data from `/api/hotspots/:id`
2. Populates tabs:
   - **Story:** Narrative explanation with cause-effect relationships
   - **Data:** Charts showing historical trends
   - **Trends:** (Future) Additional trend analysis
   - **Layers:** (Future) Map layer controls
   - **Sources:** External references and citations

### Climate Clock

Real-time calculations based on IPCC AR6 data:
- Current global warming: 1.29°C above pre-industrial
- Remaining carbon budget for 1.5°C target
- Global emissions rate: 40.2 Gt CO₂/year
- Countdown to budget exhaustion

## Data Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Static JSON   │     │   API Routes    │     │   GlobeView     │
│   (hotspots,    │────▶│   /api/hotspots │────▶│   Component     │
│   details)      │     │   /api/:id      │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │  Climate Time   │◀─────────────┤
                        │  Machine State  │              │
                        │  (currentYear)  │              │
                        └────────┬────────┘              │
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Hotspot Size/  │     │    Sidebar      │
                        │  Color Calc     │     │    Content      │
                        └─────────────────┘     └─────────────────┘
```

## Future Data Enhancements

Planned additions:
- Real-time emissions data integration
- Additional greenhouse gases (CO₂, N₂O)
- Sector-specific emissions breakdowns
- Regional policy and action tracking
- Non-profit and solution provider data
