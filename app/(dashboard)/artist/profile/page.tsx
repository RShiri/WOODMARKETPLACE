import type { Metadata } from 'next'
import { BadgeCheck, Info } from 'lucide-react'

import { ArtistProfileForm } from '@/app/(dashboard)/artist/profile/artist-profile-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireArtistProfile } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Shop Profile',
}

export default async function ArtistProfilePage() {
  const { userId, artistProfile } = await requireArtistProfile()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shop profile</h1>
        <p className="text-sm text-muted-foreground">
          This information is shown to buyers on your public storefront.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Shop details</CardTitle>
          {artistProfile.is_verified ? (
            <Badge className="gap-1">
              <BadgeCheck className="size-3.5" />
              Verified
            </Badge>
          ) : (
            <Badge variant="outline">Not verified</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Your public shop URL:{' '}
            <span className="font-medium text-foreground">/artists/{artistProfile.slug}</span>.
            This can&apos;t be changed after signup, since other pages already link to it.
          </p>

          {!artistProfile.is_verified && (
            <Alert>
              <Info className="size-4" />
              <AlertTitle>Verification</AlertTitle>
              <AlertDescription>
                Verified badges are granted by the Woodmarketplace team after a manual review —
                there&apos;s nothing to do here to request one.
              </AlertDescription>
            </Alert>
          )}

          <ArtistProfileForm userId={userId} defaultValues={artistProfile} />
        </CardContent>
      </Card>
    </div>
  )
}
