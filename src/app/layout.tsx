import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";

import "./globals.css";

const uiFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"]
});

const reportFont = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-report",
  weight: "variable",
  axes: ["opsz"]
});

export const metadata: Metadata = {
  title: "Hallmarks of Aging LEV Tracker",
  description:
    "A public evidence map for longevity escape velocity, organized by the Hallmarks of Aging and focused on field evidence, evidence gaps, and results that would matter."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${uiFont.variable} ${reportFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
