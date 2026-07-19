'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ImagePlus, Loader2 } from 'lucide-react'

import { updateArtistBanner, updateArtistProfile } from '@/app/(dashboard)/artist/profile/actions'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { artistProfileSchema, type ArtistProfileInput } from '@/lib/validations/artist-profile'
import type { ArtistProfile } from '@/types/database.types'

interface ArtistProfileFormProps {
  userId: string
  defaultValues: ArtistProfile
}

export function ArtistProfileForm({ userId, defaultValues }: ArtistProfileFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [bannerUrl, setBannerUrl] = useState<string | null>(defaultValues.banner_url)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ArtistProfileInput>({
    resolver: zodResolver(artistProfileSchema),
    defaultValues: {
      shopName: defaultValues.shop_name,
      bio: defaultValues.bio ?? '',
      location: defaultValues.location ?? '',
    },
  })

  async function onSubmit(values: ArtistProfileInput) {
    setIsSaving(true)
    try {
      const result = await updateArtistProfile({
        shopName: values.shopName,
        bio: values.bio ? values.bio : null,
        location: values.location ? values.location : null,
      })
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Profile updated')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBannerChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const supabase = createClient()
      const path = `${userId}/${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('artist-banners')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('artist-banners').getPublicUrl(path)

      const result = await updateArtistBanner(publicUrl)
      if ('error' in result) {
        toast.error(result.error)
        return
      }

      setBannerUrl(publicUrl)
      toast.success('Banner updated')
    } catch {
      toast.error('Something went wrong uploading your banner. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="banner-upload">Shop banner</Label>
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border bg-muted">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt="Shop banner"
              fill
              sizes="(min-width: 768px) 640px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <ImagePlus className="size-5" />
              No banner uploaded yet
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm font-medium">
              <Loader2 className="size-4 animate-spin" />
              Uploading…
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          id="banner-upload"
          type="file"
          accept="image/*"
          disabled={isUploading}
          onChange={handleBannerChange}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">PNG or JPG, ideally a wide banner image.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="shopName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shop name</FormLabel>
                <FormControl>
                  <Input placeholder="Maple & Grain Woodshop" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell buyers about your craft, materials, and process…"
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Portland, OR" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
