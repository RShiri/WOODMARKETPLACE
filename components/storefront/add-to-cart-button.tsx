'use client'

import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

import { useCart, type CartItemInput } from '@/components/shared/cart-context'
import { Button } from '@/components/ui/button'

export interface AddToCartProduct {
  id: string
  slug: string
  title: string
  priceCents: number
  currency: string
  imageUrl: string | null
  artistId: string
  artistShopName: string
}

export function AddToCartButton({ product }: { product: AddToCartProduct }) {
  const { addItem } = useCart()

  function handleAddToCart() {
    const item: CartItemInput = {
      productId: product.id,
      slug: product.slug,
      title: product.title,
      priceCents: product.priceCents,
      currency: product.currency,
      imageUrl: product.imageUrl,
      artistId: product.artistId,
      artistShopName: product.artistShopName,
    }
    addItem(item, 1)
    toast.success('Added to cart')
  }

  return (
    <Button type="button" onClick={handleAddToCart}>
      <ShoppingCart className="h-4 w-4" />
      Add to Cart
    </Button>
  )
}
