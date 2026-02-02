import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import AnalyticsProvider from "./components/AnalyticsProvider";

export const metadata: Metadata = {
  title: "EcoAtlas",
  description: "Interactive 3D globe visualizing climate hotspots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans text-white antialiased">
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
