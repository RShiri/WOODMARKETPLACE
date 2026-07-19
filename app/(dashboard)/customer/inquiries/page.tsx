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
import { requireCustomerProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/format'
import type { InquiryStatus } from '@/types/database.types'

type InquiryRow = {
  id: string
  status: InquiryStatus
  created_at: string
  artist: { shop_name: string; slug: string } | null
  product: { title: string } | null
}

export default async function CustomerInquiriesPage() {
  const { userId } = await requireCustomerProfile()
  const supabase = await createClient()

  const { data: inquiries } = await supabase
    .from('custom_order_inquiries')
    .select(
      'id, status, created_at, artist:artist_profiles(shop_name, slug), product:products(title)'
    )
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .returns<InquiryRow[]>()

  const rows = inquiries ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Inquiries</h1>
        <p className="text-sm text-muted-foreground">
          Custom order requests you&apos;ve sent to artists, general or tied to a specific
          product.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>You haven&apos;t sent any custom order requests yet.</p>
          <Link href="/shop" className="mt-2 inline-block font-medium text-primary hover:underline">
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="text-right">&nbsp;</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-medium">
                    {inquiry.artist ? (
                      <Link href={`/artists/${inquiry.artist.slug}`} className="hover:underline">
                        {inquiry.artist.shop_name}
                      </Link>
                    ) : (
                      'Unknown shop'
                    )}
                  </TableCell>
                  <TableCell>{inquiry.product?.title ?? 'General inquiry'}</TableCell>
                  <TableCell>
                    <InquiryStatusBadge status={inquiry.status} />
                  </TableCell>
                  <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/customer/inquiries/${inquiry.id}`}
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
