/** @type {import('next').NextConfig} */

// Derive the Supabase Storage hostname from the configured project URL (if
// set) so images served from Supabase Storage can be optimized by
// next/image without hardcoding a project-specific hostname.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined

const nextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

export default nextConfig;
