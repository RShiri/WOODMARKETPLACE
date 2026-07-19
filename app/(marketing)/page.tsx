import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Handcrafted Woodworking, Direct From Artists",
  description:
    "Discover handcrafted woodworking from independent artists. Browse a curated catalog, shop direct from artist storefronts, and commission one-of-a-kind custom pieces.",
};

const features = [
  {
    title: "Handcrafted catalog",
    description:
      "Explore a curated collection of handmade furniture, decor, and fine woodwork, filterable by wood type, category, and price.",
  },
  {
    title: "Direct artist storefronts",
    description:
      "Every piece is made by a real, verified woodworking artist. Visit their storefront to see their full body of work and story.",
  },
  {
    title: "Custom order inquiries",
    description:
      "Have something specific in mind? Send a secure custom order inquiry directly to an artist and work out the details together.",
  },
];

export default function MarketingPage() {
  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center sm:py-32">
          <span className="rounded-full border border-border bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            A marketplace built for woodworking artists
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Handcrafted woodworking, connected directly to the people who
            love it
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
            Woodmarketplace brings independent woodworking artists and buyers
            together — browse a curated catalog, shop directly from artist
            storefronts, and commission custom pieces built to order.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/shop"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Shop the catalog
            </Link>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-background px-8 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Become an artist
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to buy and sell handcrafted wood
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From discovery to custom commissions, Woodmarketplace is built
            around the way woodworking artists and their customers actually
            work together.
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
    </main>
  );
}
