'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { BaseTypePicker } from '@/components/shop/base-type-picker'
import { PriceCard } from '@/components/shop/price-card'
import type { BaseType, PriceBreakdown } from '@/lib/pricing/engine'

export interface CalculatorInitialState {
  lengthMm?: number
  widthMm?: number
  heightMm?: number
  baseType?: BaseType
  setId?: string
  tab?: 'dimensions' | 'set'
}

interface QuoteResult {
  quoteId: string
  priceCents: number
  thicknessMm: number
  breakdown: PriceBreakdown
}

interface SetLookupResult {
  setId: string
  name: string | null
  pieceCount: number | null
  confidence: 'exact' | 'estimated'
  imageUrl: string | null
  suggestedDimensionsMm: { length: number; width: number; height: number }
}

type UnitSystem = 'cm' | 'mm'

function mmToDisplay(mm: number, unit: UnitSystem): string {
  return unit === 'cm' ? (mm / 10).toString() : mm.toString()
}

function displayToMm(value: string, unit: UnitSystem): number | null {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(unit === 'cm' ? parsed * 10 : parsed)
}

const DEBOUNCE_MS = 450

export function Calculator({ initial }: { initial: CalculatorInitialState }) {
  const router = useRouter()

  const [tab, setTab] = useState<'dimensions' | 'set'>(initial.tab ?? 'dimensions')
  const [unit, setUnit] = useState<UnitSystem>('cm')

  const [lengthMm, setLengthMm] = useState<number | null>(initial.lengthMm ?? null)
  const [widthMm, setWidthMm] = useState<number | null>(initial.widthMm ?? null)
  const [heightMm, setHeightMm] = useState<number | null>(initial.heightMm ?? null)
  const [baseType, setBaseType] = useState<BaseType>(initial.baseType ?? 'none')

  const [setIdInput, setSetIdInput] = useState(initial.setId ?? '')
  const [setLookup, setSetLookup] = useState<SetLookupResult | null>(null)
  const [setLookupLoading, setSetLookupLoading] = useState(false)
  const [setLookupError, setSetLookupError] = useState<string | null>(null)

  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [ordering, setOrdering] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  // Resolve the set id from ?set= on first mount, if provided.
  useEffect(() => {
    if (initial.setId) {
      void lookupSet(initial.setId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!lengthMm || !widthMm || !heightMm) {
      setQuote(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchQuote(lengthMm, widthMm, heightMm, baseType)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lengthMm, widthMm, heightMm, baseType])

  async function fetchQuote(l: number, w: number, h: number, base: BaseType) {
    const requestId = ++requestIdRef.current
    setQuoteLoading(true)
    setQuoteError(null)
    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lengthMm: l,
          widthMm: w,
          heightMm: h,
          baseType: base,
          legoSetId: setLookup?.setId,
          channel: 'web',
        }),
      })
      const data = await response.json()
      if (requestId !== requestIdRef.current) return // stale response, ignore
      if (!response.ok) {
        setQuoteError(data.error ?? 'Could not calculate a price.')
        setQuote(null)
        return
      }
      setQuote(data)
    } catch {
      if (requestId !== requestIdRef.current) return
      setQuoteError('Could not reach the pricing service. Please try again.')
    } finally {
      if (requestId === requestIdRef.current) setQuoteLoading(false)
    }
  }

  async function lookupSet(rawSetId: string) {
    if (!rawSetId.trim()) return
    setSetLookupLoading(true)
    setSetLookupError(null)
    try {
      const response = await fetch(`/api/lego/${encodeURIComponent(rawSetId.trim())}`)
      const data = await response.json()
      if (!response.ok) {
        setSetLookupError(data.error ?? 'Could not find that set.')
        setSetLookup(null)
        return
      }
      setSetLookup(data)
      setLengthMm(data.suggestedDimensionsMm.length)
      setWidthMm(data.suggestedDimensionsMm.width)
      setHeightMm(data.suggestedDimensionsMm.height)
      setTab('dimensions')
      if (data.confidence === 'estimated') {
        toast.info('These dimensions are an estimate — please double-check before ordering.')
      }
    } catch {
      setSetLookupError('Could not reach the lookup service. Please try again.')
    } finally {
      setSetLookupLoading(false)
    }
  }

  function handleOrder() {
    if (!quote) return
    setOrdering(true)
    router.push(`/checkout?quote=${quote.quoteId}`)
  }

  const dims: { key: 'length' | 'width' | 'height'; label: string; value: number | null; set: (mm: number | null) => void }[] = [
    { key: 'length', label: 'Length', value: lengthMm, set: setLengthMm },
    { key: 'width', label: 'Width', value: widthMm, set: setWidthMm },
    { key: 'height', label: 'Height', value: heightMm, set: setHeightMm },
  ]

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'dimensions' | 'set')}>
          <TabsList>
            <TabsTrigger value="dimensions">I know my dimensions</TabsTrigger>
            <TabsTrigger value="set">I have a LEGO set</TabsTrigger>
          </TabsList>

          <TabsContent value="dimensions">
            <Card>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <Label>Box dimensions</Label>
                  <div className="flex items-center gap-1 rounded-md bg-muted p-1 text-xs">
                    {(['cm', 'mm'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        className={
                          'rounded px-2 py-1 font-medium transition-colors ' +
                          (unit === u ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')
                        }
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {dims.map((dim) => (
                    <div key={dim.key} className="flex flex-col gap-1.5">
                      <Label htmlFor={`dim-${dim.key}`} className="text-xs text-muted-foreground">
                        {dim.label}
                      </Label>
                      <Input
                        id={`dim-${dim.key}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={unit === 'cm' ? 0.1 : 1}
                        value={dim.value != null ? mmToDisplay(dim.value, unit) : ''}
                        onChange={(e) => dim.set(displayToMm(e.target.value, unit))}
                        placeholder={unit === 'cm' ? 'e.g. 30' : 'e.g. 300'}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Measure the built model at its widest points — the case is sized to fit over it.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="set">
            <Card>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="set-id">LEGO set number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="set-id"
                      value={setIdInput}
                      onChange={(e) => setSetIdInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void lookupSet(setIdInput)
                        }
                      }}
                      placeholder="e.g. 10294"
                    />
                    <Button
                      type="button"
                      onClick={() => void lookupSet(setIdInput)}
                      disabled={setLookupLoading || !setIdInput.trim()}
                    >
                      {setLookupLoading ? 'Looking up…' : 'Look up'}
                    </Button>
                  </div>
                  {setLookupError && <p className="text-sm text-destructive">{setLookupError}</p>}
                </div>

                {setLookup && (
                  <div className="flex items-center gap-4 rounded-lg border border-border p-3">
                    {setLookup.imageUrl && (
                      <Image
                        src={setLookup.imageUrl}
                        alt={setLookup.name ?? setLookup.setId}
                        width={64}
                        height={64}
                        className="rounded-md object-cover"
                        unoptimized
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {setLookup.name ?? `Set ${setLookup.setId}`}
                        </p>
                        <Badge variant={setLookup.confidence === 'exact' ? 'default' : 'secondary'}>
                          {setLookup.confidence === 'exact' ? 'exact' : 'estimated'}
                        </Badge>
                      </div>
                      {setLookup.pieceCount && (
                        <p className="text-xs text-muted-foreground">{setLookup.pieceCount} pieces</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dimensions filled in below — switch to &ldquo;I know my dimensions&rdquo; to review or edit.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-3">
          <Label>Base</Label>
          <BaseTypePicker value={baseType} onChange={setBaseType} />
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <PriceCard
          quote={quote}
          loading={quoteLoading}
          error={quoteError}
          baseType={baseType}
          onOrder={handleOrder}
          ordering={ordering}
        />
      </div>
    </div>
  )
}
