/** @type {import('next').NextConfig} */

// Derive the Supabase Storage hostname from the configured project URL (if
// set) so images served from Supabase Storage can be optimized by
// next/image without hardcoding a project-specific hostname. This value is
// hand-entered in a dashboard, so it may be missing its scheme or otherwise
// malformed — never let it crash the whole build, just skip image
// optimization for that host.
function resolveSupabaseHostname() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return undefined
  try {
    return new URL(raw).hostname
  } catch {
    try {
      return new URL(`https://${raw}`).hostname
    } catch {
      return undefined
    }
  }
}

const supabaseHostname = resolveSupabaseHostname()

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
