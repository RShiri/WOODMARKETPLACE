import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils/format'
import { AddToCartButton } from '@/components/storefront/add-to-cart-button'
import { RequestCustomOrderDialog } from '@/components/shared/request-custom-order-dialog'
import { Badge } from '@/components/ui/badge'
import {
  ProductGallery,
  type ProductGalleryImage,
} from '@/components/storefront/product-gallery'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const PRODUCT_DETAIL_SELECT =
  '*, artist:artist_profiles(shop_name, slug), wood_type:wood_types(name), category:categories(name), product_images(storage_path, alt_text, position)'

function resolveImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string
): string {
  return supabase.storage.from('product-images').getPublicUrl(storagePath).data.publicUrl
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(
      'title, meta_title, meta_description, description, product_images(storage_path, position)'
    )
    .eq('slug', params.slug)
    .eq('status', 'published')
    .limit(1)
    .maybeSingle()

  if (!product) {
    return { title: 'Product Not Found' }
  }

  const sortedImages = [...(product.product_images ?? [])].sort(
    (a, b) => a.position - b.position
  )
  const imageUrl = sortedImages[0]
    ? resolveImageUrl(supabase, sortedImages[0].storage_path)
    : undefined

  const title = product.meta_title || product.title
  const description =
    product.meta_description ||
    (product.description?.slice(0, 155) ?? `Handcrafted ${product.title} from Woodmarketplace.`)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(PRODUCT_DETAIL_SELECT)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .limit(1)
    .maybeSingle()

  if (!product) {
    notFound()
  }

  const sortedImages = [...(product.product_images ?? [])].sort(
    (a, b) => a.position - b.position
  )
  const galleryImages: ProductGalleryImage[] = sortedImages.map((image) => ({
    url: resolveImageUrl(supabase, image.storage_path),
    altText: image.alt_text,
  }))
  const primaryImageUrl = galleryImages[0]?.url

  // Best-effort view tracking. Never let a failure here break the page.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const headerList = headers()

    const { error: viewError } = await supabase.from('product_views').insert({
      product_id: product.id,
      artist_id: product.artist_id,
      viewer_id: user?.id ?? null,
      session_id: null,
      referrer: headerList.get('referer') ?? null,
      user_agent: headerList.get('user-agent') ?? null,
    })

    if (viewError) {
      console.error('Failed to record product view:', viewError)
    }
  } catch (error) {
    console.error('Failed to record product view:', error)
  }

  const productUrl = `${siteUrl}/products/${product.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    ...(primaryImageUrl ? { image: [primaryImageUrl] } : {}),
    offers: {
      '@type': 'Offer',
      price: (product.price_cents / 100).toFixed(2),
      priceCurrency: product.currency.toUpperCase(),
      availability: product.is_made_to_order
        ? 'https://schema.org/MadeToOrder'
        : product.stock_quantity && product.stock_quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: productUrl,
    },
    brand: {
      '@type': 'Brand',
      name: product.artist.shop_name,
    },
  }
  const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, '\\u003c')

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd }}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={galleryImages} productTitle={product.title} />

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {product.title}
            </h1>
            <Link
              href={`/artists/${product.artist.slug}`}
              className="mt-1 inline-block text-sm text-muted-foreground hover:underline"
            >
              {product.artist.shop_name}
            </Link>
          </div>

          {(product.wood_type || product.category) && (
            <div className="flex flex-wrap gap-2">
              {product.wood_type && (
                <Badge variant="secondary">{product.wood_type.name}</Badge>
              )}
              {product.category && (
                <Badge variant="outline">{product.category.name}</Badge>
              )}
            </div>
          )}

          <p className="text-2xl font-semibold text-foreground">
            {formatPrice(product.price_cents, product.currency)}
          </p>

          <div className="flex flex-wrap gap-3">
            <AddToCartButton
              product={{
                id: product.id,
                slug: product.slug,
                title: product.title,
                priceCents: product.price_cents,
                currency: product.currency,
                imageUrl: primaryImageUrl ?? null,
                artistId: product.artist_id,
                artistShopName: product.artist.shop_name,
              }}
            />
            <RequestCustomOrderDialog
              artistId={product.artist_id}
              artistName={product.artist.shop_name}
              productId={product.id}
              productTitle={product.title}
            />
          </div>

          {product.is_made_to_order ? (
            <p className="text-sm text-muted-foreground">Made to order</p>
          ) : (
            typeof product.stock_quantity === 'number' && (
              <p className="text-sm text-muted-foreground">
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} in stock`
                  : 'Out of stock'}
              </p>
            )
          )}

          {product.description && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Description</h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
