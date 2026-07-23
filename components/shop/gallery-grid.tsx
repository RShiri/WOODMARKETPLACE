import Link from 'next/link'
import { Package } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { BoxGalleryItem } from '@/types/database.types'

export function GalleryGrid({
  items,
  emptyLabel,
  unitLabel,
}: {
  items: BoxGalleryItem[]
  emptyLabel: string
  unitLabel: string
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const dims =
          item.length_mm && item.width_mm && item.height_mm
            ? `${item.length_mm / 10} × ${item.width_mm / 10} × ${item.height_mm / 10} ${unitLabel}`
            : null

        const href =
          item.length_mm && item.width_mm && item.height_mm
            ? `/calculator?l=${item.length_mm}&w=${item.width_mm}&h=${item.height_mm}`
            : '/calculator'

        return (
          <Link key={item.id} href={href} className="group">
            <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
              <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <CardContent className="flex flex-col gap-1 p-4">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                {dims && <p className="text-xs text-muted-foreground">{dims}</p>}
                {item.blurb && <p className="mt-1 text-sm text-muted-foreground">{item.blurb}</p>}
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
