import { describe, expect, it } from 'vitest'

import { detectLocale, parseBaseChoice, parseDimensions, parseSetIdToken, parseYesNo } from './parser'

describe('parseDimensions', () => {
  it('parses a plain triple as centimeters by default', () => {
    expect(parseDimensions('30x20x25')).toEqual({ lengthMm: 300, widthMm: 200, heightMm: 250 })
  })

  it('parses with spaces and an explicit cm unit', () => {
    expect(parseDimensions('30 x 20 x 25 cm')).toEqual({
      lengthMm: 300,
      widthMm: 200,
      heightMm: 250,
    })
  })

  it('treats values as millimeters when explicitly labeled mm', () => {
    expect(parseDimensions('300x200x250mm')).toEqual({
      lengthMm: 300,
      widthMm: 200,
      heightMm: 250,
    })
  })

  it('treats values as millimeters when every value exceeds 120 and no unit is given', () => {
    expect(parseDimensions('150x150x150')).toEqual({
      lengthMm: 150,
      widthMm: 150,
      heightMm: 150,
    })
  })

  it('an explicit cm unit overrides the >120 millimeter heuristic', () => {
    expect(parseDimensions('300x200x250 cm')).toEqual({
      lengthMm: 3000,
      widthMm: 2000,
      heightMm: 2500,
    })
  })

  it('parses labeled L/W/H axes', () => {
    expect(parseDimensions('L30 W20 H25')).toEqual({ lengthMm: 300, widthMm: 200, heightMm: 250 })
  })

  it('parses labeled axes with colons and commas', () => {
    expect(parseDimensions('l:30, w:20, h:25')).toEqual({
      lengthMm: 300,
      widthMm: 200,
      heightMm: 250,
    })
  })

  it('returns null for unparseable text', () => {
    expect(parseDimensions('hello there')).toBeNull()
  })

  it('returns null when only two numbers are given', () => {
    expect(parseDimensions('30x20')).toBeNull()
  })

  it('recognizes the Hebrew cm unit (ס״מ)', () => {
    expect(parseDimensions('30x20x25 ס״מ')).toEqual({ lengthMm: 300, widthMm: 200, heightMm: 250 })
  })

  it('recognizes the Hebrew mm unit (מ״מ), including a plain-quote fallback', () => {
    expect(parseDimensions('300x200x250 מ״מ')).toEqual({ lengthMm: 300, widthMm: 200, heightMm: 250 })
    expect(parseDimensions('300x200x250 מ"מ')).toEqual({ lengthMm: 300, widthMm: 200, heightMm: 250 })
  })
})

describe('parseSetIdToken', () => {
  it('finds a bare set number', () => {
    expect(parseSetIdToken('10294')).toBe('10294-1')
  })

  it('finds a set number embedded in a sentence', () => {
    expect(parseSetIdToken('I have set 10294 please')).toBe('10294-1')
  })

  it('finds a hashed set number with an explicit variant', () => {
    expect(parseSetIdToken('set #10294-1 thanks')).toBe('10294-1')
  })

  it('returns null when no token looks like a set number', () => {
    expect(parseSetIdToken('hello there')).toBeNull()
  })
})

describe('parseBaseChoice', () => {
  it('accepts numeric shortcuts', () => {
    expect(parseBaseChoice('1')).toBe('none')
    expect(parseBaseChoice('2')).toBe('acrylic_clear')
    expect(parseBaseChoice('3')).toBe('acrylic_black')
    expect(parseBaseChoice('4')).toBe('led')
  })

  it('accepts keywords case-insensitively', () => {
    expect(parseBaseChoice('LED')).toBe('led')
    expect(parseBaseChoice('Black')).toBe('acrylic_black')
  })

  it('accepts Hebrew keywords', () => {
    expect(parseBaseChoice('ללא')).toBe('none')
    expect(parseBaseChoice('שקוף')).toBe('acrylic_clear')
    expect(parseBaseChoice('שחור')).toBe('acrylic_black')
    expect(parseBaseChoice('לד')).toBe('led')
  })

  it('returns null for an unrecognized choice', () => {
    expect(parseBaseChoice('xyz')).toBeNull()
  })
})

describe('parseYesNo', () => {
  it('recognizes affirmative variants', () => {
    expect(parseYesNo('yes')).toBe('yes')
    expect(parseYesNo('Yep')).toBe('yes')
  })
  it('recognizes negative variants', () => {
    expect(parseYesNo('Nope')).toBe('no')
    expect(parseYesNo('edit')).toBe('no')
  })
  it('recognizes Hebrew yes/no', () => {
    expect(parseYesNo('כן')).toBe('yes')
    expect(parseYesNo('לא')).toBe('no')
  })
  it('returns null for ambiguous input', () => {
    expect(parseYesNo('maybe')).toBeNull()
  })
})

describe('detectLocale', () => {
  it('detects Hebrew script', () => {
    expect(detectLocale('שלום', 'en')).toBe('he')
  })
  it('detects Latin script', () => {
    expect(detectLocale('hello', 'he')).toBe('en')
  })
  it('prefers Hebrew when both scripts are present', () => {
    expect(detectLocale('10294 שלום', 'en')).toBe('he')
  })
  it('keeps the previous language for digits-only input', () => {
    expect(detectLocale('10294', 'he')).toBe('he')
    expect(detectLocale('10294', 'en')).toBe('en')
  })
})
