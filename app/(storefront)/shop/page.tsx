import type { Metadata } from 'next'

import { ProductCard, type ProductCardData } from '@/components/storefront/product-card'
import { ShopFilters } from '@/components/storefront/shop-filters'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Browse handcrafted woodworking from independent artists. Filter by wood type, category, and price to find one-of-a-kind furniture, decor, and fine woodwork.',
}

const RESULTS_LIMIT = 24

interface ShopPageProps {
  searchParams: {
    woodType?: string
    category?: string
    minPrice?: string
    maxPrice?: string
    sort?: string
  }
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const supabase = await createClient()

  const [{ data: woodTypes }, { data: categories }] = await Promise.all([
    supabase.from('wood_types').select('id, name, slug').order('name'),
    supabase.from('categories').select('id, name, slug').order('name'),
  ])

  // The filter params are slugs (for clean, shareable URLs); Postgrest can't
  // filter on embedded-relation columns, so resolve slug -> id against the
  // lookup lists we already fetched, then filter the main query on the FK id.
  const woodTypeId = searchParams.woodType
    ? woodTypes?.find((woodType) => woodType.slug === searchParams.woodType)?.id
    : undefined
  const categoryId = searchParams.category
    ? categories?.find((category) => category.slug === searchParams.category)?.id
    : undefined

  let query = supabase
    .from('products')
    .select(
      '*, artist:artist_profiles(shop_name, slug), wood_type:wood_types(name, slug), category:categories(name, slug), product_images(storage_path, position)'
    )
    .eq('status', 'published')

  if (woodTypeId) {
    query = query.eq('wood_type_id', woodTypeId)
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const minPriceCents = parsePriceToCents(searchParams.minPrice)
  if (minPriceCents !== undefined) {
    query = query.gte('price_cents', minPriceCents)
  }
  const maxPriceCents = parsePriceToCents(searchParams.maxPrice)
  if (maxPriceCents !== undefined) {
    query = query.lte('price_cents', maxPriceCents)
  }

  switch (searchParams.sort) {
    case 'price_asc':
      query = query.order('price_cents', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price_cents', { ascending: false })
      break
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  const { data: products } = await query.limit(RESULTS_LIMIT)

  const products_ = products ?? []
  const productCards: ProductCardData[] = products_.map((product) => {
    const images = (product.product_images ?? []).slice().sort((a, b) => a.position - b.position)
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
        shopName: product.artist?.shop_name ?? '',
        slug: product.artist?.slug ?? '',
      },
    }
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Shop</h1>
        <p className="mt-2 text-muted-foreground">
          Handcrafted furniture, decor, and fine woodwork from independent artists.
        </p>
      </div>

      <div className="mb-8">
        <ShopFilters
          woodTypes={(woodTypes ?? []).map(({ name, slug }) => ({ name, slug }))}
          categories={(categories ?? []).map(({ name, slug }) => ({ name, slug }))}
        />
      </div>

      {productCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-center">
          <p className="text-lg font-medium text-foreground">No products match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting or clearing your filters to see more results.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productCards.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
          {productCards.length === RESULTS_LIMIT && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Showing the first {RESULTS_LIMIT} results. Narrow your filters to find more specific
              pieces.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function parsePriceToCents(value: string | undefined): number | undefined {
  if (!value) return undefined
  const dollars = Number.parseFloat(value)
  if (Number.isNaN(dollars) || dollars < 0) return undefined
  return Math.round(dollars * 100)
}
