#!/usr/bin/env node
/**
 * Diagnoses why the calculator can't price a box.
 *
 * Every failure mode between "no .env.local" and "database reachable but the
 * schema is behind" surfaces in the UI as the same opaque line — "Could not
 * calculate a price. Please try again. (pricing_config query failed:
 * TypeError: fetch failed)". This walks the same path the app takes, stops at
 * the first thing that's actually broken, and prints the command that fixes
 * that specific thing.
 *
 * Read-only: it never writes to the database or to any env file.
 *
 * Usage: npm run doctor
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const ENV_FILES = ['.env.local', '.env']
const TIMEOUT_MS = 8000

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`)
const info = (m) => console.log(`    ${m}`)

function fail(headline, ...fixLines) {
  bad(headline)
  console.log('')
  console.log('\x1b[1mHow to fix:\x1b[0m')
  for (const line of fixLines) console.log(`  ${line}`)
  console.log('')
  process.exit(1)
}

/** Minimal dotenv parse — avoids depending on how Next happens to load env. */
function parseEnv(text) {
  const out = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

async function loadEnv() {
  for (const file of ENV_FILES) {
    try {
      const text = await readFile(path.join(ROOT, file), 'utf8')
      return { file, env: { ...parseEnv(text), ...process.env } }
    } catch {
      /* try the next candidate */
    }
  }
  return { file: null, env: process.env }
}

async function request(url, headers) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return { response: await fetch(url, { headers, signal: controller.signal }) }
  } catch (error) {
    return { error }
  } finally {
    clearTimeout(timer)
  }
}

console.log('\n\x1b[1mBrickCase pricing doctor\x1b[0m\n')

// ---------------------------------------------------------------- env file
const { file, env } = await loadEnv()
if (!file) {
  fail(
    `No ${ENV_FILES.join(' or ')} found in ${ROOT}`,
    'cp .env.example .env.local',
    'then fill in your Supabase URL and keys (Dashboard > Project Settings > API).'
  )
}
ok(`Found ${file}`)

const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

const missing = [
  !url && 'NEXT_PUBLIC_SUPABASE_URL',
  !anonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
].filter(Boolean)

if (missing.length) {
  fail(
    `Missing in ${file}: ${missing.join(', ')}`,
    'Supabase Dashboard > Project Settings > API has all three.',
    'SUPABASE_SERVICE_ROLE_KEY is the "service_role" secret — server-side only, never NEXT_PUBLIC_.'
  )
}
ok('Supabase URL and both keys are set')

const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)/.test(url)
info(`${url}  (${isLocal ? 'local Supabase' : 'hosted project'})`)

// ------------------------------------------------------------ reachability
const { response: restResponse, error: restError } = await request(`${url}/rest/v1/`, {
  apikey: anonKey,
})

if (restError) {
  const reason = restError.name === 'AbortError' ? `no answer in ${TIMEOUT_MS}ms` : restError.message
  bad(`Cannot reach ${url} (${reason})`)
  console.log('')
  console.log('\x1b[1mHow to fix:\x1b[0m')
  if (isLocal) {
    console.log('  Your local Supabase stack is not running. Start it:')
    console.log('')
    console.log('    supabase start')
    console.log('    supabase db reset      # applies every migration + seed.sql')
    console.log('')
    console.log('  (Install the CLI first if needed: https://supabase.com/docs/guides/cli)')
  } else {
    console.log('  This is almost always a PAUSED project. Free-tier Supabase projects')
    console.log('  pause after about a week idle, and produce exactly this error.')
    console.log('')
    console.log('    1. Open https://supabase.com/dashboard')
    console.log('    2. Select this project. If it shows "Paused", click Restore.')
    console.log('    3. Wait ~2 minutes for it to come back, then re-run: npm run doctor')
    console.log('')
    console.log('  If it is NOT paused, check the URL above for a typo against')
    console.log('  Project Settings > API > Project URL.')
  }
  console.log('')
  process.exit(1)
}

if (restResponse.status === 401) {
  fail(
    `Reached ${url}, but it rejected the anon key (401)`,
    'The URL is fine — the key is wrong or belongs to a different project.',
    'Re-copy both keys from Project Settings > API.'
  )
}
ok(`Reachable — REST API answered ${restResponse.status}`)

// -------------------------------------------------------------- config row
const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
const { response: configResponse, error: configError } = await request(
  `${url}/rest/v1/pricing_config?id=eq.1&select=*`,
  authHeaders
)

if (configError) {
  fail(`pricing_config query failed: ${configError.message}`, 'Re-run: npm run doctor')
}

if (configResponse.status === 401 || configResponse.status === 403) {
  fail(
    `The service role key was rejected (${configResponse.status})`,
    'SUPABASE_SERVICE_ROLE_KEY must be the "service_role" secret, not the anon key.',
    'Project Settings > API > Project API keys > service_role.'
  )
}

if (configResponse.status === 404) {
  fail(
    'The pricing_config table does not exist — migrations have never been applied',
    'supabase db push        # hosted',
    'supabase db reset       # local (also runs seed.sql)',
    'then seed: psql "$SUPABASE_DB_URL" -f supabase/seed.sql'
  )
}

const rows = await configResponse.json().catch(() => null)
if (!Array.isArray(rows) || rows.length === 0) {
  fail(
    'pricing_config exists but has no row — the database was migrated but never seeded',
    'psql "$SUPABASE_DB_URL" -f supabase/seed.sql',
    '(or: supabase db reset, which applies migrations and seed together)'
  )
}
ok('pricing_config row found')

const config = rows[0]
if (config.oversize_threshold_mm == null) {
  fail(
    'pricing_config is missing oversize_threshold_mm — migration 0010 has not been applied',
    'supabase db push        # hosted',
    'supabase db reset       # local',
    '',
    'Without it, oversized boxes silently lose their freight flag and structural',
    'warning, and 6mm quotes fail on a missing material rate.'
  )
}
ok(`Size policy: oversize above ${config.oversize_threshold_mm}mm, ceiling ${config.max_dim_mm}mm`)

// ----------------------------------------------------------- material rates
const { response: ratesResponse } = await request(
  `${url}/rest/v1/material_costs?active=eq.true&select=material,thickness_mm`,
  authHeaders
)
const rates = (await ratesResponse?.json().catch(() => null)) ?? []

if (!Array.isArray(rates) || rates.length === 0) {
  fail(
    'material_costs is empty — every quote will fail on a missing rate',
    'psql "$SUPABASE_DB_URL" -f supabase/seed.sql'
  )
}

const thicknesses = [...new Set(rates.map((r) => r.thickness_mm))].sort((a, b) => a - b)
ok(`material_costs: ${rates.length} active rates, thicknesses ${thicknesses.join('/')}mm`)

if (!thicknesses.includes(6)) {
  fail(
    'No 6mm rates — boxes over 1000mm will fail with "No active material rate"',
    'Re-run the seed to pick up the 6mm rows:',
    'psql "$SUPABASE_DB_URL" -f supabase/seed.sql'
  )
}

console.log('\n\x1b[32m\x1b[1mAll checks passed.\x1b[0m The calculator should price boxes normally.\n')
