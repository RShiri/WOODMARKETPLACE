import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { InquiryStatus } from '@/types/database.types'

const STATUS_CONFIG: Record<InquiryStatus, { label: string; variant: BadgeProps['variant'] }> = {
  new: { label: 'New', variant: 'secondary' },
  in_discussion: { label: 'In Discussion', variant: 'default' },
  quoted: { label: 'Quoted', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'default' },
  declined: { label: 'Declined', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

/**
 * Maps an `InquiryStatus` to a labeled `Badge`. Shared by the artist and
 * (later) customer inquiry list/detail pages so status presentation stays
 * consistent across both sides of the marketplace.
 */
export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const config = STATUS_CONFIG[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}
