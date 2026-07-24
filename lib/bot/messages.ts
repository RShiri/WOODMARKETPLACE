import { getDictionary } from '@/lib/i18n/dictionaries'
import { tf } from '@/lib/i18n/format'
import type { Locale } from '@/lib/i18n/types'
import { BASE_TYPE_VALUES } from '@/lib/pricing/base-types'
import { formatPrice } from '@/lib/utils/format'

export interface DimsMm {
  lengthMm: number
  widthMm: number
  heightMm: number
}

function dimsToLocalized(dims: DimsMm, locale: Locale): string {
  const unit = getDictionary(locale).common.cm
  return `${dims.lengthMm / 10}×${dims.widthMm / 10}×${dims.heightMm / 10}${unit}`
}

export function greetingMessage(locale: Locale): string {
  return getDictionary(locale).bot.greeting
}

export function helpMessage(locale: Locale): string {
  return getDictionary(locale).bot.help
}

export function confirmSetMessage(
  setName: string | null,
  setId: string,
  confidence: 'exact' | 'estimated',
  dims: DimsMm,
  locale: Locale
): string {
  const dict = getDictionary(locale)
  const confidenceNote = confidence === 'estimated' ? dict.bot.estimatedNote : ''
  return [
    tf(dict.bot.foundSet, { set: setName ?? `#${setId}` }),
    tf(dict.bot.suggestedSize, { dims: dimsToLocalized(dims, locale) }) + confidenceNote,
    '',
    dict.bot.confirmPrompt,
  ].join('\n')
}

export function repromptConfirmMessage(locale: Locale): string {
  return getDictionary(locale).bot.repromptConfirm
}

export function askBaseMessage(dims: DimsMm, locale: Locale): string {
  const dict = getDictionary(locale)
  const options = BASE_TYPE_VALUES.map((value, i) => `${i + 1}) ${dict.baseTypes[value].label}`)
  return [
    tf(dict.bot.chooseBasePrefix, { dims: dimsToLocalized(dims, locale) }),
    ...options,
    '',
    dict.bot.chooseBaseSuffix,
  ].join('\n')
}

export function repromptBaseMessage(locale: Locale): string {
  return getDictionary(locale).bot.repromptBase
}

export function editAfterDeclineMessage(locale: Locale): string {
  return getDictionary(locale).bot.editAfterDecline
}

export function quotedMessage(
  priceCents: number,
  currency: string,
  quoteId: string,
  siteUrl: string,
  locale: Locale
): string {
  const dict = getDictionary(locale)
  return [
    tf(dict.bot.quotedPrice, { price: formatPrice(priceCents, currency) }),
    '',
    dict.bot.quotedLinkIntro,
    `${siteUrl}/checkout?quote=${quoteId}`,
    '',
    dict.bot.quotedFooter,
  ].join('\n')
}

export function lookupFailedMessage(setId: string, locale: Locale): string {
  return tf(getDictionary(locale).bot.lookupFailed, { setId })
}
