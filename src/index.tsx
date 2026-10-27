import { Hono } from 'hono'
import type { Env } from './lib'
import { getSettings, hashPassword, randomHex, makeCode, getCookie, isPhone, isEmail, clip } from './lib'
import { TABLES, SETTING_KEYS, labelOf, SUB_STATUS } from './schema'
import * as P from './pages'
import { adminShell, loginPage } from './admin'

const app = new Hono<Env>()

/* ======================= 媒体（R2） ======================= */
app.get('/media/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/media\//, ''))
  const obj = await c.env.R2.get(key)
  if (!obj) return c.notFound()
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('etag', obj.httpEtag)
  h.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(obj.body, { headers: h })
})

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
async function putMedia(c: any, data: ArrayBuffer, mime: string, filename: string) {
  const ext = (mime.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace('svg+xml', 'svg')
  const d = new Date()
  const key = `uploads/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${Date.now().toString(36)}-${randomHex(4)}.${ext}`
  await c.env.R2.put(key, data, { httpMetadata: { contentType: mime } })
  await c.env.DB.prepare('INSERT INTO media (key, filename, mime, size) VALUES (?,?,?,?)').bind(key, filename, mime, data.byteLength).run()
  return '/media/' + key
}

/* ======================= 前台页面 ======================= */
app.get('/', async (c) => c.html(await P.homePage(c.env.DB, await getSettings(c.env.DB))))
app.get('/about', async (c) => c.html(await P.aboutPage(c.env.DB, await getSettings(c.env.DB))))
app.get('/news', async (c) => c.html(await P.newsListPage(c.env.DB, await getSettings(c.env.DB), c.req.query('cat') || '', Math.max(1, Number(c.req.query('page')) || 1))))
app.get('/news/:id{[0-9]+}', async (c) => {
  const S = await getSettings(c.env.DB)
  const html = await P.newsDetailPage(c.env.DB, S, Number(c.req.param('id')))
  return html ? c.html(html) : c.html(P.notFoundPage(S), 404)
})
app.get('/editions', async (c) => c.html(await P.editionsPage(c.env.DB, await getSettings(c.env.DB))))
app.get('/editions/:year{[0-9]+}', async (c) => {
  const S = await getSettings(c.env.DB)
  const html = await P.editionDetailPage(c.env.DB, S, Number(c.req.param('year')))
  return html ? c.html(html) : c.html(P.notFoundPage(S), 404)
})
app.get('/works', async (c) => c.html(await P.worksPage(c.env.DB, await getSettings(c.env.DB), c.req.query('edition') || '')))
app.get('/experts', async (c) => c.html(await P.expertsPage(c.env.DB, await getSettings(c.env.DB))))
app.get('/partners', async (c) => c.html(await P.partnersPage(c.env.DB, await getSettings(c.env.DB))))
app.get('/gallery', async (c) => c.html(await P.galleryPage(c.env.DB, await getSettings(c.env.DB), c.req.query('album') || '')))
app.get('/rules', async (c) => c.html(P.rulesPage(await getSettings(c.env.DB))))
app.get('/register', async (c) => c.html(await P.registerPage(c.env.DB, await getSettings(c.env.DB), c.req.query('edition') || '')))
app.get('/submit', async (c) => c.html(await P.submitPage(c.env.DB, await getSettings(c.env.DB), c.req.query('edition') || '')))
app.get('/query', async (c) => c.html(P.queryPage(await getSettings(c.env.DB), c.req.query('code') || '')))
app.get('/contact', async (c) => c.html(P.contactPage(await getSettings(c.env.DB), c.req.query('type') || '')))

/* ======================= 前台 API ======================= */
const api = new Hono<Env>()

api.get('/settings', async (c) => c.json(await getSettings(c.env.DB)))

api.post('/register', async (c) => {
  const b = await c.req.json<any>().catch(() => ({}))
  if (!b.name || !b.phone || !b.school) return c.json({ ok: false, error: '请填写姓名、手机号码与毕业院校' }, 400)
  if (!isPhone(b.phone)) return c.json({ ok: false, error: '手机号码格式不正确' }, 400)
  if (!isEmail(b.email)) return c.json({ ok: false, error: '邮箱格式不正确' }, 400)
  const ed = await c.env.DB.prepare('SELECT id FROM editions WHERE id=? AND registration_open=1').bind(Number(b.edition_id)).first()
  if (!ed) return c.json({ ok: false, error: '该届报名通道未开放' }, 400)
  const dup = await c.env.DB.prepare('SELECT code FROM registrations WHERE edition_id=? AND phone=?').bind(Number(b.edition_id), b.phone).first<any>()
  if (dup) return c.json({ ok: false, error: `该手机号已报名（编号 ${dup.code}），可前往进度查询` }, 400)
  const code = makeCode('REG')
  await c.env.DB.prepare(`INSERT INTO registrations (code,edition_id,name,gender,phone,email,wechat,school,major,degree,grad_year,role,team_size,message) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(code, Number(b.edition_id), clip(b.name, 50), clip(b.gender, 10), clip(b.phone, 30), clip(b.email, 100), clip(b.wechat, 60), clip(b.school, 100), clip(b.major, 100), clip(b.degree, 30), clip(b.grad_year, 10), clip(b.role, 30), Number(b.team_size) || null, clip(b.message, 2000))
    .run()
  return c.json({ ok: true, code })
})

api.post('/submit', async (c) => {
  const b = await c.req.json<any>().catch(() => ({}))
  for (const [k, l] of [['title', '作品名称'], ['genre', '作品类型'], ['school', '所属院校'], ['contact_name', '联系人'], ['phone', '联系电话'], ['synopsis', '作品简介']]) {
    if (!b[k]) return c.json({ ok: false, error: `请填写${l}` }, 400)
  }
  if (!isPhone(b.phone)) return c.json({ ok: false, error: '联系电话格式不正确' }, 400)
  if (!isEmail(b.email)) return c.json({ ok: false, error: '邮箱格式不正确' }, 400)
  if (!b.netdisk_url && !b.video_url) return c.json({ ok: false, error: '请至少提供网盘链接或在线观看链接' }, 400)
  const ed = await c.env.DB.prepare('SELECT id FROM editions WHERE id=? AND submission_open=1').bind(Number(b.edition_id)).first()
  if (!ed) return c.json({ ok: false, error: '该届作品提交通道未开放' }, 400)
  const cnt = await c.env.DB.prepare('SELECT count(*) c FROM submissions WHERE edition_id=? AND school=?').bind(Number(b.edition_id), b.school).first<any>()
  if ((cnt?.c || 0) >= 10) return c.json({ ok: false, error: '该院校本届已提交10部作品（每所院校限选10部）' }, 400)
  const code = makeCode('SUB')
  await c.env.DB.prepare(`INSERT INTO submissions (code,edition_id,title,genre,length_type,duration,school,major,grade,director,crew,contact_name,phone,email,synopsis,poster,video_url,netdisk_url,netdisk_code,teacher) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(code, Number(b.edition_id), clip(b.title, 120), clip(b.genre, 20), clip(b.length_type, 10), clip(b.duration, 30), clip(b.school, 100), clip(b.major, 100), clip(b.grade, 30), clip(b.director, 60), clip(b.crew, 3000), clip(b.contact_name, 50), clip(b.phone, 30), clip(b.email, 100), clip(b.synopsis, 5000), clip(b.poster, 500), clip(b.video_url, 500), clip(b.netdisk_url, 500), clip(b.netdisk_code, 20), clip(b.teacher, 60))
    .run()
  return c.json({ ok: true, code })
})

api.post('/contact', async (c) => {
  const b = await c.req.json<any>().catch(() => ({}))
  if (!b.name || !b.phone || !b.content) return c.json({ ok: false, error: '请填写姓名、电话与留言内容' }, 400)
  await c.env.DB.prepare('INSERT INTO messages (name,phone,email,company,subject,content) VALUES (?,?,?,?,?,?)')
    .bind(clip(b.name, 50), clip(b.phone, 30), clip(b.email, 100), clip(b.company, 100), clip(b.subject, 30), clip(b.content, 3000)).run()
  return c.json({ ok: true })
})

api.get('/query', async (c) => {
  const code = (c.req.query('code') || '').trim().toUpperCase(), phone = (c.req.query('phone') || '').trim()
  if (!code || !phone) return c.json({ ok: false, error: '请输入编号和手机号' })
  if (code.startsWith('REG')) {
    const r = await c.env.DB.prepare('SELECT * FROM registrations WHERE code=? AND phone=?').bind(code, phone).first<any>()
    if (!r) return c.json({ ok: false, error: '未找到匹配的报名记录' })
    return c.json({ ok: true, data: { type: '毕业生报名', code, title: `${r.name} · ${r.school}`, status: { pending: '待审核', approved: '已通过', rejected: '未通过' }[r.status as string] || r.status, created_at: r.created_at, note: r.admin_note } })
  }
  const s = await c.env.DB.prepare('SELECT * FROM submissions WHERE code=? AND phone=?').bind(code, phone).first<any>()
  if (!s) return c.json({ ok: false, error: '未找到匹配的作品记录' })
  return c.json({ ok: true, data: { type: '作品提交', code, title: `《${s.title}》 · ${s.school}`, status: labelOf(SUB_STATUS, s.status), created_at: s.created_at, note: s.admin_note } })
})

// 参赛者上传海报（限制图片、5MB）
api.post('/upload', async (c) => {
  const fd = await c.req.formData()
  const f = fd.get('file') as File | null
  if (!f || typeof f === 'string') return c.json({ ok: false, error: '未选择文件' }, 400)
  if (!ALLOWED.slice(0, 4).includes(f.type)) return c.json({ ok: false, error: '仅支持 JPG/PNG/WEBP/GIF 图片' }, 400)
  if (f.size > 5 * 1024 * 1024) return c.json({ ok: false, error: '图片不能超过 5MB' }, 400)
  const url = await putMedia(c, await f.arrayBuffer(), f.type, f.name)
  return c.json({ ok: true, url })
})

app.route('/api/public', api)

/* ======================= 后台：认证 ======================= */
async function currentAdmin(c: any) {
  const token = getCookie(c, 'dd_admin')
  if (!token) return null
  return await c.env.DB.prepare('SELECT a.id,a.username,a.display_name,a.role FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token=? AND s.expires_at>?')
    .bind(token, Date.now()).first<any>()
}

app.get('/admin/login', async (c) => c.html(loginPage(await getSettings(c.env.DB))))
app.get('/admin', async (c) => {
  const a = await currentAdmin(c)
  if (!a) return c.redirect('/admin/login')
  return c.html(adminShell(await getSettings(c.env.DB), a))
})

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json<any>().catch(() => ({}))
  const a = await c.env.DB.prepare('SELECT * FROM admins WHERE username=?').bind(String(username || '')).first<any>()
  if (!a || (await hashPassword(String(password || ''), a.salt)) !== a.password_hash) return c.json({ ok: false, error: '用户名或密码错误' }, 401)
  const token = randomHex(32)
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
    c.env.DB.prepare('INSERT INTO sessions (token, admin_id, expires_at) VALUES (?,?,?)').bind(token, a.id, Date.now() + 7 * 86400e3),
    c.env.DB.prepare('UPDATE admins SET last_login=CURRENT_TIMESTAMP WHERE id=?').bind(a.id),
  ])
  const secure = new URL(c.req.url).protocol === 'https:' ? '; Secure' : ''
  c.header('Set-Cookie', `dd_admin=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}${secure}`)
  return c.json({ ok: true })
})
app.post('/api/auth/logout', async (c) => {
  const t = getCookie(c, 'dd_admin')
  if (t) await c.env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(t).run()
  c.header('Set-Cookie', 'dd_admin=; Path=/; HttpOnly; Max-Age=0')
  return c.json({ ok: true })
})

