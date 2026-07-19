'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ShopFilterOption {
  slug: string
  name: string
}

interface ShopFiltersProps {
  woodTypes: ShopFilterOption[]
  categories: ShopFilterOption[]
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

/** All-select sentinel — Radix Select doesn't allow an empty-string item value. */
const ALL_VALUE = 'all'

export function ShopFilters({ woodTypes, categories }: ShopFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentWoodType = searchParams.get('woodType') ?? ALL_VALUE
  const currentCategory = searchParams.get('category') ?? ALL_VALUE
  const currentSort = searchParams.get('sort') ?? 'newest'

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '')

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '' || value === ALL_VALUE) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    const query = params.toString()
    router.push(query ? `/shop?${query}` : '/shop')
  }

  function applyPriceFilters() {
    navigate({ minPrice: minPrice || null, maxPrice: maxPrice || null })
  }

  const hasFilters =
    searchParams.has('woodType') ||
    searchParams.has('category') ||
    searchParams.has('minPrice') ||
    searchParams.has('maxPrice') ||
    searchParams.has('sort')

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
        <label htmlFor="wood-type-filter" className="text-sm font-medium text-foreground">
          Wood type
        </label>
        <Select
          value={currentWoodType}
          onValueChange={(value) => navigate({ woodType: value })}
        >
          <SelectTrigger id="wood-type-filter">
            <SelectValue placeholder="All wood types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All wood types</SelectItem>
            {woodTypes.map((woodType) => (
              <SelectItem key={woodType.slug} value={woodType.slug}>
                {woodType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
        <label htmlFor="category-filter" className="text-sm font-medium text-foreground">
          Category
        </label>
        <Select
          value={currentCategory}
          onValueChange={(value) => navigate({ category: value })}
        >
          <SelectTrigger id="category-filter">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.slug} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Price (USD)</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Min"
            aria-label="Minimum price"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            onBlur={applyPriceFilters}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyPriceFilters()
            }}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Max"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            onBlur={applyPriceFilters}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyPriceFilters()
            }}
          />
        </div>
      </div>

      <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
        <label htmlFor="sort-filter" className="text-sm font-medium text-foreground">
          Sort by
        </label>
        <Select value={currentSort} onValueChange={(value) => navigate({ sort: value })}>
          <SelectTrigger id="sort-filter">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setMinPrice('')
            setMaxPrice('')
            router.push('/shop')
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
