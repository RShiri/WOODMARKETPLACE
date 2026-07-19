import { notFound } from 'next/navigation'

import { requireArtistProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/app/(dashboard)/artist/products/product-form'

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const { userId } = await requireArtistProfile()
  const supabase = await createClient()

  const [{ data: product }, { data: woodTypes }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', params.id)
      .eq('artist_id', userId)
      .single(),
    supabase.from('wood_types').select('id, name').order('name'),
    supabase.from('categories').select('id, name').order('name'),
  ])

  if (!product) {
    notFound()
  }

  const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Product</h1>
        <p className="text-sm text-muted-foreground">{product.title}</p>
      </div>
      <ProductForm
        mode="edit"
        artistId={userId}
        productId={product.id}
        defaultValues={{
          title: product.title,
          description: product.description,
          priceDollars: product.price_cents / 100,
          categoryId: product.category_id,
          woodTypeId: product.wood_type_id,
          isMadeToOrder: product.is_made_to_order,
          stockQuantity: product.stock_quantity,
          status: product.status === 'published' ? 'published' : 'draft',
        }}
        images={images}
        woodTypes={woodTypes ?? []}
        categories={categories ?? []}
      />
    </div>
  )
}