/* ======================= 后台 API ======================= */
const adm = new Hono<Env>()
adm.use('*', async (c, next) => {
  const a = await currentAdmin(c)
  if (!a) return c.json({ ok: false, error: '未登录或登录已过期' }, 401)
  c.set('admin', a)
  await next()
})

adm.get('/schema', (c) => c.json({ tables: TABLES, settings: SETTING_KEYS, admin: c.get('admin') }))

adm.get('/dashboard', async (c) => {
  const db = c.env.DB
  const one = (sql: string) => db.prepare(sql).first<any>().then((r) => r?.c || 0)
  const [news, works, partners, gallery, regs, regsNew, subs, subsNew, msgs] = await Promise.all([
    one("SELECT count(*) c FROM news"), one('SELECT count(*) c FROM works'), one('SELECT count(*) c FROM partners'), one('SELECT count(*) c FROM gallery'),
    one('SELECT count(*) c FROM registrations'), one("SELECT count(*) c FROM registrations WHERE status='pending'"),
    one('SELECT count(*) c FROM submissions'), one("SELECT count(*) c FROM submissions WHERE status='pending'"), one("SELECT count(*) c FROM messages WHERE status='new'"),
  ])
  const [recentRegs, recentSubs, bySchool] = await Promise.all([
    db.prepare('SELECT code,name,school,status,created_at FROM registrations ORDER BY id DESC LIMIT 6').all<any>(),
    db.prepare('SELECT code,title,school,status,created_at FROM submissions ORDER BY id DESC LIMIT 6').all<any>(),
    db.prepare('SELECT school, count(*) c FROM submissions GROUP BY school ORDER BY c DESC LIMIT 8').all<any>(),
  ])
  return c.json({ ok: true, stats: { news, works, partners, gallery, regs, regsNew, subs, subsNew, msgs }, recentRegs: recentRegs.results, recentSubs: recentSubs.results, bySchool: bySchool.results })
})

