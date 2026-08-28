/**
 * Where to send a customer whose box the calculator can't price automatically.
 *
 * Both channels are optional deployment config. WhatsApp wins when both are
 * set — it's the channel the shop already runs a bot on — and when neither is
 * configured this returns null so the UI can show the explanation without a
 * button that goes nowhere.
 */
export function supportRequestHref(message: string): string | null {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, '')
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
