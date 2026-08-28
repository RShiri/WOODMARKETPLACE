/**
 * The shop's WhatsApp support line, in wa.me form (country code first, no
 * punctuation). Baked in as the default so a deployment that never sets
 * NEXT_PUBLIC_SUPPORT_WHATSAPP still routes custom-quote requests somewhere
 * real; set that variable to override it per environment (e.g. a staging
 * number that shouldn't reach a live phone).
 */
export const DEFAULT_SUPPORT_WHATSAPP = '972526299701'

/**
 * Where to send a customer whose box the calculator can't price automatically.
 *
 * WhatsApp wins when both channels are available — it's the channel the shop
 * already runs a bot on — and falls back to the configured support mailbox.
 * Only returns null if the WhatsApp default is explicitly blanked out and no
 * email is set, in which case the UI shows the explanation without a button
 * that goes nowhere.
 */
export function supportRequestHref(message: string): string | null {
  const configured = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP
  // An explicitly empty value is a deliberate opt-out, not "unset" — only an
  // absent variable falls back to the default.
  const phone = (configured === undefined ? DEFAULT_SUPPORT_WHATSAPP : configured).replace(
    /\D/g,
    ''
  )
  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()
  if (email) {
    const subject = encodeURIComponent('Custom engineered quote request')
    return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(message)}`
  }

  return null
}
