'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CART_STORAGE_KEY = 'woodmarketplace_cart'

export interface CartLineItem {
  productId: string
  slug: string
  title: string
  priceCents: number
  currency: string
  imageUrl: string | null
  artistId: string
  artistShopName: string
  quantity: number
}

export type CartItemInput = Omit<CartLineItem, 'quantity'>

interface CartContextValue {
  items: CartLineItem[]
  addItem: (item: CartItemInput, quantity?: number) => void
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clear: () => void
  itemCount: number
  subtotalCents: number
}

const CartContext = createContext<CartContextValue | null>(null)

function readCartFromStorage(): CartLineItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

/**
 * Client-only cart state backed by localStorage. State starts empty on every
 * render (server and initial client render agree) and is hydrated from
 * localStorage inside a useEffect after mount, so there's no SSR/client
 * markup mismatch.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setItems(readCartFromStorage())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage can fail (private browsing, quota, etc). Cart state simply
      // won't persist across reloads in that case — not fatal.
    }
  }, [items, hydrated])

  const addItem = useCallback((item: CartItemInput, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.productId === item.productId)
      if (existing) {
        return prev.map((line) =>
          line.productId === item.productId
            ? { ...line, quantity: line.quantity + quantity }
            : line
        )
      }
      return [...prev, { ...item, quantity }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((line) => line.productId !== productId))
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((line) => line.productId !== productId)
      }
      return prev.map((line) => (line.productId === productId ? { ...line, quantity } : line))
    })
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  const itemCount = useMemo(() => items.reduce((sum, line) => sum + line.quantity, 0), [items])
  const subtotalCents = useMemo(
    () => items.reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
    [items]
  )

  const value = useMemo(
    () => ({ items, addItem, removeItem, setQuantity, clear, itemCount, subtotalCents }),
    [items, addItem, removeItem, setQuantity, clear, itemCount, subtotalCents]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
