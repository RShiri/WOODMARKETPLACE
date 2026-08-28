import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_SUPPORT_WHATSAPP, supportRequestHref } from './support'

const ORIGINAL = { ...process.env }

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP
  delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL
})
afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe('supportRequestHref', () => {
  it('routes to the shop WhatsApp number by default', () => {
    expect(supportRequestHref('hello')).toBe(
      `https://wa.me/${DEFAULT_SUPPORT_WHATSAPP}?text=hello`
    )
  })

  it('strips punctuation from a configured number', () => {
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP = '+972 52-629-9701'
    expect(supportRequestHref('hi')).toBe('https://wa.me/972526299701?text=hi')
  })

  it('url-encodes the prefilled message, including Hebrew', () => {
    const href = supportRequestHref('120 x 40 ס״מ')
    expect(href).toContain('?text=')
    expect(href).not.toContain(' ')
    expect(decodeURIComponent(href!.split('?text=')[1])).toBe('120 x 40 ס״מ')
  })

  it('treats an explicitly empty value as an opt-out and falls back to email', () => {
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP = ''
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'shop@example.com'
    const href = supportRequestHref('hi')
    expect(href).toMatch(/^mailto:shop@example\.com\?subject=/)
  })

  it('returns null only when WhatsApp is opted out and no email is set', () => {
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP = ''
    expect(supportRequestHref('hi')).toBeNull()
  })
})
