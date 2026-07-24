import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { SimulatorAdapter } from '@/lib/bot/adapter'
import { processInboundMessage } from '@/lib/bot/engine'
import { checkRateLimit } from '@/lib/rate-limit'

const inboundSchema = z.object({
  phone: z.string().trim().min(3).max(32),
  body: z.string().trim().min(1).max(1000),
})

// Coarser IP-based limit on top of the per-phone limit inside
// processInboundMessage — stops someone from dodging the per-phone cap by
// rotating fake phone numbers from a single source.
const WEBHOOK_IP_RATE_LIMIT = 60
const WEBHOOK_IP_RATE_WINDOW_SECONDS = 60

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

/**
 * The provider-facing webhook. Real providers (Meta Cloud API, Twilio) would
 * be configured to POST here in production, authenticated by
 * WHATSAPP_WEBHOOK_SECRET (or that provider's own signature scheme —
 * swap the check below for it). Uses SimulatorAdapter for now since no real
 * provider is wired up yet; switching adapters is the only change needed to
 * go live, per lib/bot/adapter.ts.
 *
 * Note: the /dev/wa-sim demo UI does NOT call this route directly — it uses
 * a server action (app/(dev)/wa-sim/actions.ts) that calls the same
 * processInboundMessage() function instead, since the browser can't safely
 * hold WHATSAPP_WEBHOOK_SECRET. Both paths run identical bot logic.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET
  if (secret && request.headers.get('x-webhook-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimit = await checkRateLimit(
    `wa-webhook:${clientIp(request)}`,
    WEBHOOK_IP_RATE_LIMIT,
    WEBHOOK_IP_RATE_WINDOW_SECONDS
  )
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(WEBHOOK_IP_RATE_WINDOW_SECONDS) } }
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = inboundSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 }
    )
  }

  try {
    const result = await processInboundMessage(parsed.data.phone, parsed.data.body, new SimulatorAdapter())
    return NextResponse.json({ reply: result.replyText, state: result.state })
  } catch (error) {
    console.error('POST /api/whatsapp/webhook failed', error)
    return NextResponse.json({ error: 'Could not process message.' }, { status: 500 })
  }
}
