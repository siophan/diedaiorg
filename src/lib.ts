import type { Context } from 'hono'

export type Bindings = { DB: D1Database; R2: R2Bucket }
export type Env = { Bindings: Bindings; Variables: { admin?: any } }

/* ---------- HTML helpers ---------- */
export const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export const nl2p = (s: string) =>
  String(s || '')
    .split(/\n+/)
    .filter((x) => x.trim())
    .map((x) => `<p>${esc(x)}</p>`)
    .join('')

export const fmtDate = (d?: string) => (d ? String(d).slice(0, 10) : '')

/* ---------- Settings ---------- */
export async function getSettings(db: D1Database): Promise<Record<string, any>> {
  const { results } = await db.prepare('SELECT key, value FROM settings').all<any>()
  const out: Record<string, any> = {}
  for (const r of results || []) {
    try { out[r.key] = JSON.parse(r.value) } catch { out[r.key] = r.value }
  }
  return out
}

/* ---------- Crypto ---------- */
const enc = new TextEncoder()
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export function randomHex(bytes = 16) {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 },
    key,
    256
  )
  return toHex(bits)
}

export function makeCode(prefix: string) {
  const d = new Date()
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  return `${prefix}${ymd}${randomHex(3).toUpperCase()}`
}

export function getCookie(c: Context, name: string) {
  const raw = c.req.header('cookie') || ''
  const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[1]) : ''
}

/* ---------- Validation ---------- */
export const isPhone = (s: string) => /^[0-9+\-\s]{6,20}$/.test(s || '')
export const isEmail = (s: string) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
export const clip = (s: any, n = 2000) => (s == null ? null : String(s).slice(0, n))

/* ---------- Media URL ---------- */
export const img = (src?: string, fallback = '/static/img/brand/star-256.png') => (src && String(src).trim() ? src : fallback)
