'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateInquiryStatus } from '@/app/inquiries/actions'
import { Button } from '@/components/ui/button'

/**
 * Small client child so the surrounding inquiry detail page can stay a
 * Server Component. Customers don't get a full status-change control like
 * artists do — only the ability to cancel their own request. Calls the
 * shared `updateInquiryStatus` server action and refreshes the page on
 * success so the badge picks up the new status.
 */
export function CancelInquiryButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const result = await updateInquiryStatus(inquiryId, 'cancelled')
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Request cancelled.')
      router.refresh()
    })
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleCancel}>
      {isPending ? 'Cancelling…' : 'Cancel Request'}
    </Button>
  )
}
