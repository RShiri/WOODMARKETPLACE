import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://woodmarketplace.com";
const siteName = "Woodmarketplace";
const siteDescription =
  "Woodmarketplace connects independent woodworking artists with buyers who want handcrafted, one-of-a-kind pieces. Browse curated catalogs, shop direct from artist storefronts, and commission custom work.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Woodmarketplace | Handcrafted Woodworking, Direct From Artists",
    template: "%s | Woodmarketplace",
  },
  description: siteDescription,
  keywords: [
    "woodworking",
    "handcrafted furniture",
    "custom woodwork",
    "artisan marketplace",
    "wood artists",
    "handmade wood decor",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: "Woodmarketplace | Handcrafted Woodworking, Direct From Artists",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Woodmarketplace | Handcrafted Woodworking, Direct From Artists",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1310" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
