import Image from 'next/image'
import Link from 'next/link'
import { Package, Pencil, Plus } from 'lucide-react'

import { requireArtistProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProductArchiveButton } from '@/components/dashboard/product-archive-button'
import { ProductDeleteButton } from '@/components/dashboard/product-delete-button'
import type { ProductStatus } from '@/types/database.types'

const STATUS_BADGE_VARIANT: Record<ProductStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

export default async function ArtistProductsPage() {
  const { userId } = await requireArtistProfile()
  const supabase = await createClient()

  const { data: products, error } = await supabase
    .from('products')
    .select(
      '*, product_images(storage_path, position), wood_type:wood_types(name), category:categories(name)'
    )
    .eq('artist_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Could not load products: ${error.message}`)
  }

  const rows = (products ?? []).map((product) => {
    const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)
    const firstImage = images[0]
    const thumbnailUrl = firstImage
      ? supabase.storage.from('product-images').getPublicUrl(firstImage.storage_path).data
          .publicUrl
      : null

    return {
      id: product.id,
      title: product.title,
      status: product.status,
      priceCents: product.price_cents,
      currency: product.currency,
      viewCount: product.view_count,
      woodTypeName: product.wood_type?.name ?? null,
      thumbnailUrl,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage the pieces in your shop — create, edit, publish, and archive.
          </p>
        </div>
        <Button asChild>
          <Link href="/artist/products/new">
            <Plus className="size-4" />
            New Product
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Package className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No products yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first piece to start selling in your shop.
            </p>
          </div>
          <Button asChild className="mt-2">
            <Link href="/artist/products/new">
              <Plus className="size-4" />
              New Product
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">Photo</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Wood</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="w-[96px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="relative size-14 overflow-hidden rounded-md bg-muted">
                      {row.thumbnailUrl ? (
                        <Image
                          src={row.thumbnailUrl}
                          alt={row.title}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="size-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate font-medium">
                    {row.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.woodTypeName ?? '—'}
                  </TableCell>
                  <TableCell>{formatPrice(row.priceCents, row.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.viewCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild aria-label={`Edit ${row.title}`}>
                        <Link href={`/artist/products/${row.id}/edit`}>
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <ProductArchiveButton
                        productId={row.id}
                        productTitle={row.title}
                        status={row.status}
                      />
                      <ProductDeleteButton productId={row.id} productTitle={row.title} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
