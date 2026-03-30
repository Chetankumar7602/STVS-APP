import { Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { siteData } from "@/lib/data";
import FloatingMapsButton from "@/components/FloatingMapsButton";
import RootLayoutClient from "@/components/RootLayoutClient";

const outfit = Outfit({ subsets: ["latin"], display: 'swap' });

export const metadata = {
  title: siteData.head.title,
  description: siteData.head.meta.description,
  keywords: siteData.head.meta.keywords,
  authors: [{ name: siteData.head.meta.author }],
  openGraph: siteData.head.openGraph,
  icons: {
    icon: '/assets/Logo.jpg',
    shortcut: '/assets/Logo.jpg',
    apple: '/assets/Logo.jpg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${outfit.className} antialiased`}>
        <RootLayoutClient>
          {children}
          <FloatingMapsButton />
        </RootLayoutClient>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
