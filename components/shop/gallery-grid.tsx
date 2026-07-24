import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { BoxGalleryItem } from '@/types/database.types'

function galleryImageUrl(imagePath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl}/storage/v1/object/public/gallery-images/${imagePath}`
}

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

        const imageUrl = item.image_path ? galleryImageUrl(item.image_path) : null

        return (
          <Link key={item.id} href={href} className="group">
            <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
              <div className="relative flex aspect-[4/3] items-center justify-center bg-muted">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={item.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground/50" />
                )}
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