adm.get('/editions-options', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, year, title FROM editions ORDER BY year DESC').all<any>()
  return c.json({ ok: true, data: results })
})

// 通用 CRUD
adm.get('/t/:table', async (c) => {
  const t = TABLES[c.req.param('table')]
  if (!t) return c.json({ ok: false, error: 'unknown table' }, 404)
  const table = c.req.param('table')
  const page = Math.max(1, Number(c.req.query('page')) || 1), size = Math.min(100, Number(c.req.query('size')) || 20)
  const q = (c.req.query('q') || '').trim()
  const where: string[] = [], args: any[] = []
  if (q && t.search.length) { where.push('(' + t.search.map((f) => `${f} LIKE ?`).join(' OR ') + ')'); t.search.forEach(() => args.push(`%${q}%`)) }
  for (const f of t.filters || []) {
    const v = c.req.query(f)
    if (v !== undefined && v !== '') { where.push(`${f}=?`); args.push(v) }
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM ${table} ${w} ORDER BY ${t.order} LIMIT ? OFFSET ?`).bind(...args, size, (page - 1) * size).all<any>(),
    c.env.DB.prepare(`SELECT count(*) c FROM ${table} ${w}`).bind(...args).first<any>(),
  ])
  return c.json({ ok: true, data: rows.results, total: total?.c || 0, page, size })
})

adm.get('/t/:table/:id', async (c) => {
  const table = c.req.param('table')
  if (!TABLES[table]) return c.json({ ok: false }, 404)
  const r = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(Number(c.req.param('id'))).first()
  return r ? c.json({ ok: true, data: r }) : c.json({ ok: false, error: '记录不存在' }, 404)
})

function pickFields(table: string, body: any) {
  const t = TABLES[table]
  const out: Record<string, any> = {}
  for (const f of t.fields) {
    if (f.ro || !(f.k in body)) continue
    let v = body[f.k]
    if (f.t === 'number' || f.t === 'edition') v = v === '' || v == null ? null : Number(v)
    else if (f.t === 'bool') v = v ? 1 : 0
    else v = v == null ? null : String(v)
    out[f.k] = v
  }
  return out
}

adm.post('/t/:table', async (c) => {
  const table = c.req.param('table')
  const t = TABLES[table]
  if (!t) return c.json({ ok: false }, 404)
  const data = pickFields(table, await c.req.json())
  for (const f of t.fields) if (f.req && !f.ro && (data[f.k] == null || data[f.k] === '')) return c.json({ ok: false, error: `请填写：${f.label}` }, 400)
  const cols = Object.keys(data)
  try {
    const r = await c.env.DB.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map((k) => data[k])).run()
    return c.json({ ok: true, id: r.meta.last_row_id })
  } catch (e: any) { return c.json({ ok: false, error: '保存失败：' + (e.message || e) }, 400) }
})

adm.put('/t/:table/:id', async (c) => {
  const table = c.req.param('table')
  if (!TABLES[table]) return c.json({ ok: false }, 404)
  const data = pickFields(table, await c.req.json())
  const cols = Object.keys(data)
  if (!cols.length) return c.json({ ok: true })
  try {
    await c.env.DB.prepare(`UPDATE ${table} SET ${cols.map((k) => `${k}=?`).join(',')} WHERE id=?`).bind(...cols.map((k) => data[k]), Number(c.req.param('id'))).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ ok: false, error: '保存失败：' + (e.message || e) }, 400) }
})

adm.delete('/t/:table/:id', async (c) => {
  const table = c.req.param('table')
  if (!TABLES[table]) return c.json({ ok: false }, 404)
  await c.env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

// 批量更新状态
adm.post('/t/:table/batch', async (c) => {
  const table = c.req.param('table')
  if (!['registrations', 'submissions', 'messages', 'news'].includes(table)) return c.json({ ok: false }, 400)
  const { ids, status, action } = await c.req.json<any>()
  const list = (ids || []).map(Number).filter(Boolean)
  if (!list.length) return c.json({ ok: false, error: '未选择记录' }, 400)
  const ph = list.map(() => '?').join(',')
  if (action === 'delete') await c.env.DB.prepare(`DELETE FROM ${table} WHERE id IN (${ph})`).bind(...list).run()
  else await c.env.DB.prepare(`UPDATE ${table} SET status=? WHERE id IN (${ph})`).bind(String(status), ...list).run()
  return c.json({ ok: true })
})

// CSV 导出
adm.get('/export/:table', async (c) => {
  const table = c.req.param('table')
  const t = TABLES[table]
  if (!t || !['registrations', 'submissions', 'messages'].includes(table)) return c.text('not allowed', 400)
  const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all<any>()
  const eds = await c.env.DB.prepare('SELECT id, year FROM editions').all<any>()
  const edMap: Record<string, string> = {}
  for (const e of eds.results || []) edMap[e.id] = String(e.year)
  const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [t.fields.map((f) => cell(f.label)).join(',')]
  for (const r of results || []) lines.push(t.fields.map((f) => cell(f.t === 'edition' ? edMap[r[f.k]] || '' : f.opts ? labelOf(f.opts, r[f.k]) : r[f.k])).join(','))
  return new Response('\ufeff' + lines.join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${table}-${new Date().toISOString().slice(0, 10)}.csv"` } })
})

