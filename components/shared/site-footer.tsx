import Link from 'next/link'

import { getServerDictionary } from '@/lib/i18n/server'
import { tf } from '@/lib/i18n/format'

export function SiteFooter() {
  const dict = getServerDictionary()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-foreground">BrickCase</p>
          <p className="text-sm text-muted-foreground">{dict.footer.tagline}</p>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/calculator"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            {dict.footer.calculator}
          </Link>
          <Link
            href="/gallery"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            {dict.footer.gallery}
          </Link>
          <Link
            href="/"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            {dict.footer.home}
          </Link>
        </nav>

        <p className="text-sm text-muted-foreground">{tf(dict.footer.rights, { year })}</p>
      </div>
    </footer>
  )
}
