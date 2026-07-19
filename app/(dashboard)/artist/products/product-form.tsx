'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ImagePlus, Loader2, X } from 'lucide-react'

import {
  addProductImage,
  createProduct,
  removeProductImage,
  updateProduct,
} from '@/app/(dashboard)/artist/products/actions'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { productSchema, type ProductFormInput } from '@/lib/validations/product'
import type { ProductImage } from '@/types/database.types'

/** Sentinel used for the "no category / no wood type" Select option — Radix Select rejects an empty-string item value. */
const NONE_VALUE = 'none'

export interface ProductFormOption {
  id: string
  name: string
}

export interface ProductFormDefaultValues {
  title: string
  description: string | null
  priceDollars: number
  categoryId: string | null
  woodTypeId: string | null
  isMadeToOrder: boolean
  stockQuantity: number | null
  status: 'draft' | 'published'
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  /** The artist's own user id — used as the first storage-path segment required by the product-images RLS policies. */
  artistId: string
  /** Required in edit mode; ignored in create mode (a fresh id is generated on mount instead). */
  productId?: string
  defaultValues?: ProductFormDefaultValues
  images?: ProductImage[]
  woodTypes: ProductFormOption[]
  categories: ProductFormOption[]
}

function buildStoragePath(artistId: string, productId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')
  return `${artistId}/${productId}/${crypto.randomUUID()}-${safeName}`
}

interface PendingFile {
  key: string
  file: File
  previewUrl: string
}

export function ProductForm({
  mode,
  artistId,
  productId: productIdProp,
  defaultValues,
  images = [],
  woodTypes,
  categories,
}: ProductFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // In create mode the product row doesn't exist yet, so we mint its id
  // client-side once, up front. That id doubles as the storage-path prefix
  // for images uploaded during creation and is sent explicitly to
  // createProduct so the DB row is inserted with this exact id.
  const [productId] = useState<string>(() => productIdProp ?? crypto.randomUUID())

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [removingImageId, setRemovingImageId] = useState<string | null>(null)
  const [existingImages, setExistingImages] = useState<ProductImage[]>(() =>
    [...images].sort((a, b) => a.position - b.position)
  )
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      priceDollars: defaultValues?.priceDollars ?? 0,
      categoryId: defaultValues?.categoryId ?? NONE_VALUE,
      woodTypeId: defaultValues?.woodTypeId ?? NONE_VALUE,
      isMadeToOrder: defaultValues?.isMadeToOrder ?? false,
      stockQuantity: defaultValues?.stockQuantity ?? 0,
      status: defaultValues?.status ?? 'draft',
    },
  })

  const isMadeToOrder = form.watch('isMadeToOrder')

  function getPublicUrl(storagePath: string) {
    return supabase.storage.from('product-images').getPublicUrl(storagePath).data.publicUrl
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    if (mode === 'create') {
      setPendingFiles((prev) => [
        ...prev,
        ...files.map((file) => ({
          key: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ])
      return
    }

    void uploadImagesNow(files)
  }

  /** Edit mode: uploads directly to Storage then records each image immediately, since the product row already exists. */
  async function uploadImagesNow(files: File[]) {
    setIsUploading(true)
    try {
      let position = existingImages.length
      for (const file of files) {
        const path = buildStoragePath(artistId, productId, file.name)
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, file)

        if (uploadError) {
          toast.error(`Could not upload ${file.name}: ${uploadError.message}`)
          continue
        }

        const result = await addProductImage(productId, path, null, position)
        if ('error' in result) {
          toast.error(`Could not save ${file.name}: ${result.error}`)
          continue
        }

        setExistingImages((prev) => [
          ...prev,
          {
            id: result.id,
            product_id: productId,
            storage_path: path,
            alt_text: null,
            position,
            created_at: new Date().toISOString(),
          },
        ])
        position += 1
      }
      router.refresh()
    } finally {
      setIsUploading(false)
    }
  }

  function removePendingFile(key: string) {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.key !== key)
    })
  }

  async function handleRemoveExistingImage(image: ProductImage) {
    setRemovingImageId(image.id)
    try {
      const result = await removeProductImage(image.id, image.storage_path)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setExistingImages((prev) => prev.filter((img) => img.id !== image.id))
      toast.success('Image removed.')
      router.refresh()
    } finally {
      setRemovingImageId(null)
    }
  }

  async function onSubmit(values: ProductFormInput) {
    setIsSubmitting(true)
    try {
      const payload: ProductFormInput = {
        ...values,
        categoryId: values.categoryId === NONE_VALUE ? null : values.categoryId,
        woodTypeId: values.woodTypeId === NONE_VALUE ? null : values.woodTypeId,
      }

      if (mode === 'create') {
        const result = await createProduct({ ...payload, id: productId })
        if ('error' in result) {
          toast.error(result.error)
          return
        }

        // Only now that the product row exists can images be uploaded and
        // recorded — product_images inserts are RLS-gated on the parent
        // product already existing and being owned by this artist.
        if (pendingFiles.length > 0) {
          let position = 0
          for (const pending of pendingFiles) {
            const path = buildStoragePath(artistId, productId, pending.file.name)
            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(path, pending.file)

            if (uploadError) {
              toast.error(`Could not upload ${pending.file.name}: ${uploadError.message}`)
              continue
            }

            const imageResult = await addProductImage(productId, path, null, position)
            if ('error' in imageResult) {
              toast.error(`Could not save ${pending.file.name}: ${imageResult.error}`)
            }
            position += 1
          }
        }

        toast.success('Product created.')
        router.push('/artist/products')
        return
      }

      const result = await updateProduct(productId, payload)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Product updated.')
      router.push('/artist/products')
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = isSubmitting || isUploading

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Walnut Live-Edge Console Table" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder="Describe the materials, dimensions, and craftsmanship…"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="priceDollars"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (USD)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value ?? NONE_VALUE} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="woodTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wood type</FormLabel>
                <Select value={field.value ?? NONE_VALUE} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No wood type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No wood type</SelectItem>
                    {woodTypes.map((woodType) => (
                      <SelectItem key={woodType.id} value={woodType.id}>
                        {woodType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isMadeToOrder"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="size-4 rounded border-input"
                />
              </FormControl>
              <FormLabel className="!mt-0 font-normal">
                This item is made to order (no fixed stock quantity)
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isMadeToOrder && (
          <FormField
            control={form.control}
            name="stockQuantity"
            render={({ field }) => (
              <FormItem className="max-w-[240px]">
                <FormLabel>Stock quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={field.value ?? 0}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-3">
          <Label htmlFor="product-images">Photos</Label>

          {existingImages.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {existingImages.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  <Image
                    src={getPublicUrl(image.storage_path)}
                    alt={image.alt_text ?? ''}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(image)}
                    disabled={removingImageId === image.id}
                    aria-label="Remove image"
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow disabled:opacity-50"
                  >
                    {removingImageId === image.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {pendingFiles.map((pending) => (
                <div
                  key={pending.key}
                  className="relative aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  {/* Local, not-yet-uploaded preview — a plain img is fine since it's a blob: URL. */}
                  <img
                    src={pending.previewUrl}
                    alt={pending.file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePendingFile(pending.key)}
                    aria-label="Remove image"
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              id="product-images"
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={handleFilesSelected}
              className="max-w-sm"
            />
            {isUploading && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Uploading…
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImagePlus className="size-3.5" />
            {mode === 'create'
              ? 'Photos are uploaded once you save the product below.'
              : 'Photos are uploaded and saved immediately.'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : mode === 'create' ? (
              'Create product'
            ) : (
              'Save changes'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => router.push('/artist/products')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
