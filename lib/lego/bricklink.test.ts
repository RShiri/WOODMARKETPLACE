import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchFromBrickLink } from './bricklink'

const CREDENTIALS = {
  BRICKLINK_CONSUMER_KEY: 'ck',
  BRICKLINK_CONSUMER_SECRET: 'cs',
  BRICKLINK_TOKEN_VALUE: 'tv',
  BRICKLINK_TOKEN_SECRET: 'ts',
}

function setCredentials(values: Partial<typeof CREDENTIALS> = CREDENTIALS) {
  for (const key of Object.keys(CREDENTIALS) as (keyof typeof CREDENTIALS)[]) {
    if (values[key]) process.env[key] = values[key]
    else delete process.env[key]
  }
}

function mockJson(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const OK_PAYLOAD = {
  meta: { code: 200 },
  data: {
    no: '76269-1',
    name: 'Avengers Tower',
    image_url: '//img.bricklink.com/ItemImage/SN/0/76269-1.png',
    // Deliberately out of order and as strings, which is how BrickLink sends them.
    dim_x: '9.40',
    dim_y: '58.00',
    dim_z: '37.80',
    year_released: 2023,
  },
}

beforeEach(() => setCredentials())
afterEach(() => {
  vi.unstubAllGlobals()
  setCredentials()
})

describe('fetchFromBrickLink', () => {
  it('returns null when credentials are incomplete, without calling out', () => {
    setCredentials({ BRICKLINK_CONSUMER_KEY: 'ck' })
    const fetchMock = mockJson(OK_PAYLOAD)
    return fetchFromBrickLink('76269-1').then((result) => {
      expect(result).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it('converts cm to mm and sorts axes longest-first', async () => {
    mockJson(OK_PAYLOAD)
    const result = await fetchFromBrickLink('76269-1')
    expect(result).toEqual({
      name: 'Avengers Tower',
      lengthMm: 580,
      widthMm: 378,
      heightMm: 94,
      imageUrl: 'https://img.bricklink.com/ItemImage/SN/0/76269-1.png',
      yearReleased: 2023,
    })
  })

  it('sends a signed one-legged OAuth 1.0a Authorization header', async () => {
    const fetchMock = mockJson(OK_PAYLOAD)
    await fetchFromBrickLink('76269-1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.bricklink.com/api/store/v1/items/SET/76269-1')
    const header = (init.headers as Record<string, string>).Authorization
    expect(header).toMatch(/^OAuth /)
    for (const param of [
      'oauth_consumer_key="ck"',
      'oauth_token="tv"',
      'oauth_signature_method="HMAC-SHA1"',
      'oauth_version="1.0"',
    ]) {
      expect(header).toContain(param)
    }
    // Signature must be present and percent-encoded (base64 '+' and '=' escaped).
    const signature = /oauth_signature="([^"]+)"/.exec(header)?.[1]
    expect(signature).toBeTruthy()
    expect(signature).not.toContain('+')
    expect(signature).not.toContain('=')
  })

  it('produces a different nonce and signature per call', async () => {
    const fetchMock = mockJson(OK_PAYLOAD)
    await fetchFromBrickLink('76269-1')
    await fetchFromBrickLink('76269-1')
    const headers = fetchMock.mock.calls.map(
      ([, init]) => (init.headers as Record<string, string>).Authorization
    )
    expect(headers[0]).not.toBe(headers[1])
  })

  it('returns null when BrickLink reports a non-200 meta code', async () => {
    mockJson({ meta: { code: 404 }, data: null })
    expect(await fetchFromBrickLink('99999-1')).toBeNull()
  })

  it('returns null when the set has no dimensions on file', async () => {
    mockJson({ meta: { code: 200 }, data: { name: 'Polybag', dim_x: '0', dim_y: '', dim_z: '0' } })
    expect(await fetchFromBrickLink('30000-1')).toBeNull()
  })

  it('returns null rather than throwing when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    expect(await fetchFromBrickLink('76269-1')).toBeNull()
  })
})
