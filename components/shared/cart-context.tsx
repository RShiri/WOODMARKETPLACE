'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CART_STORAGE_KEY = 'brickcase_cart'

export interface CartItem {
  quoteId: string
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  addItem: (quoteId: string, quantity?: number) => void
  removeItem: (quoteId: string) => void
  setQuantity: (quoteId: string, quantity: number) => void
  clear: () => void
  itemCount: number
}

const CartContext = createContext<CartContextValue | null>(null)

function readCartFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CartItem =>
        typeof item?.quoteId === 'string' && Number.isInteger(item?.quantity) && item.quantity > 0
    )
  } catch {
    return []
  }
}

/**
 * Multi-item cart: a list of {quoteId, quantity} pairs backed by
 * localStorage. Prices are never stored here — /cart and /checkout always
 * re-fetch each quote's current price by id (GET /api/quote/:id), the same
 * trust boundary the single-item cart used.
 *
 * State starts empty on every render (server and initial client render
 * agree) and hydrates from localStorage in a useEffect after mount, so
 * there's no SSR/client markup mismatch.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
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

  const addItem = useCallback((quoteId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.quoteId === quoteId)
      if (existing) {
        return prev.map((item) =>
          item.quoteId === quoteId ? { ...item, quantity: item.quantity + quantity } : item
        )
      }
      return [...prev, { quoteId, quantity }]
    })
  }, [])

  const removeItem = useCallback((quoteId: string) => {
    setItems((prev) => prev.filter((item) => item.quoteId !== quoteId))
  }, [])

  const setQuantity = useCallback((quoteId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.quoteId !== quoteId)
      return prev.map((item) => (item.quoteId === quoteId ? { ...item, quantity } : item))
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  const value = useMemo(
    () => ({ items, addItem, removeItem, setQuantity, clear, itemCount }),
    [items, addItem, removeItem, setQuantity, clear, itemCount]
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
