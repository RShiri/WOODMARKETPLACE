'use server'

import { requireArtistProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/format'
import { productSchema, type ProductFormInput } from '@/lib/validations/product'

type MutationResult = { error: string } | { success: true; id: string }
type DeleteResult = { error: string } | { success: true }

/**
 * Converts a validated ProductFormInput into the row-shape accepted by the
 * `products` table's insert/update. Shared by createProduct and
 * updateProduct so the two never drift on how price/stock/nullable fields
 * are derived from the form values.
 */
function toRowPayload(data: ProductFormInput) {
  return {
    category_id: data.categoryId ? data.categoryId : null,
    wood_type_id: data.woodTypeId ? data.woodTypeId : null,
    title: data.title,
    description: data.description ? data.description : null,
    price_cents: Math.round(data.priceDollars * 100),
    is_made_to_order: data.isMadeToOrder,
    stock_quantity: data.isMadeToOrder ? null : data.stockQuantity ?? 0,
    status: data.status,
  }
}

/**
 * Creates a new product. `input.id` must be a client-generated UUID (see
 * product-form.tsx) — it's used both as the `products.id` primary key and
 * as the storage-path prefix for any images uploaded during creation, which
 * avoids a chicken-and-egg problem between the row existing and the images
 * being uploaded under it.
 */
export async function createProduct(
  input: ProductFormInput & { id: string }
): Promise<MutationResult> {
  const { userId } = await requireArtistProfile()

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  if (!input.id) {
    return { error: 'Missing product id.' }
  }

  const data = parsed.data
  const slug = slugify(data.title, input.id)

  const supabase = await createClient()
  const { error } = await supabase.from('products').insert({
    id: input.id,
    artist_id: userId,
    slug,
    published_at: data.status === 'published' ? new Date().toISOString() : null,
    ...toRowPayload(data),
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, id: input.id }
}

/**
 * Updates an existing product. Scoped to `id = id AND artist_id = userId`
 * as defense in depth alongside the products_update_own_if_artist RLS
 * policy — a client can never overwrite another artist's product even if it
 * guesses a valid product id.
 */
export async function updateProduct(
  id: string,
  input: ProductFormInput
): Promise<MutationResult> {
  const { userId } = await requireArtistProfile()

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const data = parsed.data
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select('status, published_at')
    .eq('id', id)
    .eq('artist_id', userId)
    .single()

  if (fetchError || !existing) {
    return { error: 'Product not found.' }
  }

  // Recompute published_at only when the status is actually changing
  // to/from 'published' — flipping between draft and published shouldn't
  // reset the original publish timestamp on every unrelated edit.
  let publishedAt = existing.published_at
  if (data.status === 'published' && existing.status !== 'published') {
    publishedAt = new Date().toISOString()
  } else if (data.status !== 'published') {
    publishedAt = null
  }

  const { error } = await supabase
    .from('products')
    .update({
      published_at: publishedAt,
      ...toRowPayload(data),
    })
    .eq('id', id)
    .eq('artist_id', userId)

  if (error) {
    return { error: error.message }
  }

  return { success: true, id }
}

/**
 * Deletes a product: removes its Storage objects first, then the row
 * (product_images rows cascade via the DB FK). Ownership is verified up
 * front so a crafted id for another artist's product is rejected before any
 * storage mutation is attempted.
 */
export async function deleteProduct(id: string): Promise<DeleteResult> {
  const { userId } = await requireArtistProfile()

  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', id)
    .eq('artist_id', userId)
    .single()

  if (!product) {
    return { error: 'Product not found.' }
  }

  const { data: images } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', id)

  if (images && images.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('product-images')
      .remove(images.map((image) => image.storage_path))

    if (storageError) {
      return { error: storageError.message }
    }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('artist_id', userId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/** Sets a product's status to 'archived'. Scoped to the owning artist. */
export async function archiveProduct(id: string): Promise<DeleteResult> {
  const { userId } = await requireArtistProfile()

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('artist_id', userId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/** Sets a product's status back to 'draft'. Scoped to the owning artist. */
export async function unarchiveProduct(id: string): Promise<DeleteResult> {
  const { userId } = await requireArtistProfile()

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ status: 'draft' })
    .eq('id', id)
    .eq('artist_id', userId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Records an image that was already uploaded directly to Storage from the
 * browser (see product-form.tsx). RLS on product_images restricts this
 * insert to the artist who owns the parent product, so no explicit
 * artist_id check is needed here beyond being signed in as an artist.
 */
export async function addProductImage(
  productId: string,
  storagePath: string,
  altText: string | null,
  position: number
): Promise<MutationResult> {
  await requireArtistProfile()

  if (!productId || !storagePath) {
    return { error: 'Missing product id or storage path.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: storagePath,
      alt_text: altText,
      position,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Could not save image.' }
  }

  return { success: true, id: data.id }
}

/** Deletes a product image's Storage object and its product_images row. */
export async function removeProductImage(
  imageId: string,
  storagePath: string
): Promise<DeleteResult> {
  await requireArtistProfile()

  const supabase = await createClient()

  const { error: storageError } = await supabase.storage
    .from('product-images')
    .remove([storagePath])

  if (storageError) {
    return { error: storageError.message }
  }

  const { error } = await supabase.from('product_images').delete().eq('id', imageId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
