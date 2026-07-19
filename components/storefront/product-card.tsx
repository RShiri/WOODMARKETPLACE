import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils/format'

export interface ProductCardData {
  slug: string
  title: string
  priceCents: number
  currency: string
  isMadeToOrder: boolean
  woodTypeName: string | null
  primaryImageUrl: string | null
  artist: {
    shopName: string
    slug: string
  }
}

/** Public-facing product summary card used on the shop feed and artist storefront pages. */
export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square w-full bg-muted">
          {product.primaryImageUrl ? (
            <Image
              src={product.primaryImageUrl}
              alt={product.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>
      </Link>
      <CardContent className="space-y-2 p-4">
        {product.woodTypeName && (
          <Badge variant="secondary" className="font-normal">
            {product.woodTypeName}
          </Badge>
        )}
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="line-clamp-2 font-medium leading-snug hover:underline">{product.title}</h3>
        </Link>
        <Link
          href={`/artists/${product.artist.slug}`}
          className="block text-sm text-muted-foreground hover:underline"
        >
          {product.artist.shopName}
        </Link>
      </CardContent>
      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <span className="font-semibold">{formatPrice(product.priceCents, product.currency)}</span>
        {product.isMadeToOrder && (
          <span className="text-xs text-muted-foreground">Made to order</span>
        )}
      </CardFooter>
    </Card>
  )
}
