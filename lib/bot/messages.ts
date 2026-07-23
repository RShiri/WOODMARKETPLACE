import { formatPrice } from '@/lib/utils/format'

export interface DimsMm {
  lengthMm: number
  widthMm: number
  heightMm: number
}

function dimsToCm(dims: DimsMm): string {
  return `${dims.lengthMm / 10}×${dims.widthMm / 10}×${dims.heightMm / 10}cm`
}

export function greetingMessage(): string {
  return [
    "Hi! 👋 I'm the BrickCase bot — I can quote a custom display box for your LEGO build.",
    '',
    "Send me the box dimensions (e.g. 30x20x25cm) or a LEGO set number (e.g. 10294) and I'll get you a price.",
  ].join('\n')
}

export function helpMessage(): string {
  return [
    "Sorry, I couldn't understand that. Try:",
    '• Dimensions like 30x20x25cm',
    '• A LEGO set number like 10294',
    '',
    "If that keeps not working, reply 'help' any time or reach us on the website.",
  ].join('\n')
}

export function confirmSetMessage(
  setName: string | null,
  setId: string,
  confidence: 'exact' | 'estimated',
  dims: DimsMm
): string {
  const confidenceNote = confidence === 'estimated' ? ' (estimated — please double-check)' : ''
  return [
    `Found: ${setName ?? `Set ${setId}`}`,
    `Suggested case size: ${dimsToCm(dims)}${confidenceNote}`,
    '',
    'Use these dimensions? Reply *yes* to continue, or send your own dimensions (e.g. 30x20x25cm).',
  ].join('\n')
}

export function repromptConfirmMessage(): string {
  return 'Please reply *yes* to use these dimensions, or send your own (e.g. 30x20x25cm).'
}

export function askBaseMessage(dims: DimsMm): string {
  return [
    `Great — a ${dimsToCm(dims)} box. Pick a base:`,
    '1) No base',
    '2) Clear acrylic base',
    '3) Black acrylic base',
    '4) LED base',
    '',
    'Reply with a number (or type none/clear/black/led).',
  ].join('\n')
}

export function repromptBaseMessage(): string {
  return 'Please reply with 1, 2, 3, or 4 to pick a base (or type none/clear/black/led).'
}

export function editAfterDeclineMessage(): string {
  return 'No problem — send me the box dimensions directly, e.g. 30x20x25cm.'
}

export function quotedMessage(priceCents: number, quoteId: string, siteUrl: string): string {
  return [
    `💰 Estimated price: ${formatPrice(priceCents)}`,
    '',
    'Complete your order here (this price is held for 72 hours):',
    `${siteUrl}/checkout?quote=${quoteId}`,
    '',
    'Want a different box? Just send new dimensions or a set number.',
  ].join('\n')
}

export function lookupFailedMessage(setId: string): string {
  return `I couldn't look up set ${setId} — you can still send me dimensions directly, e.g. 30x20x25cm.`
}
