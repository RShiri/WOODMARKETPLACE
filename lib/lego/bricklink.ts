import { createHmac, randomBytes } from 'node:crypto'

export interface BrickLinkResult {
  name: string
  lengthMm: number
  widthMm: number
  heightMm: number
  imageUrl: string | null
  yearReleased: number | null
}

const BRICKLINK_ITEM_URL = 'https://api.bricklink.com/api/store/v1/items/SET'
const REQUEST_TIMEOUT_MS = 5000

interface BrickLinkCredentials {
  consumerKey: string
  consumerSecret: string
  tokenValue: string
  tokenSecret: string
}

function readCredentials(): BrickLinkCredentials | null {
  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET
  const tokenValue = process.env.BRICKLINK_TOKEN_VALUE
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET
  if (!consumerKey || !consumerSecret || !tokenValue || !tokenSecret) return null
  return { consumerKey, consumerSecret, tokenValue, tokenSecret }
}

/**
 * RFC 3986 percent-encoding. encodeURIComponent leaves !*'() alone but OAuth
 * 1.0a requires them escaped, and an unescaped one silently breaks the
 * signature rather than erroring.
 */
function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

/**
 * Builds an OAuth 1.0a (HMAC-SHA1, one-legged) Authorization header.
 * BrickLink issues a fixed consumer/token pair per store rather than running
 * a real request-token dance, so there is no callback or verifier step — the
 * four credentials are all long-lived and just need to be signed with.
 */
function authorizationHeader(
  method: string,
  url: string,
  credentials: BrickLinkCredentials
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.tokenValue,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_version: '1.0',
  }

  // Signature base string: METHOD&url&sorted-encoded-params, each part
  // percent-encoded once more as a whole.
  const normalized = Object.keys(oauthParams)
    .sort()
    .map((key) => `${rfc3986(key)}=${rfc3986(oauthParams[key])}`)
    .join('&')
  const baseString = [method.toUpperCase(), rfc3986(url), rfc3986(normalized)].join('&')
  const signingKey = `${rfc3986(credentials.consumerSecret)}&${rfc3986(credentials.tokenSecret)}`
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64')

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature }
  const rendered = Object.keys(headerParams)
    .sort()
    .map((key) => `${rfc3986(key)}="${rfc3986(headerParams[key])}"`)
    .join(', ')
  return `OAuth ${rendered}`
}

function parseCm(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const parsed = Number.parseFloat(String(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

/**
 * Best-effort BrickLink catalog lookup for a set's recorded dimensions.
 *
 * IMPORTANT — what these dimensions actually are: BrickLink's dim_x/y/z are
 * the *retail packaging* measurements (the sealed box), not the assembled
 * model. They are a proxy, and usually a loose one: a carton is wider and far
 * flatter than the build that comes out of it. That is why this tier sits
 * BELOW Brickset (which records genuine built-model dimensions) in the
 * resolver, and why anything sourced here is cached with
 * `confidence: 'estimated'` so the calculator badges it as an estimate the
 * customer should check.
 *
 * The three values are sorted largest-to-smallest onto length/width/height
 * because BrickLink does not define which axis is which, and the calculator's
 * hood is built as an L x W footprint with H upright.
 *
 * Returns null on any failure — missing credentials, network error, unknown
 * set, or a set with no dimensions recorded — so the resolver falls through
 * to the next tier without special-casing this integration.
 */
export async function fetchFromBrickLink(setId: string): Promise<BrickLinkResult | null> {
  const credentials = readCredentials()
  if (!credentials) return null

  const url = `${BRICKLINK_ITEM_URL}/${encodeURIComponent(setId)}`

  try {
    const response = await fetch(url, {
      headers: { Authorization: authorizationHeader('GET', url, credentials) },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      meta?: { code?: number }
      data?: {
        name?: string
        image_url?: string
        dim_x?: string | number
        dim_y?: string | number
        dim_z?: string | number
        year_released?: number
      }
    }

    if (payload.meta?.code !== 200 || !payload.data) return null

    const dims = [payload.data.dim_x, payload.data.dim_y, payload.data.dim_z].map(parseCm)
    if (dims.some((d) => d === null)) return null

    // Descending, so the longest span becomes the case length.
    const [a, b, c] = (dims as number[]).sort((x, y) => y - x)

    // BrickLink reports centimetres; image_url is protocol-relative.
    const imageUrl = payload.data.image_url
      ? payload.data.image_url.startsWith('//')
        ? `https:${payload.data.image_url}`
        : payload.data.image_url
      : null

    return {
      name: payload.data.name ?? setId,
      lengthMm: Math.round(a * 10),
      widthMm: Math.round(b * 10),
      heightMm: Math.round(c * 10),
      imageUrl,
      yearReleased: payload.data.year_released ?? null,
    }
  } catch {
    return null
  }
}
