import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import { CartSheet } from '@/components/shared/cart-sheet'
import { Button } from '@/components/ui/button'
import { getCurrentProfile } from '@/lib/auth/session'

/**
 * Sticky site header. Async Server Component so it can read the current
 * session directly (works for logged-out visitors too — no redirect).
 */
export async function SiteHeader() {
  const session = await getCurrentProfile()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
            Woodmarketplace
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/shop"
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              Browse
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <CartSheet />

          {!session && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Sign Up</Link>
              </Button>
            </>
          )}

          {session && session.profile.role === 'artist' && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/artist/products">Dashboard</Link>
              </Button>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Log Out
                </Button>
              </form>
            </>
          )}

          {session && session.profile.role === 'customer' && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/customer/inquiries">My Inquiries</Link>
              </Button>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Log Out
                </Button>
              </form>
            </>
          )}

          {session && session.profile.role === 'admin' && (
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                Log Out
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  )
}
