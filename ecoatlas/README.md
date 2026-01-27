This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Analytics (PostHog)

Set these env vars in a `.env.local` file:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_************************
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Data Sources (Planned & Implemented)

| Hotspot | Metric | Source name | Cadence | Status |
| --- | --- | --- | --- | --- |
| Global Atmosphere (Mauna Loa CO2) | CO2 ppm monthly | NOAA GML Mauna Loa CO2 (Monthly Mean) | monthly | Implemented |
| Amazon Deforestation Arc | Deforestation rate (km²/year) | IPCC AR6 (placeholder) | static | Planned |
| Amazon Deforestation Arc | Land-use emissions (MtCO2e) | IPCC AR6 (placeholder) | static | Planned |
| Livestock / Feedlot Corridors | Livestock GHG share (%) | IPCC AR6 (placeholder) | static | Planned |
| Southeast Asian Peatlands | Peatland emissions (MtCO2e) | IPCC AR6 (placeholder) | static | Planned |
| Shipping Lanes | Shipping CO2 share (%) | Our World in Data (placeholder) | annual | Planned |
| Aviation Corridors | Aviation CO2 share (%) | Our World in Data (placeholder) | annual | Planned |
| Permian Basin | Oil & gas emissions (MtCO2e) | Our World in Data (placeholder) | annual | Planned |
| North China Plain Coal | Coal power emissions (MtCO2e) | Our World in Data (placeholder) | annual | Planned |
| West Siberian Gas | Methane leak rate (%) | IPCC AR6 (placeholder) | static | Planned |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
