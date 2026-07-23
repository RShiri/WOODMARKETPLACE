import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Custom Display Boxes for LEGO Collectors",
  description:
    "Enter your dimensions or a LEGO set number and get a fair, transparent price for a custom perspex display box instantly — order on the web or over WhatsApp.",
};

const features = [
  {
    title: "Fair, algorithmic pricing",
    description:
      "Price is calculated live from material cost, panel area, and a fixed minimal margin — no guesswork, no haggling. See the full breakdown before you order.",
  },
  {
    title: "Auto-fill from a LEGO set number",
    description:
      "Don't want to measure? Type in a set number like 10294 and we'll look up the built model's dimensions and pre-fill the calculator for you.",
  },
  {
    title: "Order over WhatsApp",
    description:
      "Message us your dimensions or a set number and get an instant price back, with a link straight to checkout — no app, no account required.",
  },
];

export default function MarketingPage() {
  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center sm:py-32">
          <span className="rounded-full border border-border bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            Custom perspex display boxes for LEGO collectors
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            A perfect-fit display box, priced fairly, in seconds
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
            BrickCase builds custom acrylic display boxes sized to your build. Enter your
            dimensions or a LEGO set number, see a transparent price instantly, and order
            online or straight from WhatsApp.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/calculator"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Build my box
            </Link>
            <Link
              href="/gallery"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-background px-8 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              See the gallery
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for LEGO collectors, priced like it
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No inflated &ldquo;collector tax.&rdquo; Just material cost plus a fair, minimal margin —
            calculated the same way whether you&apos;re on the site or messaging us on WhatsApp.
          </p>
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
            Have a LEGO set number handy?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Skip the tape measure — type in the set number and we&apos;ll pull the built model&apos;s
            dimensions for you.
          </p>
          <Link
            href="/calculator?tab=set"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Look up my set
          </Link>
        </div>
      </section>
    </main>
  );
}
