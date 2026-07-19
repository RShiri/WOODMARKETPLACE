'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { createInquiry } from '@/app/inquiries/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createInquirySchema, type CreateInquiryInput } from '@/lib/validations/inquiry'

interface RequestCustomOrderDialogProps {
  artistId: string
  artistName: string
  /** Omitted for a general shop inquiry (e.g. from the artist's storefront page). */
  productId?: string
  productTitle?: string
}

/**
 * Dialog trigger + form used to send a customer's custom order inquiry to an
 * artist. Mounted either on a product page (with `productId`/`productTitle`
 * set, tying the inquiry to that product) or on an artist's storefront page
 * (general inquiry, no product). `artistId`/`productId` come from props, not
 * from visible form fields — the form only collects description and budget.
 */
export function RequestCustomOrderDialog({
  artistId,
  artistName,
  productId,
  productTitle,
}: RequestCustomOrderDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateInquiryInput>({
    resolver: zodResolver(createInquirySchema),
    defaultValues: {
      artistId,
      productId,
      description: '',
      budgetMinDollars: undefined,
      budgetMaxDollars: undefined,
    },
  })

  async function onSubmit(values: CreateInquiryInput) {
    setIsSubmitting(true)
    try {
      const result = await createInquiry({ ...values, artistId, productId })
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Your request has been sent.')
      form.reset()
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Request Custom Order</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a custom order</DialogTitle>
          <DialogDescription>
            Send {artistName} a custom order request
            {productTitle ? ` about ${productTitle}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are you looking for?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Dimensions, wood preferences, timeline, inspiration…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budgetMinDollars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget min (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Optional"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budgetMaxDollars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget max (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Optional"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
