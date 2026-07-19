'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { archiveProduct, unarchiveProduct } from '@/app/(dashboard)/artist/products/actions'
import type { ProductStatus } from '@/types/database.types'

export function ProductArchiveButton({
  productId,
  productTitle,
  status,
}: {
  productId: string
  productTitle: string
  status: ProductStatus
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (status === 'archived') {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Restore ${productTitle} to draft`}
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await unarchiveProduct(productId)
            if ('error' in result) {
              toast.error(result.error)
              return
            }
            toast.success('Product restored to draft.')
            router.refresh()
          })
        }}
      >
        <ArchiveRestore className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Archive ${productTitle}`}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await archiveProduct(productId)
          if ('error' in result) {
            toast.error(result.error)
            return
          }
          toast.success('Product archived.')
          router.refresh()
        })
      }}
    >
      <Archive className="size-4" />
    </Button>
  )
}
