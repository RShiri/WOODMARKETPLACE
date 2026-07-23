import Link from 'next/link'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-foreground">BrickCase</p>
          <p className="text-sm text-muted-foreground">
            Custom perspex display boxes for LEGO collectors, priced fairly by the millimeter.
          </p>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/calculator"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Calculator
          </Link>
          <Link
            href="/gallery"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Gallery
          </Link>
          <Link
            href="/"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </nav>

        <p className="text-sm text-muted-foreground">
          &copy; {year} BrickCase. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
