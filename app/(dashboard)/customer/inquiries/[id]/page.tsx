import { notFound } from 'next/navigation'

import { InquiryStatusBadge } from '@/components/shared/inquiry-status-badge'
import { InquiryThread } from '@/components/shared/inquiry-thread'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireCustomerProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils/format'
import type { CustomOrderInquiry, InquiryMessage, InquiryStatus } from '@/types/database.types'

import { CancelInquiryButton } from './cancel-inquiry-button'

type InquiryWithRelations = CustomOrderInquiry & {
  artist: { shop_name: string } | null
  product: { title: string } | null
}

type MessageWithSender = InquiryMessage & { sender: { full_name: string | null } }

/** Statuses past which cancelling no longer makes sense — the inquiry is already at a resolved/terminal state. */
const TERMINAL_STATUSES: InquiryStatus[] = ['cancelled', 'completed', 'declined']

export default async function CustomerInquiryDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { userId } = await requireCustomerProfile()
  const supabase = await createClient()

  const { data: inquiry } = await supabase
    .from('custom_order_inquiries')
    .select('*, artist:artist_profiles(shop_name), product:products(title)')
    .eq('id', params.id)
    .eq('customer_id', userId)
    .single<InquiryWithRelations>()

  if (!inquiry) {
    notFound()
  }

  const { data: messages } = await supabase
    .from('inquiry_messages')
    .select('*, sender:profiles(full_name)')
    .eq('inquiry_id', inquiry.id)
    .order('created_at', { ascending: true })
    .returns<MessageWithSender[]>()

  const artistShopName = inquiry.artist?.shop_name ?? 'this artist'

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{inquiry.product?.title ?? 'General inquiry'}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              To {artistShopName} · Sent {formatDate(inquiry.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <InquiryStatusBadge status={inquiry.status} />
            {!TERMINAL_STATUSES.includes(inquiry.status) && (
              <CancelInquiryButton inquiryId={inquiry.id} />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(inquiry.budget_min_cents !== null || inquiry.budget_max_cents !== null) && (
            <p className="text-sm">
              <span className="font-medium">Budget: </span>
              {inquiry.budget_min_cents !== null && inquiry.budget_max_cents !== null
                ? `${formatPrice(inquiry.budget_min_cents)} – ${formatPrice(inquiry.budget_max_cents)}`
                : formatPrice(inquiry.budget_min_cents ?? inquiry.budget_max_cents ?? 0)}
            </p>
          )}
          <div>
            <p className="mb-1 text-sm font-medium">Description</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {inquiry.description}
            </p>
          </div>
        </CardContent>
      </Card>

      <InquiryThread
        inquiryId={inquiry.id}
        currentUserId={userId}
        messages={messages ?? []}
        otherPartyName={artistShopName}
      />
    </div>
  )
}
