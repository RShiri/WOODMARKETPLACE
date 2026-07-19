'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { placeOrder } from '@/app/checkout/actions'
import { useCart } from '@/components/shared/cart-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { shippingAddressSchema, type ShippingAddressInput } from '@/lib/validations/checkout'
import { formatPrice } from '@/lib/utils/format'

export function CheckoutForm() {
  const router = useRouter()
  const { items, subtotalCents, clear } = useCart()
  const [isPending, setIsPending] = useState(false)

  const groupedByArtist = useMemo(() => {
    const groups = new Map<string, typeof items>()
    for (const item of items) {
      const existing = groups.get(item.artistShopName)
      if (existing) {
        existing.push(item)
      } else {
        groups.set(item.artistShopName, [item])
      }
    }
    return Array.from(groups.entries())
  }, [items])

  const form = useForm<ShippingAddressInput>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      fullName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  })

  async function onSubmit(values: ShippingAddressInput) {
    setIsPending(true)
    try {
      const result = await placeOrder({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingAddress: values,
      })

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      clear()
      router.push('/checkout/confirmation')
    } finally {
      setIsPending(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address line 1</FormLabel>
                    <FormControl>
                      <Input autoComplete="address-line1" placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address line 2 (optional)</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="address-line2"
                        placeholder="Apt, suite, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input autoComplete="address-level2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input autoComplete="address-level1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal code</FormLabel>
                      <FormControl>
                        <Input autoComplete="postal-code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input autoComplete="country-name" placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Placing order…' : 'Place Order'}
              </Button>
              <p className="text-xs text-muted-foreground">
                This places an order request — the artist will confirm your order and follow up
                on payment and fulfillment details. No payment is collected now.
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {groupedByArtist.map(([artistShopName, lines]) => (
            <div key={artistShopName} className="space-y-3">
              <p className="text-sm font-medium text-foreground">{artistShopName}</p>
              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.productId} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {line.imageUrl ? (
                        <Image
                          src={line.imageUrl}
                          alt={line.title}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 items-start justify-between gap-2">
                      <div>
                        <p className="line-clamp-2 text-sm font-medium leading-snug">
                          {line.title}
                        </p>
                        <p className="text-xs text-muted-foreground">Qty {line.quantity}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium">
                        {formatPrice(line.priceCents * line.quantity, line.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          ))}

          <div className="flex items-center justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span>{formatPrice(subtotalCents, 'usd')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
