'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, Package, UserRound } from 'lucide-react'

import { cn } from '@/lib/utils'

const navItems = [
  { href: '/artist/products', label: 'Products', icon: Package },
  { href: '/artist/inquiries', label: 'Inquiries', icon: Inbox },
  { href: '/artist/profile', label: 'Profile', icon: UserRound },
] as const

export function ArtistNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
