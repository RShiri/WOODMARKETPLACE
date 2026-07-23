'use server'

import { SimulatorAdapter } from '@/lib/bot/adapter'
import { processInboundMessage } from '@/lib/bot/engine'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WaMessage } from '@/types/database.types'

/**
 * Server action used only by /dev/wa-sim. Calls the exact same
 * processInboundMessage() the real webhook route uses — this exists as a
 * separate entry point purely because the browser can't hold
 * WHATSAPP_WEBHOOK_SECRET, not because the bot logic differs.
 */
export async function sendSimulatorMessage(phone: string, body: string) {
  return processInboundMessage(phone, body, new SimulatorAdapter())
}

export async function fetchSimulatorHistory(phone: string): Promise<WaMessage[]> {
  if (!phone.trim()) return []
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('wa_messages')
    .select('*')
    .eq('phone', phone.trim())
    .order('created_at', { ascending: true })
  return data ?? []
}
