import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import { CartLink } from '@/components/shared/cart-link'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { Button } from '@/components/ui/button'
import { getCurrentProfile } from '@/lib/auth/session'
import { getServerDictionary } from '@/lib/i18n/server'

/**
 * Sticky site header. Async Server Component so it can read the current
 * session directly (works for logged-out visitors too — no redirect).
 */
export async function SiteHeader() {
  const session = await getCurrentProfile()
  const dict = getServerDictionary()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
            BrickCase
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/calculator"
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {dict.nav.calculator}
            </Link>
            <Link
              href="/gallery"
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {dict.nav.gallery}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <CartLink />
          <LanguageSwitcher />

          {!session && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{dict.nav.login}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/calculator">{dict.nav.getPrice}</Link>
              </Button>
            </>
          )}

          {session && (
            <>
              {session.profile.role === 'admin' && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/orders">{dict.nav.admin}</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account">{dict.nav.myOrders}</Link>
              </Button>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  {dict.nav.logOut}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
