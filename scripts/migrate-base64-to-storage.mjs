// One-off cleanup: rewrites base64 data-URL images that were embedded directly
// in `products.data` and `submissions.items`/`payment_slip` into Supabase
// Storage uploads, replacing them with short public URLs. Also trims
// `submissions.items[].productImages` down to a single cover image, since
// only the first image is ever displayed for a cart line.
//
// This does NOT change how anything looks — same images, same order history —
// it just stops storing multi-megabyte text blobs in database rows.
//
// Usage (run from the project root, in your own terminal — never paste your
// service_role key into chat or commit it anywhere):
//
//   1. Add one line to your local .env.local (already gitignored, never committed):
//        SUPABASE_SERVICE_ROLE_KEY=xxxx
//      (find it in Supabase Dashboard -> Settings -> API -> "service_role" secret)
//   2. node scripts/migrate-base64-to-storage.mjs --dry-run
//   3. node scripts/migrate-base64-to-storage.mjs
//   4. Remove the line from .env.local again once you're done — it bypasses RLS
//      entirely, so it shouldn't sit around longer than it needs to.
//
// (Plain `node` doesn't auto-load .env.local the way `next dev` does, so this
// script reads it itself — see loadEnvLocal() below.)

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

function loadEnvLocal() {
  const dir = dirname(fileURLToPath(import.meta.url))
  const path = join(dir, '..', '.env.local')
  let text
  try { text = readFileSync(path, 'utf8') } catch { return }
  for (const line of text.split('\n')) {
    const m = /^\s*([\w.-]+)\s*=\s*(.*)\s*$/.exec(line)
    if (!m) continue
    const [, key, rawVal] = m
    const val = rawVal.replace(/^['"]|['"]$/g, '')
    if (process.env[key] === undefined) process.env[key] = val
  }
}
loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dryRun = process.argv.includes('--dry-run')

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Add SUPABASE_SERVICE_ROLE_KEY=... to .env.local (get it from Supabase Dashboard -> Settings -> API -> "service_role" secret), then run this again.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

function parseDataUrl(dataUrl) {
  const m = /^data:(.+?);base64,(.+)$/.exec(dataUrl)
  if (!m) return null
  return { contentType: m[1], buffer: Buffer.from(m[2], 'base64') }
}

async function uploadBase64(dataUrl) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return null
  const ext = parsed.contentType.split('/')[1] || 'jpg'
  const filename = `${randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('uploads').upload(filename, parsed.buffer, { contentType: parsed.contentType })
  if (error) { console.error(`  upload failed: ${error.message}`); return null }
  const { data } = supabase.storage.from('uploads').getPublicUrl(filename)
  return data.publicUrl
}

async function migrateProducts() {
  const { data: rows, error } = await supabase.from('products').select('id, data')
  if (error) throw error
  let before = 0, after = 0, touched = 0

  for (const row of rows) {
    const p = row.data
    before += JSON.stringify(p).length
    let changed = false

    if (Array.isArray(p.images)) {
      for (let i = 0; i < p.images.length; i++) {
        if (typeof p.images[i] === 'string' && p.images[i].startsWith('data:')) {
          const uploaded = await uploadBase64(p.images[i])
          if (uploaded) { p.images[i] = uploaded; changed = true }
        }
      }
    }
    for (const v of p.variants || []) {
      for (const opt of v.options || []) {
        if (typeof opt.image === 'string' && opt.image.startsWith('data:')) {
          const uploaded = await uploadBase64(opt.image)
          if (uploaded) { opt.image = uploaded; changed = true }
        }
      }
    }

    after += JSON.stringify(p).length
    if (changed) {
      touched++
      console.log(`[products] ${p.name || row.id}${dryRun ? ' (dry run, not saved)' : ''}`)
      if (!dryRun) {
        const { error: updErr } = await supabase.from('products').update({ data: p }).eq('id', row.id)
        if (updErr) console.error(`  update failed: ${updErr.message}`)
      }
    }
  }
  console.log(`products: ${touched}/${rows.length} rows touched, ~${Math.round(before / 1024)}KB -> ~${Math.round(after / 1024)}KB\n`)
}

async function migrateSubmissions() {
  const { data: rows, error } = await supabase.from('submissions').select('id, items, payment_slip')
  if (error) throw error
  let before = 0, after = 0, touched = 0

  for (const row of rows) {
    const items = row.items || []
    before += JSON.stringify(items).length + (row.payment_slip?.length || 0)
    let changed = false

    for (const item of items) {
      if (Array.isArray(item.productImages) && item.productImages.length > 1) {
        item.productImages = item.productImages.slice(0, 1)
        changed = true
      }
      if (typeof item.productImages?.[0] === 'string' && item.productImages[0].startsWith('data:')) {
        const uploaded = await uploadBase64(item.productImages[0])
        if (uploaded) { item.productImages[0] = uploaded; changed = true }
      }
    }

    let slip = row.payment_slip
    if (typeof slip === 'string' && slip.startsWith('data:')) {
      const uploaded = await uploadBase64(slip)
      if (uploaded) { slip = uploaded; changed = true }
    }

    after += JSON.stringify(items).length + (slip?.length || 0)
    if (changed) {
      touched++
      console.log(`[submissions] ${row.id}${dryRun ? ' (dry run, not saved)' : ''}`)
      if (!dryRun) {
        const { error: updErr } = await supabase.from('submissions').update({ items, payment_slip: slip }).eq('id', row.id)
        if (updErr) console.error(`  update failed: ${updErr.message}`)
      }
    }
  }
  console.log(`submissions: ${touched}/${rows.length} rows touched, ~${Math.round(before / 1024)}KB -> ~${Math.round(after / 1024)}KB\n`)
}

async function main() {
  console.log(dryRun ? 'DRY RUN — previewing only, no writes will be made\n' : 'LIVE RUN — this will modify products and submissions\n')
  await migrateProducts()
  await migrateSubmissions()
  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
