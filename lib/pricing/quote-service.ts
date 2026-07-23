import { createAdminClient } from '@/lib/supabase/admin'
import type { Json, Quote } from '@/types/database.types'

import { calculatePrice, type BaseType } from './engine'
import { loadPricingContext } from './config'

export interface CreateQuoteParams {
  lengthMm: number
  widthMm: number
  heightMm: number
  baseType: BaseType
  legoSetId?: string | null
  channel: 'web' | 'whatsapp'
  waPhone?: string | null
}

/**
 * The one function that creates a quote, called by both POST /api/quote
 * (web calculator) and lib/bot (WhatsApp) — guarantees every channel prices
 * a box through the exact same engine call and persists it the same way.
 */
export async function createQuote(params: CreateQuoteParams): Promise<Quote> {
  const { config, rates } = await loadPricingContext()

  const result = calculatePrice(
    {
      lengthMm: params.lengthMm,
      widthMm: params.widthMm,
      heightMm: params.heightMm,
      baseType: params.baseType,
    },
    config,
    rates
  )

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      length_mm: params.lengthMm,
      width_mm: params.widthMm,
      height_mm: params.heightMm,
      base_type: params.baseType,
      thickness_mm: result.thicknessMm,
      lego_set_id: params.legoSetId ?? null,
      price_cents: result.priceCents,
      breakdown: result.breakdown as unknown as Json,
      channel: params.channel,
      wa_phone: params.waPhone ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Could not create quote: ${error?.message ?? 'unknown error'}`)
  }

  return data
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle()
  if (error) {
    throw new Error(`Could not load quote: ${error.message}`)
  }
  return data
}

export function isQuoteExpired(quote: Quote): boolean {
  return new Date(quote.expires_at).getTime() < Date.now()
}
