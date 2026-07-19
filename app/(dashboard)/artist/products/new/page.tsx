import { requireArtistProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/app/(dashboard)/artist/products/product-form'

export default async function NewProductPage() {
  const { userId } = await requireArtistProfile()
  const supabase = await createClient()

  const [{ data: woodTypes }, { data: categories }] = await Promise.all([
    supabase.from('wood_types').select('id, name').order('name'),
    supabase.from('categories').select('id, name').order('name'),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Product</h1>
        <p className="text-sm text-muted-foreground">Add a new piece to your shop.</p>
      </div>
      <ProductForm
        mode="create"
        artistId={userId}
        woodTypes={woodTypes ?? []}
        categories={categories ?? []}
      />
    </div>
  )
}
