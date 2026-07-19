'use client'

import { useState } from 'react'
import Image from 'next/image'

import { cn } from '@/lib/utils'

export interface ProductGalleryImage {
  url: string
  altText: string | null
}

/** Interactive image gallery for a product detail page: a large main image with a clickable thumbnail strip. */
export function ProductGallery({
  images,
  productTitle,
}: {
  images: ProductGalleryImage[]
  productTitle: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex]

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        {activeImage ? (
          <Image
            key={activeImage.url}
            src={activeImage.url}
            alt={activeImage.altText ?? productTitle}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex}
              className={cn(
                'relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted transition-colors',
                index === activeIndex
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Image
                src={image.url}
                alt={image.altText ?? `${productTitle} thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
