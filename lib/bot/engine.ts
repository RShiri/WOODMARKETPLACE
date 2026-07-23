import { resolveDimensions } from '@/lib/lego/resolver'
import { getClearancePaddingMm } from '@/lib/pricing/config'
import { createQuote } from '@/lib/pricing/quote-service'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database.types'

import type { WaAdapter } from './adapter'
import * as messages from './messages'
import { parseBaseChoice, parseDimensions, parseSetIdToken, parseYesNo } from './parser'

type SessionState = 'IDLE' | 'CONFIRM_SET' | 'ASK_BASE' | 'QUOTED'

interface SessionContext {
  dims?: { lengthMm: number; widthMm: number; heightMm: number }
  setId?: string
  setName?: string | null
  confidence?: 'exact' | 'estimated'
  failCount?: number
  lastQuoteId?: string
}

export interface ProcessResult {
  replyText: string
  state: SessionState
}

const MAX_REPROMPTS_BEFORE_HANDOFF = 2

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
  context: SessionContext
): Promise<{ replyText: string; state: SessionState; context: SessionContext }> {
  const dims = parseDimensions(body)
  if (dims) {
    return {
      replyText: messages.askBaseMessage(dims),
      state: 'ASK_BASE',
      context: { dims, failCount: 0 },
    }
  }

  const setId = parseSetIdToken(body)
  if (setId) {
    const resolved = await resolveDimensions(setId).catch(() => null)
    if (!resolved) {
      return {
        replyText: messages.lookupFailedMessage(setId),
        state: 'IDLE',
        context: { failCount: (context.failCount ?? 0) + 1 },
      }
    }
    const paddingMm = await getClearancePaddingMm()
    const paddedDims = {
      lengthMm: resolved.lengthMm + paddingMm,
      widthMm: resolved.widthMm + paddingMm,
      heightMm: resolved.heightMm + paddingMm,
    }
    return {
      replyText: messages.confirmSetMessage(resolved.name, resolved.setId, resolved.confidence, paddedDims),
      state: 'CONFIRM_SET',
      context: {
        dims: paddedDims,
        setId: resolved.setId,
        setName: resolved.name,
        confidence: resolved.confidence,
        failCount: 0,
      },
    }
  }

  const failCount = (context.failCount ?? 0) + 1
  return {
    replyText: failCount > MAX_REPROMPTS_BEFORE_HANDOFF ? messages.helpMessage() : messages.greetingMessage(),
    state: 'IDLE',
    context: { failCount },
  }
}

async function handleConfirmSet(
  body: string,
  context: SessionContext
): Promise<{ replyText: string; state: SessionState; context: SessionContext }> {
  const yesNo = parseYesNo(body)
  if (yesNo === 'yes' && context.dims) {
    return { replyText: messages.askBaseMessage(context.dims), state: 'ASK_BASE', context: { dims: context.dims, failCount: 0 } }
  }
  if (yesNo === 'no') {
    return { replyText: messages.editAfterDeclineMessage(), state: 'IDLE', context: {} }
  }

  const overrideDims = parseDimensions(body)
  if (overrideDims) {
    return {
      replyText: messages.askBaseMessage(overrideDims),
      state: 'ASK_BASE',
      context: { dims: overrideDims, failCount: 0 },
    }
  }

  const failCount = (context.failCount ?? 0) + 1
  if (failCount > MAX_REPROMPTS_BEFORE_HANDOFF) {
    return { replyText: messages.helpMessage(), state: 'IDLE', context: {} }
  }
  return { replyText: messages.repromptConfirmMessage(), state: 'CONFIRM_SET', context: { ...context, failCount } }
}

async function handleAskBase(
  phone: string,
  body: string,
  context: SessionContext
): Promise<{ replyText: string; state: SessionState; context: SessionContext }> {
  const baseType = parseBaseChoice(body)
  if (baseType && context.dims) {
    const quote = await createQuote({
      lengthMm: context.dims.lengthMm,
      widthMm: context.dims.widthMm,
      heightMm: context.dims.heightMm,
      baseType,
      legoSetId: context.setId ?? null,
      channel: 'whatsapp',
      waPhone: phone,
    })
    return {
      replyText: messages.quotedMessage(quote.price_cents, quote.id, siteUrl()),
      state: 'QUOTED',
      context: { lastQuoteId: quote.id, failCount: 0 },
    }
  }

  const failCount = (context.failCount ?? 0) + 1
  if (failCount > MAX_REPROMPTS_BEFORE_HANDOFF) {
    return { replyText: messages.helpMessage(), state: 'IDLE', context: {} }
  }
  return { replyText: messages.repromptBaseMessage(), state: 'ASK_BASE', context: { ...context, failCount } }
}

/**
 * Handles one inbound WhatsApp message end to end: logs it, runs the FSM
 * step for the sender's current session state, persists the new state, logs
 * the reply, and (for a real provider) pushes it via the adapter. Used by
 * both the simulator and — unchanged — any future real webhook route, since
 * everything here is provider-agnostic.
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

  let result: { replyText: string; state: SessionState; context: SessionContext }
  switch (session.state as SessionState) {
    case 'CONFIRM_SET':
      result = await handleConfirmSet(body, context)
      break
    case 'ASK_BASE':
      result = await handleAskBase(phone, body, context)
      break
    case 'IDLE':
    case 'QUOTED':
    default:
      result = await handleFreshInput(body, context)
      break
  }

  await saveSession(phone, result.state, result.context)
  await logMessage(phone, 'out', result.replyText)
  if (adapter) await adapter.sendMessage(phone, result.replyText)

  return { replyText: result.replyText, state: result.state }
}
