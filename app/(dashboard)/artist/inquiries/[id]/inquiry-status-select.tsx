'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateInquiryStatus } from '@/app/inquiries/actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { InquiryStatus } from '@/types/database.types'

const STATUS_OPTIONS: { value: InquiryStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_discussion', label: 'In Discussion' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

/**
 * Small client child so the surrounding inquiry detail page can stay a
 * Server Component. Calls the `updateInquiryStatus` server action and
 * refreshes the page on success so the summary card / badge picks up the
 * new status.
 */
export function InquiryStatusSelect({
  inquiryId,
  status,
}: {
  inquiryId: string
  status: InquiryStatus
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState<InquiryStatus>(status)

  function handleChange(next: string) {
    const nextStatus = next as InquiryStatus
    const previous = value
    setValue(nextStatus)

    startTransition(async () => {
      const result = await updateInquiryStatus(inquiryId, nextStatus)
      if ('error' in result) {
        setValue(previous)
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
