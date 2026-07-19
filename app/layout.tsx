import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import { CartProvider } from "@/components/shared/cart-context";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster richColors closeButton position="top-right" />
        </CartProvider>
      </body>
    </html>
  );
}
