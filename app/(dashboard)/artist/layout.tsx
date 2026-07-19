import { requireArtistProfile } from '@/lib/auth/session'
import { ArtistNav } from '@/components/dashboard/artist-nav'

/**
 * Layout for all /artist/* dashboard routes.
 *
 * The root `middleware.ts` only checks that a request is authenticated; it
 * has no knowledge of the caller's role. This layout is what actually
 * enforces "is an artist" — `requireArtistProfile()` redirects unauthenticated
 * users to /login and non-artists to /shop, and gives every page under
 * /artist/* the caller's artist_profiles row without having to re-fetch it.
 */
export default async function ArtistDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { artistProfile } = await requireArtistProfile()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:flex-row md:px-6">
      <aside className="w-full shrink-0 md:w-56">
        <div className="mb-4 px-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dashboard
          </p>
          <p className="truncate text-lg font-semibold">{artistProfile.shop_name}</p>
        </div>
        <ArtistNav />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
