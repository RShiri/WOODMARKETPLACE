import type { Metadata } from 'next'

import { GalleryGrid } from '@/components/shop/gallery-grid'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'A look at custom perspex display boxes built for LEGO collectors.',
}

export default async function GalleryPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('box_gallery')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gallery</h1>
        <p className="mt-2 text-muted-foreground">
          A few examples of what we build. Click any box to start from its dimensions in the
          calculator.
        </p>
      </div>
      <GalleryGrid items={items ?? []} />
    </main>
  )
}
