import type { Metadata, Viewport } from "next";
import { Heebo, Inter } from "next/font/google";
import { Toaster } from "sonner";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { getServerLocale } from "@/lib/i18n/server";
import { isRtl } from "@/lib/i18n/types";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteName = "BrickCase";
const siteDescription =
  "Custom perspex (acrylic) display boxes for LEGO collectors. Enter your dimensions or a LEGO set number and get a fair, transparent price instantly — order on the web or over WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BrickCase | Custom Display Boxes for LEGO Collectors",
    template: "%s | BrickCase",
  },
  description: siteDescription,
  keywords: [
    "lego display case",
    "acrylic display box",
    "perspex display box",
    "custom lego case",
    "lego collector display",
    "display box calculator",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: "BrickCase | Custom Display Boxes for LEGO Collectors",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "BrickCase | Custom Display Boxes for LEGO Collectors",
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
  const locale = getServerLocale();

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${inter.variable} ${heebo.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        <LocaleProvider initialLocale={locale}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster richColors closeButton position="top-right" />
        </LocaleProvider>
      </body>
    </html>
  );
}
