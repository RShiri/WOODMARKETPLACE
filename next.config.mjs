/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // The Supabase Storage host (e.g. <project-ref>.supabase.co) will be added
    // here once the project URL is known, so product/artist images served from
    // Supabase Storage can be optimized by next/image.
    remotePatterns: [],
  },
};

export default nextConfig;