// 站点设置
adm.get('/settings', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT key, value, label, updated_at FROM settings').all<any>()
  return c.json({ ok: true, data: results })
})
adm.put('/settings/:key', async (c) => {
  const key = c.req.param('key')
  if (!SETTING_KEYS.find((s) => s[0] === key)) return c.json({ ok: false, error: '未知配置项' }, 400)
  const { value } = await c.req.json<any>()
  const label = SETTING_KEYS.find((s) => s[0] === key)![1]
  await c.env.DB.prepare('INSERT INTO settings (key,value,label,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP')
    .bind(key, JSON.stringify(value), label).run()
  return c.json({ ok: true })
})

// 上传 & 媒体库
adm.post('/upload', async (c) => {
  const fd = await c.req.formData()
  const f = fd.get('file') as File | null
  if (!f || typeof f === 'string') return c.json({ ok: false, error: '未选择文件' }, 400)
  if (!ALLOWED.includes(f.type)) return c.json({ ok: false, error: '仅支持图片文件' }, 400)
  if (f.size > 15 * 1024 * 1024) return c.json({ ok: false, error: '图片不能超过 15MB' }, 400)
  return c.json({ ok: true, url: await putMedia(c, await f.arrayBuffer(), f.type, f.name) })
})
adm.get('/media', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const { results } = await c.env.DB.prepare('SELECT * FROM media ORDER BY id DESC LIMIT 48 OFFSET ?').bind((page - 1) * 48).all<any>()
  return c.json({ ok: true, data: (results || []).map((m: any) => ({ ...m, url: '/media/' + m.key })) })
})
adm.delete('/media/:id', async (c) => {
  const m = await c.env.DB.prepare('SELECT key FROM media WHERE id=?').bind(Number(c.req.param('id'))).first<any>()
  if (m) { await c.env.R2.delete(m.key); await c.env.DB.prepare('DELETE FROM media WHERE id=?').bind(Number(c.req.param('id'))).run() }
  return c.json({ ok: true })
})

