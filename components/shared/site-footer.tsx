import Link from 'next/link'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-foreground">Woodmarketplace</p>
          <p className="text-sm text-muted-foreground">
            Handcrafted woodworking, direct from independent artists.
          </p>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/shop"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Shop
          </Link>
          <Link
            href="/register"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Sign Up
          </Link>
          <Link
            href="/"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </nav>

        <p className="text-sm text-muted-foreground">
          &copy; {year} Woodmarketplace. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
