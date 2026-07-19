import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function getProductEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("status", "published");

    if (error || !data) {
      return [];
    }

    return data.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updated_at,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}

async function getArtistEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("artist_profiles")
      .select("slug, updated_at");

    if (error || !data) {
      return [];
    }

    return data.map((artist) => ({
      url: `${baseUrl}/artists/${artist.slug}`,
      lastModified: artist.updated_at,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const [productEntries, artistEntries] = await Promise.all([
    getProductEntries(),
    getArtistEntries(),
  ]);

  return [...staticEntries, ...productEntries, ...artistEntries];
}