// 管理员
adm.get('/admins', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id,username,display_name,role,last_login,created_at FROM admins ORDER BY id').all()
  return c.json({ ok: true, data: results })
})
adm.post('/admins', async (c) => {
  if (c.get('admin').role !== 'super') return c.json({ ok: false, error: '仅超级管理员可操作' }, 403)
  const { username, password, display_name, role } = await c.req.json<any>()
  if (!username || !password || String(password).length < 8) return c.json({ ok: false, error: '用户名必填，密码至少8位' }, 400)
  const salt = randomHex(16)
  try {
    await c.env.DB.prepare('INSERT INTO admins (username,password_hash,salt,display_name,role) VALUES (?,?,?,?,?)').bind(username, await hashPassword(password, salt), salt, display_name || username, role === 'super' ? 'super' : 'editor').run()
  } catch { return c.json({ ok: false, error: '用户名已存在' }, 400) }
  return c.json({ ok: true })
})
adm.delete('/admins/:id', async (c) => {
  const me = c.get('admin')
  if (me.role !== 'super') return c.json({ ok: false, error: '仅超级管理员可操作' }, 403)
  if (Number(c.req.param('id')) === me.id) return c.json({ ok: false, error: '不能删除自己' }, 400)
  await c.env.DB.prepare('DELETE FROM admins WHERE id=?').bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})
