import type { Metadata } from "next";
import Link from "next/link";

import { getServerDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Custom Display Boxes for LEGO Collectors",
  description:
    "Enter your dimensions or a LEGO set number and get a fair, transparent price for a custom perspex display box instantly — order on the web or over WhatsApp.",
};

export default function MarketingPage() {
  const dict = getServerDictionary();

  const features = [
    { title: dict.landing.feature1Title, description: dict.landing.feature1Desc },
    { title: dict.landing.feature2Title, description: dict.landing.feature2Desc },
    { title: dict.landing.feature3Title, description: dict.landing.feature3Desc },
  ];

  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center sm:py-32">
          <span className="rounded-full border border-border bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            {dict.landing.badge}
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            {dict.landing.heroTitle}
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
            {dict.landing.heroSubtitle}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/calculator"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {dict.landing.ctaBuild}
            </Link>
            <Link
              href="/gallery"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-background px-8 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {dict.landing.ctaGallery}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {dict.landing.featuresTitle}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{dict.landing.featuresSubtitle}</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-10 sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col items-start gap-3">
              <h3 className="text-xl font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {dict.landing.setCtaTitle}
          </h2>
          <p className="max-w-xl text-muted-foreground">{dict.landing.setCtaSubtitle}</p>
          <Link
            href="/calculator?tab=set"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            {dict.landing.setCtaButton}
          </Link>
        </div>
      </section>
    </main>
  );
}
