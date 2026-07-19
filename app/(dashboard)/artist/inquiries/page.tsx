import Link from 'next/link'

import { InquiryStatusBadge } from '@/components/shared/inquiry-status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireArtistProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/format'
import type { InquiryStatus } from '@/types/database.types'

type InquiryRow = {
  id: string
  status: InquiryStatus
  created_at: string
  customer: { full_name: string | null } | null
  product: { title: string } | null
}

export default async function ArtistInquiriesPage() {
  const { userId } = await requireArtistProfile()
  const supabase = await createClient()

  const { data: inquiries } = await supabase
    .from('custom_order_inquiries')
    .select('id, status, created_at, customer:profiles(full_name), product:products(title)')
    .eq('artist_id', userId)
    .order('created_at', { ascending: false })
    .returns<InquiryRow[]>()

  const rows = inquiries ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inquiries</h1>
        <p className="text-sm text-muted-foreground">
          Custom order requests from customers, general or tied to a specific product.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No inquiries yet. When a customer sends a custom order request, it will show up here.
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">&nbsp;</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-medium">
                    {inquiry.customer?.full_name ?? 'Unknown customer'}
                  </TableCell>
                  <TableCell>{inquiry.product?.title ?? 'General inquiry'}</TableCell>
                  <TableCell>
                    <InquiryStatusBadge status={inquiry.status} />
                  </TableCell>
                  <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/artist/inquiries/${inquiry.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