adm.post('/password', async (c) => {
  const me = c.get('admin')
  const { old_password, new_password } = await c.req.json<any>()
  const a = await c.env.DB.prepare('SELECT * FROM admins WHERE id=?').bind(me.id).first<any>()
  if ((await hashPassword(String(old_password || ''), a.salt)) !== a.password_hash) return c.json({ ok: false, error: '原密码错误' }, 400)
  if (!new_password || String(new_password).length < 8) return c.json({ ok: false, error: '新密码至少8位' }, 400)
  const salt = randomHex(16)
  await c.env.DB.prepare('UPDATE admins SET password_hash=?, salt=? WHERE id=?').bind(await hashPassword(new_password, salt), salt, me.id).run()
  return c.json({ ok: true })
})

/* ---------- 微信公众号文章一键导入 ---------- */
function decodeEntities(s: string) {
  return s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\\x26/g, '&').replace(/\\x3c/g, '<').replace(/\\x3e/g, '>').replace(/\\x22/g, '"').replace(/\\x27/g, "'")
}
function cleanWechatHtml(body: string) {
  let h = body
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  h = h.replace(/<img[^>]*?data-src="([^"]+)"[^>]*>/gi, (_m, src) => `<figure><img src="${src}" alt=""></figure>`)
  h = h.replace(/<(\/?)(section|span|font|mpprofile|mp-style-type|mp-common-profile|svg|g|rect|path|foreignobject)[^>]*>/gi, '')
  h = h.replace(/<(p|h[1-6]|strong|em|b|i|blockquote|ul|ol|li|br|figure|a)\b[^>]*?(href="[^"]*")?[^>]*>/gi, (_m, tag, href) => `<${tag}${href && tag.toLowerCase() === 'a' ? ' ' + href + ' target="_blank" rel="noopener"' : ''}>`)
  h = h.replace(/<p>\s*(<br>)?\s*<\/p>/gi, '').replace(/\n{2,}/g, '\n')
  return h.trim()
}
adm.post('/import-wechat', async (c) => {
  const { url, category, save_images } = await c.req.json<any>()
  if (!/^https?:\/\/mp\.weixin\.qq\.com\//.test(String(url || ''))) return c.json({ ok: false, error: '请粘贴 mp.weixin.qq.com 开头的公众号文章链接' }, 400)
  const exist = await c.env.DB.prepare('SELECT id FROM news WHERE source_url=?').bind(url).first<any>()
  if (exist) return c.json({ ok: false, error: '该文章已导入过', id: exist.id }, 400)
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' } })
  const html = await res.text()
  const title = decodeEntities((html.match(/var msg_title = '([^']*)'/) || html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || '').trim()
  const m = html.match(/id="js_content"[^>]*>([\s\S]*?)<\/div>\s*(<script|<div class="ct_mpda_wrp"|<div id="js_tags|<section class="article-tag)/)
  if (!title || !m) return c.json({ ok: false, error: '未能解析文章内容（可能需要验证或文章已删除），请稍后重试或手动录入' }, 400)
  const desc = decodeEntities((html.match(/var msg_desc = htmlDecode\("([^"]*)"\)/) || html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || '')
  let cover = decodeEntities((html.match(/var msg_cdn_url = "([^"]+)"/) || html.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || '')
  const ct = Number((html.match(/var ct = "(\d+)"/) || html.match(/create_time\s*[:=]\s*['"]?(\d{10})/) || [])[1] || 0)
  const account = decodeEntities((html.match(/var nickname = htmlDecode\("([^"]*)"\)/) || [])[1] || '')
  let content = cleanWechatHtml(m[1])

  // 微信图片有防盗链：下载并转存到 R2
  let saved = 0
  if (save_images !== false) {
    const urls = [...new Set([...content.matchAll(/<img src="(https?:\/\/mmbiz[^"]+)"/g)].map((x) => x[1]))].slice(0, 40)
    const fetchImg = async (u: string) => {
      try {
        const r = await fetch(decodeEntities(u), { headers: { 'User-Agent': UA, Referer: 'https://mp.weixin.qq.com/' } })
        if (!r.ok) return null
        const mime = (r.headers.get('content-type') || 'image/jpeg').split(';')[0]
        if (!mime.startsWith('image/')) return null
        return await putMedia(c, await r.arrayBuffer(), mime, 'wechat')
      } catch { return null }
    }
    for (const u of urls) {
      const local = await fetchImg(u)
      if (local) { content = content.split(u).join(local); saved++ }
    }
    if (cover) { const lc = await fetchImg(cover); if (lc) cover = lc }
  }
  const summary = desc || content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)
  const pub = ct ? new Date(ct * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  const r = await c.env.DB.prepare(`INSERT INTO news (title,summary,content,cover,category,source,source_url,author,published_at,status) VALUES (?,?,?,?,?,?,?,?,?,'published')`)
    .bind(title, summary, content, cover, category || 'wechat', (account || '迭代盛典') + ' 微信公众号', url, account || '迭代盛典', pub).run()
  return c.json({ ok: true, id: r.meta.last_row_id, title, images: saved })
})

app.route('/api/admin', adm)

/* ======================= 404 ======================= */
app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ ok: false, error: 'Not Found' }, 404)
  return c.html(P.notFoundPage(await getSettings(c.env.DB)), 404)
})
app.onError((err, c) => {
  console.error(err)
  if (c.req.path.startsWith('/api/')) return c.json({ ok: false, error: '服务器错误：' + err.message }, 500)
  return c.text('服务器错误：' + err.message, 500)
})

export default app
