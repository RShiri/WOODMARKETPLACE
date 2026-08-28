import { getDictionary } from '@/lib/i18n/dictionaries'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/types'
import { resolveDimensions } from '@/lib/lego/resolver'
import { getClearancePaddingMm } from '@/lib/pricing/config'
import { createQuote } from '@/lib/pricing/quote-service'
import { checkRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database.types'

import type { WaAdapter } from './adapter'
import * as messages from './messages'
import { detectLocale, parseBaseChoice, parseDimensions, parseSetIdToken, parseYesNo } from './parser'

type SessionState = 'IDLE' | 'CONFIRM_SET' | 'ASK_BASE' | 'QUOTED'

interface SessionContext {
  dims?: { lengthMm: number; widthMm: number; heightMm: number }
  setId?: string
  setName?: string | null
  confidence?: 'exact' | 'estimated'
  failCount?: number
  lastQuoteId?: string
  /** Language to reply in, sticky across turns — see lib/bot/parser.ts#detectLocale. */
  lang?: Locale
}

export interface ProcessResult {
  replyText: string
  state: SessionState
}

const MAX_REPROMPTS_BEFORE_HANDOFF = 2
const WA_RATE_LIMIT = 20
const WA_RATE_WINDOW_SECONDS = 60

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

async function logMessage(phone: string, direction: 'in' | 'out', body: string) {
  const supabase = createAdminClient()
  await supabase.from('wa_messages').insert({ phone, direction, body })
}

async function loadOrCreateSession(phone: string) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('wa_sessions')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('wa_sessions')
    .insert({ phone, state: 'IDLE', context: {} })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(`Could not create WhatsApp session for ${phone}: ${error?.message}`)
  }
  return created
}

async function saveSession(phone: string, state: SessionState, context: SessionContext) {
  const supabase = createAdminClient()
  await supabase
    .from('wa_sessions')
    .update({ state, context: context as unknown as Json })
    .eq('phone', phone)
}

/** Handles a message while the session is IDLE or QUOTED — both accept a fresh attempt at dims/set-id input. */
async function handleFreshInput(
  body: string,
  context: SessionContext,
  lang: Locale
): Promise<{ replyText: string; state: SessionState; context: SessionContext }> {
  const dims = parseDimensions(body)
  if (dims) {
    return {
      replyText: messages.askBaseMessage(dims, lang),
      state: 'ASK_BASE',
      context: { dims, failCount: 0, lang },
    }
  }

  const setId = parseSetIdToken(body)
  if (setId) {
    const resolved = await resolveDimensions(setId).catch(() => null)
    if (!resolved) {
      return {
        replyText: messages.lookupFailedMessage(setId, lang),
        state: 'IDLE',
        context: { failCount: (context.failCount ?? 0) + 1, lang },
      }
    }
    const paddingMm = await getClearancePaddingMm()
    const paddedDims = {
      lengthMm: resolved.lengthMm + paddingMm,
      widthMm: resolved.widthMm + paddingMm,
      heightMm: resolved.heightMm + paddingMm,
    }
    return {
      replyText: messages.confirmSetMessage(
        resolved.name,
        resolved.setId,
        resolved.confidence,
        paddedDims,
        lang
      ),
      state: 'CONFIRM_SET',
      context: {
        dims: paddedDims,
        setId: resolved.setId,
        setName: resolved.name,
        confidence: resolved.confidence,
        failCount: 0,
        lang,
      },
    }
  }

  const failCount = (context.failCount ?? 0) + 1
  return {
    replyText:
      failCount > MAX_REPROMPTS_BEFORE_HANDOFF ? messages.helpMessage(lang) : messages.greetingMessage(lang),
    state: 'IDLE',
    context: { failCount, lang },
  }
}

