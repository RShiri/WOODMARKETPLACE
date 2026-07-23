/**
 * Provider-agnostic outbound interface. lib/bot/engine.ts never imports a
 * vendor SDK directly — swapping to a real WhatsApp provider later is a
 * matter of implementing this interface and wiring it into a webhook route,
 * not rewriting the conversation logic.
 */
export interface WaAdapter {
  sendMessage(phone: string, body: string): Promise<void>
}

/**
 * The MVP/demo adapter: does nothing, because the /dev/wa-sim UI gets the
 * bot's reply directly in the webhook's HTTP response (see
 * app/api/whatsapp/webhook/route.ts) rather than through a push channel.
 * lib/bot/engine.ts logs every outbound message to wa_messages regardless
 * of adapter, so this still produces a full audit trail.
 */
export class SimulatorAdapter implements WaAdapter {
  async sendMessage(): Promise<void> {
    // Intentionally a no-op — see class comment.
  }
}

/**
 * Extension points for going live. Not implemented — wiring either of
 * these up is config (API credentials + a provider-specific webhook route
 * that verifies the request and calls processInboundMessage) rather than a
 * conversation-logic rewrite, since InboundMessage/WaAdapter are already
 * provider-agnostic.
 */
export class MetaCloudAdapter implements WaAdapter {
  async sendMessage(): Promise<void> {
    throw new Error(
      'MetaCloudAdapter is not implemented. Wire up the WhatsApp Cloud API /messages endpoint here.'
    )
  }
}

export class TwilioAdapter implements WaAdapter {
  async sendMessage(): Promise<void> {
    throw new Error('TwilioAdapter is not implemented. Wire up the Twilio WhatsApp API here.')
  }
}
