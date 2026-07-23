import type { Metadata } from 'next'

import { GalleryGrid } from '@/components/shop/gallery-grid'
import { getServerDictionary } from '@/lib/i18n/server'
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

  const dict = getServerDictionary()

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{dict.gallery.pageTitle}</h1>
        <p className="mt-2 text-muted-foreground">{dict.gallery.pageSubtitle}</p>
      </div>
      <GalleryGrid items={items ?? []} emptyLabel={dict.gallery.empty} unitLabel={dict.common.cm} />
    </main>
  )
}