async function handleConfirmSet(
  body: string,
  context: SessionContext,
  lang: Locale
): Promise<{ replyText: string; state: SessionState; context: SessionContext }> {
  const yesNo = parseYesNo(body)
  if (yesNo === 'yes' && context.dims) {
    return {
      replyText: messages.askBaseMessage(context.dims, lang),
      state: 'ASK_BASE',
      context: { dims: context.dims, failCount: 0, lang },
    }
  }
  if (yesNo === 'no') {
    return { replyText: messages.editAfterDeclineMessage(lang), state: 'IDLE', context: { lang } }
  }

  const overrideDims = parseDimensions(body)
  if (overrideDims) {
    return {
      replyText: messages.askBaseMessage(overrideDims, lang),
      state: 'ASK_BASE',
      context: { dims: overrideDims, failCount: 0, lang },
    }
  }

  const failCount = (context.failCount ?? 0) + 1
  if (failCount > MAX_REPROMPTS_BEFORE_HANDOFF) {
    return { replyText: messages.helpMessage(lang), state: 'IDLE', context: { lang } }
  }
  return {
    replyText: messages.repromptConfirmMessage(lang),
    state: 'CONFIRM_SET',
    context: { ...context, failCount, lang },
  }
}

async function handleAskBase(
  phone: string,
  body: string,
  context: SessionContext,
  lang: Locale
): Promise<{ replyText: string; state: SessionState; context: SessionContext }> {
  const baseType = parseBaseChoice(body)
  if (baseType && context.dims) {
    const { quote } = await createQuote({
      lengthMm: context.dims.lengthMm,
      widthMm: context.dims.widthMm,
      heightMm: context.dims.heightMm,
      baseType,
      legoSetId: context.setId ?? null,
      channel: 'whatsapp',
      waPhone: phone,
    })
    return {
      replyText: messages.quotedMessage(quote.price_cents, quote.currency, quote.id, siteUrl(), lang),
      state: 'QUOTED',
      context: { lastQuoteId: quote.id, failCount: 0, lang },
    }
  }

  const failCount = (context.failCount ?? 0) + 1
  if (failCount > MAX_REPROMPTS_BEFORE_HANDOFF) {
    return { replyText: messages.helpMessage(lang), state: 'IDLE', context: { lang } }
  }
  return {
    replyText: messages.repromptBaseMessage(lang),
    state: 'ASK_BASE',
    context: { ...context, failCount, lang },
  }
}

/**
 * Handles one inbound WhatsApp message end to end: logs it, runs the FSM
 * step for the sender's current session state, persists the new state, logs
 * the reply, and (for a real provider) pushes it via the adapter. Used by
 * both the simulator and — unchanged — any future real webhook route, since
 * everything here is provider-agnostic.
 *
 * Reply language is auto-detected per message (Hebrew script anywhere in the
 * text wins, a digits-only message keeps the session's current language —
 * see parser.ts#detectLocale) so a Hebrew-speaking collector never has to
 * ask for it explicitly.
 */
export async function processInboundMessage(
  rawPhone: string,
  body: string,
  adapter?: WaAdapter
): Promise<ProcessResult> {
  const phone = rawPhone.trim()
  await logMessage(phone, 'in', body)

  const session = await loadOrCreateSession(phone)
  const context = (session.context ?? {}) as SessionContext
  const lang = detectLocale(body, context.lang ?? DEFAULT_LOCALE)

  // Rate-limited here (not in the webhook route) so both a real provider
  // webhook and the /wa-sim server action — which never touches the HTTP
  // route — are protected the same way.
  const rateLimit = await checkRateLimit(`wa:${phone}`, WA_RATE_LIMIT, WA_RATE_WINDOW_SECONDS)
  if (!rateLimit.allowed) {
    const replyText = getDictionary(lang).bot.rateLimited
    await logMessage(phone, 'out', replyText)
    if (adapter) await adapter.sendMessage(phone, replyText)
    return { replyText, state: session.state as SessionState }
  }

  let result: { replyText: string; state: SessionState; context: SessionContext }
  switch (session.state as SessionState) {
    case 'CONFIRM_SET':
      result = await handleConfirmSet(body, context, lang)
      break
    case 'ASK_BASE':
      result = await handleAskBase(phone, body, context, lang)
      break
    case 'IDLE':
    case 'QUOTED':
    default:
      result = await handleFreshInput(body, context, lang)
      break
  }

  await saveSession(phone, result.state, result.context)
  await logMessage(phone, 'out', result.replyText)
  if (adapter) await adapter.sendMessage(phone, result.replyText)

  return { replyText: result.replyText, state: result.state }
}
