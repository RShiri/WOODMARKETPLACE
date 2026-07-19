import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import {
  ProductCard,
  type ProductCardData,
} from '@/components/storefront/product-card'
import { RequestCustomOrderDialog } from '@/components/shared/request-custom-order-dialog'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

interface ArtistPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({
  params,
}: ArtistPageProps): Promise<Metadata> {
  const supabase = await createClient()

  const { data: artist } = await supabase
    .from('artist_profiles')
    .select('shop_name, bio, banner_url')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!artist) {
    return { title: 'Artist Not Found' }
  }

  const description =
    artist.bio?.slice(0, 155) ??
    `Handcrafted woodworking from ${artist.shop_name} on Woodmarketplace.`

  return {
    title: artist.shop_name,
    description,
    openGraph: {
      title: artist.shop_name,
      description,
      images: artist.banner_url ? [artist.banner_url] : [],
    },
  }
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const supabase = await createClient()

  const { data: artist } = await supabase
    .from('artist_profiles')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!artist) {
    notFound()
  }

  const { data: products } = await supabase
    .from('products')
    .select('*, wood_type:wood_types(name), product_images(storage_path, position)')
    .eq('artist_id', artist.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  const productCards: ProductCardData[] = (products ?? []).map((product) => {
    const images = (product.product_images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
    const primaryImagePath = images[0]?.storage_path ?? null
    const primaryImageUrl = primaryImagePath
      ? supabase.storage.from('product-images').getPublicUrl(primaryImagePath).data.publicUrl
      : null

    return {
      slug: product.slug,
      title: product.title,
      priceCents: product.price_cents,
      currency: product.currency,
      isMadeToOrder: product.is_made_to_order,
      woodTypeName: product.wood_type?.name ?? null,
      primaryImageUrl,
      artist: {
        shopName: artist.shop_name,
        slug: artist.slug,
      },
    }
  })

  return (
    <div>
      <div className="relative aspect-[3/1] w-full bg-muted sm:aspect-[4/1]">
        {artist.banner_url ? (
          <Image
            src={artist.banner_url}
            alt={`${artist.shop_name} banner`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{artist.shop_name}</h1>
            {artist.is_verified && <Badge>Verified</Badge>}
          </div>
          {artist.location && (
            <p className="text-sm text-muted-foreground">{artist.location}</p>
          )}
          {artist.bio && <p className="max-w-2xl text-base leading-relaxed">{artist.bio}</p>}

          <RequestCustomOrderDialog artistId={artist.id} artistName={artist.shop_name} />
        </header>

        <section className="mt-10">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">Products</h2>

          {productCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productCards.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This shop hasn&apos;t published any products yet.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
