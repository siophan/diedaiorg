import { esc, fmtDate, img } from './lib'
import { layout, pageHero, secHead } from './layout'
import { labelOf, NEWS_CAT, ED_STATUS, GENRES } from './schema'

type S = Record<string, any>
const statusPill = (s: string) => `<span class="status-pill st-${esc(s)}"><i class="fa-solid fa-circle" style="font-size:7px"></i>${esc(labelOf(ED_STATUS, s))}</span>`

/* ---------------- 组件 ---------------- */
export function logoTile(p: any) {
  const name = p.short_name || p.name
  const inner = p.logo
    ? `<img src="${esc(p.logo)}" alt="${esc(p.name)}" loading="lazy">`
    : `<div class="mono">${esc((name || '迭').slice(0, 1))}</div><span>${esc(p.name)}</span>`
  const tag = p.url ? `a href="${esc(p.url)}" target="_blank" rel="noopener"` : 'div'
  return `<${tag} class="logo-tile ${p.logo ? '' : 'text'}" title="${esc(p.name)}">${inner}</${p.url ? 'a' : 'div'}>`
}

export function workCard(w: any) {
  return `<a class="work reveal" href="${esc(w.poster)}" data-lightbox="works" data-cap="《${esc(w.title)}》${w.school ? ' · ' + esc(w.school) : ''}${w.award ? ' · ' + esc(w.award) : ''}">
    <img src="${esc(img(w.poster))}" alt="${esc(w.title)}" loading="lazy">
    ${w.award && w.award !== '获奖作品' ? `<span class="award-badge"><i class="fa-solid fa-trophy"></i> ${esc(w.award)}</span>` : ''}
    <div class="info"><h4>${esc(w.title)}</h4><p>${esc(w.school || w.en_title || '')}</p></div></a>`
}

export function newsCard(n: any) {
  return `<a class="card news-card reveal" href="/news/${n.id}">
    <div class="thumb"><img src="${esc(img(n.cover, '/static/img/brand/bg-space.jpg'))}" alt="" loading="lazy"></div>
    <div class="body"><div class="news-meta"><span class="tag ${n.category === 'wechat' ? 'blue' : ''}">${n.category === 'wechat' ? '<i class="fa-brands fa-weixin"></i> ' : ''}${esc(labelOf(NEWS_CAT, n.category))}</span><span>${esc(fmtDate(n.published_at))}</span></div>
    <h3>${esc(n.title)}</h3><p>${esc(n.summary || '')}</p></div></a>`
}

function personCard(p: any, wide = false) {
  const av = p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="ph">${esc(p.name.slice(0, 1))}</div>`
  return `<div class="card person ${wide ? 'wide' : ''} reveal"><div class="avatar">${av}</div><div><h3 class="gold-text">${esc(p.name)}</h3><div class="ptitle">${esc(p.title || '')}</div><p>${esc(p.bio || '')}</p></div></div>`
}

/* ---------------- 首页 ---------------- */
export async function homePage(db: D1Database, St: S) {
  const [cur, works, news, founders, partners, gallery, editions] = await Promise.all([
    db.prepare('SELECT * FROM editions WHERE registration_open=1 OR submission_open=1 ORDER BY year DESC LIMIT 1').first<any>(),
    db.prepare('SELECT * FROM works ORDER BY featured DESC, sort ASC LIMIT 10').all<any>(),
    db.prepare("SELECT id,title,summary,cover,category,published_at FROM news WHERE status='published' ORDER BY featured DESC, published_at DESC LIMIT 4").all<any>(),
    db.prepare("SELECT * FROM people WHERE category='founder' AND visible=1 ORDER BY sort LIMIT 4").all<any>(),
    db.prepare("SELECT * FROM partners WHERE visible=1 AND category IN ('school','org') ORDER BY sort").all<any>(),
    db.prepare('SELECT * FROM gallery WHERE visible=1 ORDER BY sort LIMIT 8').all<any>(),
    db.prepare('SELECT * FROM editions ORDER BY year DESC').all<any>(),
  ])
  const h = St.hero || {}, ab = St.about || {}
  const stats = (St.stats || []).map((s: any) => `<div class="stat"><div class="num gold-text"><span data-count="${esc(s.num)}">${esc(s.num)}</span><small>${esc(s.unit)}</small></div><div class="lbl">${esc(s.label)}</div></div>`).join('')
  const deadline = cur?.submission_open && cur?.submission_deadline ? cur.submission_deadline : ''
  const n = news.results || []
  const pList = partners.results || []

  const body = `
<section class="hero" id="hero">
  <div class="hero-bg" style="background-image:url('${esc(h.background || '/static/img/brand/bg-space.jpg')}')"></div>
  <div class="hero-inner">
    ${h.notice ? `<a class="hero-notice" href="/news"><span class="dot"></span>${esc(h.notice)} <i class="fa-solid fa-arrow-right"></i></a>` : ''}
    <img class="hero-logo" src="${esc(St.site?.logo || '/static/img/brand/logo-full.png')}" alt="迭代盛典 影视专业毕业生作品颁奖盛典">
    <div class="hero-year gold-text">${esc(h.year || '')}</div>
    <div class="hero-tag gold-text">${esc(h.tagline || '')}</div>
    <p class="hero-intro">${esc(h.intro || '')}</p>
    <div class="hero-actions">
      <a class="btn btn-gold btn-lg" href="${esc(h.primary_link || '/register')}"><i class="fa-solid fa-user-plus"></i>${esc(h.primary_text || '立即报名')}</a>
      <a class="btn btn-line btn-lg" href="${esc(h.secondary_link || '/submit')}"><i class="fa-solid fa-cloud-arrow-up"></i>${esc(h.secondary_text || '提交作品')}</a>
    </div>
    ${deadline ? `<div class="countdown" id="countdown" data-end="${esc(deadline)}"><div><b class="gold-text" data-d>0</b><span>天</span></div><div><b class="gold-text" data-h>00</b><span>时</span></div><div><b class="gold-text" data-m>00</b><span>分</span></div><div><b class="gold-text" data-s>00</b><span>秒</span></div></div><div style="margin-top:10px;font-size:13px;color:var(--muted);letter-spacing:2px">距 ${esc(cur.title)} 作品征集截止</div>` : ''}
  </div>
  <div class="scroll-hint">SCROLL <i class="fa-solid fa-angles-down"></i></div>
</section>

<section class="section" id="stats-section" style="padding-top:20px"><div class="container"><div class="stats reveal">${stats}</div></div></section>

<section class="section" id="entry-section" style="padding-top:30px">
  <div class="container">
    ${secHead('参赛通道', 'Entrance', cur ? `${cur.title} · ${cur.theme || ''} 现已开放` : '')}
    <div class="entry-grid">
      <a class="entry reveal" href="/register" id="entry-register"><img class="bg-star" src="/static/img/brand/star-256.png" alt=""><div class="ico"><i class="fa-solid fa-user-graduate"></i></div><h3>毕业生报名</h3><p>面向全国高校影视专业应届毕业生，登记个人及主创团队信息，加入迭代影视专业人才库。</p><span class="go">立即报名 <i class="fa-solid fa-arrow-right"></i></span></a>
      <a class="entry reveal" href="/submit" id="entry-submit"><img class="bg-star" src="/static/img/brand/star-256.png" alt=""><div class="ico"><i class="fa-solid fa-film"></i></div><h3>作品提交</h3><p>剧情片 / 纪录片 / 动画片，短片45分钟、长片90分钟以内，在线登记作品信息与网盘链接。</p><span class="go">提交作品 <i class="fa-solid fa-arrow-right"></i></span></a>
      <a class="entry reveal" href="/rules" id="entry-rules"><img class="bg-star" src="/static/img/brand/star-256.png" alt=""><div class="ico"><i class="fa-solid fa-scroll"></i></div><h3>征集规则</h3><p>了解作品要求、提交方式、遴选流程与24项奖项设置；已提交可随时查询审核进度。</p><span class="go">查看规则 <i class="fa-solid fa-arrow-right"></i></span></a>
    </div>
  </div>
</section>

<section class="section alt" id="about-section">
  <div class="container about-grid">
    <div class="about-img reveal"><img src="${esc(ab.image || '/static/img/pdf/graduate.jpg')}" alt="影视专业毕业生"></div>
    <div class="reveal">
      ${secHead(ab.title || '关于迭代盛典', 'About the Ceremony', '', true)}
      <p class="lead">${esc(ab.lead || '')}</p>
      <p style="color:var(--muted)">${esc((ab.paragraphs || [])[1] || '')}</p>
      <div class="pos-row">${(ab.positioning || []).map((p: any) => `<div class="pos-item"><b>${esc(p.title)}</b><span>${esc(p.text)}</span></div>`).join('')}</div>
      <div style="margin-top:28px"><a class="btn btn-line" href="/about">了解更多 <i class="fa-solid fa-arrow-right"></i></a></div>
    </div>
  </div>
</section>

<section class="section" id="highlight-section">
  <div class="container">
    ${secHead('活动亮点', 'Activity Highlights')}
    <div class="gold-frame reveal" style="display:grid;grid-template-columns:minmax(200px,340px) 1fr;gap:40px;align-items:center">
      <img src="/static/img/pdf/trophy.jpg" alt="奖杯" style="border-radius:8px;mix-blend-mode:screen">
      <ul class="diamond-list" style="font-size:17px;letter-spacing:1px">${(St.highlights || []).map((x: string) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
  </div>
</section>

<section class="section alt" id="works-section">
  <div class="container">
    ${secHead('往届获奖作品', 'Award-winning Works', '影视专业毕业生作品（联合作业）是各影视类高校的教学成果，迭代盛典让这些作品被更多人看见。')}
    <div class="works-grid">${(works.results || []).map(workCard).join('')}</div>
    <div style="text-align:center;margin-top:40px"><a class="btn btn-line" href="/works">查看全部作品 <i class="fa-solid fa-arrow-right"></i></a></div>
  </div>
</section>

<section class="section" id="support-section">
  <div class="container">
    ${secHead('扶持计划', 'Incubation & Support', '不止于颁奖——从专项基金、创投汇到创业扶持，为毕业生铺就从校园到产业的完整路径。')}
    <div class="grid g3">${(St.support || []).map((s: any) => `<div class="card support-card reveal"><div class="thumb"><img src="${esc(s.image)}" alt="" loading="lazy"></div><div class="body"><h3 class="gold-text"><i class="fa-solid ${esc(s.icon || 'fa-star')}"></i> ${esc(s.title)}</h3><ul class="diamond-list" style="font-size:14px">${(s.items || []).map((i: string) => `<li>${esc(i)}</li>`).join('')}</ul></div></div>`).join('')}</div>
  </div>
</section>

<section class="section alt" id="news-section">
  <div class="container">
    ${secHead('新闻动态', 'News & Updates')}
    ${n[0] ? `<a class="card news-card news-feature reveal" href="/news/${n[0].id}" style="margin-bottom:24px"><div class="thumb"><img src="${esc(img(n[0].cover))}" alt=""></div><div class="body"><div class="news-meta"><span class="tag">${esc(labelOf(NEWS_CAT, n[0].category))}</span><span>${esc(fmtDate(n[0].published_at))}</span></div><h3 class="gold-text">${esc(n[0].title)}</h3><p>${esc(n[0].summary || '')}</p><div style="margin-top:20px;color:var(--gold-2)">阅读全文 <i class="fa-solid fa-arrow-right"></i></div></div></a>` : ''}
    <div class="grid g3">${n.slice(1).map(newsCard).join('')}</div>
    <div style="text-align:center;margin-top:40px"><a class="btn btn-line" href="/news">更多新闻 <i class="fa-solid fa-arrow-right"></i></a></div>
  </div>
</section>

<section class="section" id="editions-section">
  <div class="container">
    ${secHead('历届盛典', 'Previous Ceremonies')}
    <div class="grid g4">${(editions.results || []).map((e: any) => `<a class="card reveal" href="/editions/${e.year}" style="display:block"><div style="aspect-ratio:16/10;overflow:hidden;position:relative"><img src="${esc(img(e.cover))}" alt="" style="width:100%;height:100%;object-fit:cover"><span class="tag" style="position:absolute;left:12px;top:12px;background:rgba(4,11,29,.75);font-size:15px;font-family:var(--serif)">${e.year}</span></div><div style="padding:18px 20px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 class="serif" style="margin:0;font-size:18px">${esc(e.title)}</h3>${statusPill(e.status)}</div><p style="color:var(--muted);font-size:13px;margin:8px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(e.summary || '')}</p></div></a>`).join('')}</div>
  </div>
</section>

<section class="section alt" id="founders-section">
  <div class="container">
    ${secHead('发起人', 'Founders', '汇聚产业政策、影视教育、电影制片与生态架构的顶尖力量，为青年影人保驾护航。')}
    <div class="grid g4">${(founders.results || []).map((p: any) => personCard(p)).join('')}</div>
    <div style="text-align:center;margin-top:40px"><a class="btn btn-line" href="/experts">发起人与专家评审 <i class="fa-solid fa-arrow-right"></i></a></div>
  </div>
</section>

<section class="section" id="partners-section">
  <div class="container">
    ${secHead('合作院校与机构', 'Partner Academies', '北京电影学院、上海戏剧学院、中央戏剧学院、中国传媒大学、青岛电影学院等百余家高校和影视机构共同参与')}
    <div class="marquee reveal"><div class="marquee-track">${[...pList, ...pList].map(logoTile).join('')}</div></div>
    <div style="text-align:center;margin-top:40px"><a class="btn btn-line" href="/partners">全部合作院校 <i class="fa-solid fa-arrow-right"></i></a></div>
  </div>
</section>

<section class="section alt" id="gallery-section">
  <div class="container">
    ${secHead('精彩瞬间', 'Highlights Gallery')}
    <div class="masonry">${(gallery.results || []).map((g: any) => `<a href="${esc(g.image)}" data-lightbox="home" data-cap="${esc(g.title || '')}"><img src="${esc(g.image)}" alt="${esc(g.title || '')}" loading="lazy"><div class="cap">${esc(g.title || '')}</div></a>`).join('')}</div>
    <div style="text-align:center;margin-top:30px"><a class="btn btn-line" href="/gallery">进入图库 <i class="fa-solid fa-arrow-right"></i></a></div>
  </div>
</section>`
  return layout(St, { active: '/' }, body)
}

/* ---------------- 关于 ---------------- */
export async function aboutPage(db: D1Database, St: S) {
  const ab = St.about || {}, eco = St.ecosystem || {}
  const body = `${pageHero('关于盛典', 'About Iteration Grand Ceremony', ab.lead)}
<section class="section"><div class="container about-grid">
  <div class="reveal">${secHead('盛典介绍', 'Introduction', '', true)}<p class="lead">${esc(ab.lead || '')}</p>${(ab.paragraphs || []).map((p: string) => `<p style="color:#cfd9ef">${esc(p)}</p>`).join('')}</div>
  <div class="reveal"><div class="about-img"><img src="${esc(ab.image)}" alt=""></div><div class="pos-row">${(ab.positioning || []).map((p: any) => `<div class="pos-item"><b>${esc(p.title)}</b><span>${esc(p.text)}</span></div>`).join('')}</div></div>
</div></section>
<section class="section alt"><div class="container">${secHead(ab.company_title || '主体运营', 'Operator')}<div class="gold-frame reveal" style="max-width:980px;margin:0 auto"><p style="margin:0;font-size:16px;line-height:2;color:#dbe4f7">${esc(ab.company_text || '')}</p></div></div></section>
<section class="section"><div class="container">${secHead('数据亮点', 'Key Figures')}<div class="stats reveal">${(St.stats || []).map((s: any) => `<div class="stat"><div class="num gold-text"><span data-count="${esc(s.num)}">${esc(s.num)}</span><small>${esc(s.unit)}</small></div><div class="lbl">${esc(s.label)}</div></div>`).join('')}</div></div></section>
<section class="section alt"><div class="container">${secHead(eco.title || '影视产业生态体系', 'Industry Ecosystem', eco.text)}<div class="eco-ring">${(eco.items || []).map((e: any) => `<div class="eco-item reveal"><i class="fa-solid ${esc(e.icon)}"></i><span>${esc(e.name)}</span></div>`).join('')}</div></div></section>
<section class="section"><div class="container">${secHead('发展历程', 'Milestones')}<div class="timeline">${(St.timeline || []).map((t: any) => `<div class="tl-item reveal"><div class="tl-date gold-text">${esc(t.date)}</div><h4>${esc(t.title)}</h4><p>${esc(t.text)}</p></div>`).join('')}</div></div></section>
<section class="section alt"><div class="container">${secHead('组织架构', 'Organization')}<div class="gold-frame reveal" style="max-width:1080px;margin:0 auto">${(St.organizers || []).map((o: any) => `<div style="display:grid;grid-template-columns:110px 1fr;gap:16px;padding:12px 0;border-bottom:1px dashed rgba(227,194,125,.16)"><b class="gold-text serif" style="letter-spacing:4px">${esc(o.role)}</b><span style="color:#d5def2">${esc(o.names)}</span></div>`).join('')}</div></div></section>
<section class="section"><div class="container">${secHead(St.promotion?.title || '全媒体传播', 'Media Matrix', St.promotion?.text)}
  <div class="grid g5" style="margin-bottom:30px">${(St.promotion?.channels || []).map((c: string) => `<div class="card reveal" style="padding:22px;text-align:center"><i class="fa-solid fa-tower-broadcast" style="color:var(--gold);font-size:22px"></i><div style="margin-top:10px;font-size:14px">${esc(c)}</div></div>`).join('')}</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center" class="reveal">${(St.promotion?.media || []).map((m: string) => `<span class="tag blue" style="font-size:13px;padding:5px 14px">${esc(m)}</span>`).join('')}</div>
</div></section>`
  return layout(St, { title: '关于盛典', active: '/about' }, body)
}

/* ---------------- 新闻 ---------------- */
export async function newsListPage(db: D1Database, St: S, cat: string, page: number) {
  const per = 12, off = (page - 1) * per
  const where = cat ? "status='published' AND category=?" : "status='published'"
  const args = cat ? [cat] : []
  const [list, total] = await Promise.all([
    db.prepare(`SELECT id,title,summary,cover,category,published_at FROM news WHERE ${where} ORDER BY published_at DESC, id DESC LIMIT ${per} OFFSET ${off}`).bind(...args).all<any>(),
    db.prepare(`SELECT count(*) c FROM news WHERE ${where}`).bind(...args).first<any>(),
  ])
  const pages = Math.max(1, Math.ceil((total?.c || 0) / per))
  const tabs = [['', '全部'], ...NEWS_CAT].map(([k, v]) => `<a href="/news${k ? '?cat=' + k : ''}" class="${cat === k ? 'on' : ''}">${k === 'wechat' ? '<i class="fa-brands fa-weixin"></i> ' : ''}${v}</a>`).join('')
  const pager = pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => i + 1).map((p) => p === page ? `<span class="on">${p}</span>` : `<a href="/news?${cat ? 'cat=' + cat + '&' : ''}page=${p}">${p}</a>`).join('')}</div>` : ''
  const body = `${pageHero('新闻动态', 'News & Updates', '盛典资讯、公众号文章与媒体报道，一站掌握“迭代盛典”最新动态。')}
<section class="section" style="padding-top:50px"><div class="container"><div class="filters">${tabs}</div>
  ${(list.results || []).length ? `<div class="grid g3">${(list.results || []).map(newsCard).join('')}</div>` : '<div class="empty">暂无内容</div>'}${pager}
</div></section>`
  return layout(St, { title: '新闻动态', active: '/news' }, body)
}

export async function newsDetailPage(db: D1Database, St: S, id: number) {
  const n = await db.prepare("SELECT * FROM news WHERE id=? AND status='published'").bind(id).first<any>()
  if (!n) return null
  await db.prepare('UPDATE news SET views=views+1 WHERE id=?').bind(id).run()
  const rel = await db.prepare("SELECT id,title,summary,cover,category,published_at FROM news WHERE status='published' AND id<>? ORDER BY published_at DESC LIMIT 3").bind(id).all<any>()
  const body = `${pageHero(labelOf(NEWS_CAT, n.category), 'News Detail', '', `<a href="/news">新闻动态</a> / 正文`)}
<section class="section" style="padding-top:40px"><div class="container"><article class="article gold-frame">
  <h1 class="gold-text">${esc(n.title)}</h1>
  <div class="meta"><span><i class="fa-regular fa-calendar"></i> ${esc(fmtDate(n.published_at))}</span>${n.source ? `<span><i class="fa-solid fa-feather"></i> ${esc(n.source)}</span>` : ''}<span><i class="fa-regular fa-eye"></i> ${(n.views || 0) + 1}</span></div>
  ${n.summary ? `<blockquote class="prose" style="margin:0 0 26px;padding:14px 20px;border-left:3px solid var(--gold);background:rgba(227,194,125,.06);color:var(--muted);font-size:15px">${esc(n.summary)}</blockquote>` : ''}
  <div class="prose">${n.content || ''}</div>
  ${n.source_url ? `<div class="source-box"><i class="fa-solid fa-link"></i> 原文来源：<a href="${esc(n.source_url)}" target="_blank" rel="noopener">${esc(n.source || n.source_url)}</a></div>` : ''}
</article>
<div style="max-width:860px;margin:60px auto 0">${secHead('相关阅读', 'Related')}<div class="grid g3">${(rel.results || []).map(newsCard).join('')}</div></div>
</div></section>`
  return layout(St, { title: n.title, description: n.summary, active: '/news' }, body)
}

/* ---------------- 历届盛典 ---------------- */
export async function editionsPage(db: D1Database, St: S) {
  const { results } = await db.prepare('SELECT * FROM editions ORDER BY year DESC').all<any>()
  const body = `${pageHero('历届盛典', 'Previous Ceremonies', '从2021年“筑梦未来”启航，迭代盛典每年汇聚全国影视院校毕业生的优秀作品。')}
<section class="section" style="padding-top:50px"><div class="container" style="display:grid;gap:28px">
${(results || []).map((e: any) => `<div class="card edition-card reveal"><div class="thumb"><img src="${esc(img(e.cover))}" alt=""><span class="year-badge gold-text">${e.year}</span></div><div class="body">
  ${statusPill(e.status)} ${e.theme ? `<span class="tag">${esc(e.theme)}</span>` : ''}
  <h3 class="gold-text">${esc(e.title)}</h3>
  <div style="color:var(--dim);font-size:13.5px;margin-bottom:12px">${e.event_date ? `<i class="fa-regular fa-calendar"></i> ${esc(e.event_date)} &nbsp; ` : ''}${e.venue ? `<i class="fa-solid fa-location-dot"></i> ${esc(e.venue)}` : ''}</div>
  <p style="color:var(--muted);margin:0 0 22px">${esc(e.summary || '')}</p>
  <div style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn btn-line btn-sm" href="/editions/${e.year}">查看详情</a>
  ${e.registration_open ? `<a class="btn btn-line btn-sm" href="/register?edition=${e.id}"><i class="fa-solid fa-user-plus"></i>本届报名</a>` : ''}
  ${e.submission_open ? `<a class="btn btn-gold btn-sm" href="/submit?edition=${e.id}"><i class="fa-solid fa-cloud-arrow-up"></i>本届作品提交</a>` : ''}</div>
</div></div>`).join('')}
</div></section>`
  return layout(St, { title: '历届盛典', active: '/editions' }, body)
}

export async function editionDetailPage(db: D1Database, St: S, year: number) {
  const e = await db.prepare('SELECT * FROM editions WHERE year=?').bind(year).first<any>()
  if (!e) return null
  const [works, gallery] = await Promise.all([
    db.prepare('SELECT * FROM works WHERE edition_id=? ORDER BY sort').bind(e.id).all<any>(),
    db.prepare('SELECT * FROM gallery WHERE edition_id=? AND visible=1 ORDER BY sort').bind(e.id).all<any>(),
  ])
  const body = `${pageHero(e.title, `${e.year} · ITERATION GRAND CEREMONY`, e.theme || '', `<a href="/editions">历届盛典</a> / ${e.year}`)}
<section class="section" style="padding-top:40px"><div class="container">
  <div class="gold-frame reveal" style="display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:start" id="edition-intro">
    <img src="${esc(img(e.cover))}" alt="" style="border-radius:8px;width:100%;aspect-ratio:16/10;object-fit:cover">
    <div>${statusPill(e.status)}<div style="color:var(--muted);margin:14px 0">${e.event_date ? `<div><i class="fa-regular fa-calendar" style="color:var(--gold);width:20px"></i> ${esc(e.event_date)}</div>` : ''}${e.venue ? `<div><i class="fa-solid fa-location-dot" style="color:var(--gold);width:20px"></i> ${esc(e.venue)}</div>` : ''}${e.submission_deadline && e.submission_open ? `<div><i class="fa-solid fa-hourglass-half" style="color:var(--gold);width:20px"></i> 作品提交截止：${esc(e.submission_deadline)}</div>` : ''}</div>
    <div class="prose" style="font-size:15px">${e.content || `<p>${esc(e.summary || '')}</p>`}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">${e.registration_open ? `<a class="btn btn-line" href="/register?edition=${e.id}">本届报名</a>` : ''}${e.submission_open ? `<a class="btn btn-gold" href="/submit?edition=${e.id}">本届作品提交</a>` : ''}</div></div>
  </div>
  ${(works.results || []).length ? `<div style="margin-top:80px">${secHead('本届获奖作品', 'Winners')}<div class="works-grid">${(works.results || []).map(workCard).join('')}</div></div>` : ''}
  ${(gallery.results || []).length ? `<div style="margin-top:80px">${secHead('本届精彩瞬间', 'Gallery')}<div class="masonry">${(gallery.results || []).map((g: any) => `<a href="${esc(g.image)}" data-lightbox="ed" data-cap="${esc(g.title || '')}"><img src="${esc(g.image)}" loading="lazy" alt=""><div class="cap">${esc(g.title || '')}</div></a>`).join('')}</div></div>` : ''}
</div></section>`
  return layout(St, { title: e.title, description: e.summary, active: '/editions' }, body)
}

/* ---------------- 作品 ---------------- */
export async function worksPage(db: D1Database, St: S, ed: string) {
  const eds = await db.prepare('SELECT id,year,title FROM editions ORDER BY year DESC').all<any>()
  const list = ed
    ? await db.prepare('SELECT * FROM works WHERE edition_id=? ORDER BY sort').bind(Number(ed)).all<any>()
    : await db.prepare('SELECT * FROM works ORDER BY featured DESC, sort').all<any>()
  const tabs = `<a href="/works" class="${!ed ? 'on' : ''}">全部</a>` + (eds.results || []).map((e: any) => `<a href="/works?edition=${e.id}" class="${ed == String(e.id) ? 'on' : ''}">${e.year}</a>`).join('')
  const body = `${pageHero('获奖作品', 'Award-winning Works', '每一部作品，都是一位青年影人梦想的起点。')}
<section class="section" style="padding-top:50px"><div class="container"><div class="filters">${tabs}</div>
${(list.results || []).length ? `<div class="works-grid">${(list.results || []).map(workCard).join('')}</div>` : '<div class="empty">本届作品整理中，敬请期待</div>'}
</div></section>
<section class="section alt"><div class="container">${secHead('奖项设置', 'Award Categories')}<div class="award-cols gold-frame reveal">${(St.awards || []).map((a: any) => `<div class="award-item"><b>${esc(a.cn)}</b><span>${esc(a.en)}</span></div>`).join('')}</div></div></section>`
  return layout(St, { title: '获奖作品', active: '/works' }, body)
}

/* ---------------- 专家 ---------------- */
export async function expertsPage(db: D1Database, St: S) {
  const { results } = await db.prepare('SELECT * FROM people WHERE visible=1 ORDER BY sort, id').all<any>()
  const by = (c: string) => (results || []).filter((p: any) => p.category === c)
  const guests = by('guest')
  const body = `${pageHero('发起人与专家评审', 'Founders & Expert Jury', '由影视业界资深专家、学者组成的评审团队，以专业与公正守护每一部作品。')}
<section class="section" style="padding-top:50px"><div class="container">${secHead('发起人', 'Founders')}<div class="grid g2">${by('founder').map((p: any) => personCard(p, true)).join('')}</div></div></section>
<section class="section alt"><div class="container">${secHead('专家评审（部分）', 'Expert Review')}<div class="grid g3">${by('judge').map((p: any) => personCard(p)).join('')}</div></div></section>
${guests.length ? `<section class="section"><div class="container">${secHead('颁奖嘉宾', 'Awarding Guests')}<div class="grid g4">${guests.map((p: any) => personCard(p)).join('')}</div></div></section>` : ''}`
  return layout(St, { title: '专家评审', active: '/experts' }, body)
}

/* ---------------- 合作院校 ---------------- */
export async function partnersPage(db: D1Database, St: S) {
  const { results } = await db.prepare('SELECT * FROM partners WHERE visible=1 ORDER BY sort, id').all<any>()
  const groups: [string, string, string][] = [['school', '合作院校', 'Partner Academies'], ['org', '合作机构', 'Partner Institutions'], ['organizer', '主办 / 承办单位', 'Organizers'], ['support', '支持单位', 'Supporters'], ['media', '合作媒体', 'Media Partners'], ['sponsor', '赞助伙伴', 'Sponsors']]
  const body = `${pageHero('合作院校与机构', 'Partners', '与北京电影学院、上海戏剧学院、青岛电影学院等十多所高校就共同扶持毕业生获奖作品孵化长片电影项目达成合作意向。')}
${groups.map(([k, t, en], i) => {
  const items = (results || []).filter((p: any) => p.category === k)
  if (!items.length) return ''
  return `<section class="section ${i % 2 ? 'alt' : ''}" ${i === 0 ? 'style="padding-top:50px"' : ''}><div class="container">${secHead(t, en)}<div class="logo-wall">${items.map((p: any) => `<div class="reveal">${logoTile(p)}<div class="logo-name">${esc(p.name)}</div></div>`).join('')}</div></div></section>`
}).join('')}
<section class="section"><div class="container"><div class="gold-frame reveal" style="text-align:center"><h3 class="gold-text serif" style="letter-spacing:4px;font-size:24px;margin:0 0 10px">欢迎更多院校加入</h3><p style="color:var(--muted);margin:0 0 20px">每所院校可选送10部作品参赛，共同孵化毕业生长片电影项目。</p><a class="btn btn-gold" href="/contact?type=院校合作">院校合作申请</a></div></div></section>`
  return layout(St, { title: '合作院校', active: '/partners' }, body)
}

/* ---------------- 图库 ---------------- */
export async function galleryPage(db: D1Database, St: S, album: string) {
  const albums = await db.prepare('SELECT album, count(*) c FROM gallery WHERE visible=1 GROUP BY album ORDER BY min(sort)').all<any>()
  const list = album
    ? await db.prepare('SELECT * FROM gallery WHERE visible=1 AND album=? ORDER BY sort').bind(album).all<any>()
    : await db.prepare('SELECT * FROM gallery WHERE visible=1 ORDER BY sort').all<any>()
  const tabs = `<a href="/gallery" class="${!album ? 'on' : ''}">全部</a>` + (albums.results || []).map((a: any) => `<a href="/gallery?album=${encodeURIComponent(a.album)}" class="${album === a.album ? 'on' : ''}">${esc(a.album)} <small style="opacity:.6">${a.c}</small></a>`).join('')
  const body = `${pageHero('精彩瞬间', 'Gallery', '发布会、签约仪式、颁奖盛典……记录迭代盛典的每一个高光时刻。')}
<section class="section" style="padding-top:50px"><div class="container"><div class="filters">${tabs}</div>
<div class="masonry">${(list.results || []).map((g: any) => `<a href="${esc(g.image)}" data-lightbox="g" data-cap="${esc(g.title || '')}"><img src="${esc(g.image)}" alt="${esc(g.title || '')}" loading="lazy"><div class="cap">${esc(g.title || '')}</div></a>`).join('')}</div>
</div></section>`
  return layout(St, { title: '精彩瞬间', active: '/gallery' }, body)
}

/* ---------------- 规则 ---------------- */
export function rulesPage(St: S) {
  const r = St.rules || {}
  const body = `${pageHero('征集规则与奖项', 'Rules & Awards', r.title)}
<section class="section" style="padding-top:50px"><div class="container" style="max-width:1000px"><div class="gold-frame reveal">
${(r.sections || []).map((s: any, i: number) => `<div class="rule-sec"><h3><span class="n">${i + 1}</span>${esc(s.title)}</h3><ul class="diamond-list">${(s.items || []).map((x: string) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:20px"><a class="btn btn-line" href="/register">毕业生报名</a><a class="btn btn-gold" href="/submit">在线提交作品</a></div>
</div></div></section>
<section class="section alt"><div class="container">${secHead('奖项设置', 'Award Setting', '“迭代盛典-影视专业毕业生作品颁奖盛典”奖项')}<div class="award-cols gold-frame reveal">${(St.awards || []).map((a: any) => `<div class="award-item"><b>${esc(a.cn)}</b><span>${esc(a.en)}</span></div>`).join('')}</div></div></section>`
  return layout(St, { title: '征集规则', active: '' }, body)
}

/* ---------------- 表单页 ---------------- */
const field = (name: string, label: string, opts: { req?: boolean; type?: string; ph?: string; full?: boolean; hint?: string; options?: string[]; area?: boolean; val?: string } = {}) => {
  const req = opts.req ? 'required' : ''
  let input = ''
  if (opts.options) input = `<select name="${name}" ${req}><option value="">请选择</option>${opts.options.map((o) => `<option ${opts.val === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
  else if (opts.area) input = `<textarea name="${name}" ${req} placeholder="${esc(opts.ph || '')}"></textarea>`
  else input = `<input name="${name}" type="${opts.type || 'text'}" ${req} placeholder="${esc(opts.ph || '')}" value="${esc(opts.val || '')}">`
  return `<div class="field ${opts.full ? 'full' : ''}"><label>${esc(label)}${opts.req ? '<span class="req">*</span>' : ''}</label>${input}${opts.hint ? `<div class="hint">${esc(opts.hint)}</div>` : ''}</div>`
}

async function openEditions(db: D1Database, col: 'registration_open' | 'submission_open') {
  const { results } = await db.prepare(`SELECT id,year,title,submission_deadline FROM editions WHERE ${col}=1 ORDER BY year DESC`).all<any>()
  return results || []
}
const edSelect = (eds: any[], sel: string) => `<div class="field full"><label>参加届次<span class="req">*</span></label><select name="edition_id" required>${eds.map((e) => `<option value="${e.id}" ${String(e.id) === sel ? 'selected' : ''}>${e.year} · ${esc(e.title)}</option>`).join('')}</select></div>`
const closed = (t: string) => `<div class="gold-frame closed-box"><i class="fa-solid fa-hourglass-half" style="font-size:48px;color:var(--gold)"></i><h2 class="gold-text serif" style="letter-spacing:4px">${t}暂未开放</h2><p style="color:var(--muted)">请关注“迭代盛典”微信公众号及本站新闻动态，获取最新征集通知。</p><a class="btn btn-line" href="/news">查看最新动态</a></div>`

export async function registerPage(db: D1Database, St: S, sel: string) {
  const eds = await openEditions(db, 'registration_open')
  const form = !eds.length ? closed('报名通道') : `<form class="gold-frame" data-api="/api/public/register" data-success="报名成功！" id="register-form">
  <div class="form-msg"></div>
  <div class="form-grid">
    ${edSelect(eds, sel)}
    <div class="form-section-title">个人信息</div>
    ${field('name', '姓名', { req: true })}${field('gender', '性别', { options: ['男', '女'] })}
    ${field('phone', '手机号码', { req: true, type: 'tel' })}${field('email', '电子邮箱', { type: 'email' })}
    ${field('wechat', '微信号')}${field('degree', '学历', { options: ['本科', '硕士研究生', '博士研究生', '专科', '其他'] })}
    <div class="form-section-title">院校信息</div>
    ${field('school', '毕业院校', { req: true, ph: '如：北京电影学院' })}${field('major', '院系 / 专业', { ph: '如：导演系' })}
    ${field('grad_year', '毕业年份', { options: ['2026', '2025', '2024', '2027'] })}${field('role', '在作品中担任', { options: ['导演', '编剧', '制片', '摄影', '剪辑', '演员', '美术', '录音/声音', '动画', '其他'] })}
    ${field('team_size', '主创团队人数', { type: 'number' })}
    ${field('message', '个人简介 / 备注', { area: true, full: true, ph: '代表作品、获奖经历、希望获得的扶持等' })}
    <label class="check full"><input type="checkbox" required> 我已阅读并同意《作品征集规则》，确认所填信息真实有效。</label>
    <div class="full" style="text-align:center"><button class="btn btn-gold btn-lg" type="submit"><i class="fa-solid fa-paper-plane"></i> 提交报名</button></div>
  </div></form>`
  const body = `${pageHero('毕业生报名', 'Registration', '面向全国高校影视专业应届毕业生，报名即加入“迭代影视专业人才库”。')}
<section class="section" style="padding-top:50px"><div class="container form-wrap">${form}</div></section>`
  return layout(St, { title: '毕业生报名', active: '' }, body)
}

export async function submitPage(db: D1Database, St: S, sel: string) {
  const eds = await openEditions(db, 'submission_open')
  const dl = eds[0]?.submission_deadline
  const form = !eds.length ? closed('作品提交通道') : `<form class="gold-frame" data-api="/api/public/submit" data-success="作品提交成功！" id="submit-form">
  ${dl ? `<div class="alert alert-ok"><i class="fa-solid fa-clock"></i> 本届作品提交截止日期：<b>${esc(dl)}</b>。作品文件请通过百度网盘等方式提供链接，或自备硬盘/U盘拷贝至组委会。</div>` : ''}
  <div class="form-msg"></div>
  <div class="form-grid">
    ${edSelect(eds, sel)}
    <div class="form-section-title">作品信息</div>
    ${field('title', '作品名称', { req: true })}${field('genre', '作品类型', { req: true, options: ['剧情片', '纪录片', '动画片'] })}
    ${field('length_type', '长片 / 短片', { req: true, options: ['短片', '长片'], hint: '短片45分钟以内，长片90分钟以内' })}${field('duration', '片长', { ph: '如：28分15秒' })}
    ${field('synopsis', '作品简介 / 剧本梗概', { area: true, full: true, req: true })}
    ${field('crew', '演职员表', { area: true, full: true, ph: '编剧、导演、摄像、剪辑、演员等；纪录片请填写分组成员名单' })}
    <div class="field full"><label>海报 / 剧照</label><input type="hidden" name="poster"><div class="upload-box" data-target="poster"><input type="file" accept="image/*" hidden><i class="fa-solid fa-image" style="font-size:28px;color:var(--gold)"></i><div class="ub-text">点击上传海报（JPG/PNG，≤5MB）</div></div></div>
    <div class="form-section-title">作品文件</div>
    ${field('netdisk_url', '网盘链接', { type: 'url', ph: 'https://pan.baidu.com/...', hint: '文件夹命名：年级专业、类型（短/长片）、作品名称；影像为高清MP4' })}${field('netdisk_code', '提取码')}
    ${field('video_url', '在线观看链接（可选）', { type: 'url', full: true })}
    <div class="form-section-title">院校与主创</div>
    ${field('school', '所属院校', { req: true })}${field('major', '院系 / 专业')}
    ${field('grade', '年级', { ph: '如：2022级' })}${field('director', '导演')}
    ${field('teacher', '指导教师')}
    <div class="form-section-title">联系人</div>
    ${field('contact_name', '联系人', { req: true })}${field('phone', '联系电话', { req: true, type: 'tel' })}
    ${field('email', '电子邮箱', { type: 'email', full: true })}
    <label class="check full"><input type="checkbox" required> 本人承诺作品为参赛者原创，如有版权争议、纠纷由参赛者自行承担法律责任。</label>
    <div class="full" style="text-align:center"><button class="btn btn-gold btn-lg" type="submit"><i class="fa-solid fa-cloud-arrow-up"></i> 提交作品</button></div>
  </div></form>`
  const body = `${pageHero('作品提交', 'Submission', '剧情片 · 纪录片 · 动画片 —— 每所院校可选送10部作品参赛')}
<section class="section" style="padding-top:50px"><div class="container form-wrap">${form}
<div style="text-align:center;margin-top:24px;color:var(--muted)">提交前请阅读 <a href="/rules" style="color:var(--gold-2)">《作品征集规则》</a> · 已提交？<a href="/query" style="color:var(--gold-2)">查询审核进度</a></div></div></section>`
  return layout(St, { title: '作品提交', active: '' }, body)
}

export function queryPage(St: S, code: string) {
  const body = `${pageHero('进度查询', 'Status Query', '输入报名编号或作品编号，以及提交时填写的手机号码，查询审核进度。')}
<section class="section" style="padding-top:50px"><div class="container form-wrap" style="max-width:640px">
<form class="gold-frame" id="query-form"><div class="form-grid">
  ${field('code', '报名 / 作品编号', { req: true, full: true, val: code, ph: 'REG… / SUB…' })}
  ${field('phone', '手机号码', { req: true, full: true, type: 'tel' })}
  <div class="full" style="text-align:center"><button class="btn btn-gold" type="submit"><i class="fa-solid fa-magnifying-glass"></i> 查询</button></div>
</div><div id="query-result" style="margin-top:20px"></div></form></div></section>
<script>
document.getElementById('query-form').addEventListener('submit',function(e){e.preventDefault();var f=new FormData(this),o=document.getElementById('query-result');
fetch('/api/public/query?code='+encodeURIComponent(f.get('code'))+'&phone='+encodeURIComponent(f.get('phone'))).then(r=>r.json()).then(j=>{
if(!j.ok){o.innerHTML='<div class="alert alert-err">'+(j.error||'未找到记录')+'</div>';return}
var d=j.data;o.innerHTML='<div class="alert alert-ok"><div style="font-size:16px;margin-bottom:6px"><b>'+d.type+'</b> · '+d.code+'</div><div>'+d.title+'</div><div style="margin-top:8px">当前状态：<b style="color:var(--gold-2);font-size:17px">'+d.status+'</b></div><div style="font-size:12.5px;opacity:.8;margin-top:4px">提交时间：'+d.created_at+'</div>'+(d.note?'<div style="margin-top:8px">组委会意见：'+d.note+'</div>':'')+'</div>'})})
</script>`
  return layout(St, { title: '进度查询', active: '' }, body)
}

export function contactPage(St: S, type: string) {
  const site = St.site || {}
  const body = `${pageHero('商务合作', 'Business Cooperation', '冠名赞助、指定产品、院校合作、媒体合作——携手打造影视专业毕业生的专属盛典。')}
<section class="section" style="padding-top:50px"><div class="container" style="display:grid;grid-template-columns:1fr 1.4fr;gap:36px" id="contact-grid">
  <div>
    <div class="card" style="padding:30px;margin-bottom:20px"><h3 class="gold-text serif" style="letter-spacing:3px;margin-top:0">合作方式</h3>
    <ul class="diamond-list"><li>总冠名 / 首席战略合作伙伴</li><li>指定产品 / 唯一指定合作</li><li>迭代之夜 &amp; 慈善晚宴</li><li>定制活动 / 各种活动版块冠名</li><li>院校合作 / 作品孵化</li><li>媒体合作 / 全媒体传播</li></ul></div>
    <div class="card" style="padding:30px"><h3 class="gold-text serif" style="letter-spacing:3px;margin-top:0">联系方式</h3>
    <p style="margin:6px 0"><i class="fa-solid fa-building" style="color:var(--gold);width:22px"></i>${esc(site.company || '')}</p>
    ${site.address ? `<p style="margin:6px 0"><i class="fa-solid fa-location-dot" style="color:var(--gold);width:22px"></i>${esc(site.address)}</p>` : ''}
    ${site.phone ? `<p style="margin:6px 0"><i class="fa-solid fa-phone" style="color:var(--gold);width:22px"></i>${esc(site.phone)}</p>` : ''}
    ${site.email ? `<p style="margin:6px 0"><i class="fa-solid fa-envelope" style="color:var(--gold);width:22px"></i>${esc(site.email)}</p>` : ''}
    <p style="margin:6px 0"><i class="fa-brands fa-weixin" style="color:var(--gold);width:22px"></i>微信公众号：${esc(site.wechat_name || '迭代盛典')}</p>
    ${site.wechat_qr ? `<img class="qr" src="${esc(site.wechat_qr)}" alt="" style="margin-top:12px">` : ''}</div>
  </div>
  <div><form class="gold-frame" data-api="/api/public/contact" data-success="留言已提交！" id="contact-form"><div class="form-msg"></div><div class="form-grid">
    ${field('name', '您的姓名', { req: true })}${field('company', '单位 / 院校')}
    ${field('phone', '联系电话', { req: true, type: 'tel' })}${field('email', '电子邮箱', { type: 'email' })}
    ${field('subject', '合作类型', { full: true, options: ['冠名赞助', '指定产品', '院校合作', '媒体合作', '作品孵化/投资', '其他咨询'], val: type })}
    ${field('content', '合作意向 / 留言内容', { area: true, full: true, req: true })}
    <div class="full" style="text-align:center"><button class="btn btn-gold btn-lg" type="submit"><i class="fa-solid fa-paper-plane"></i> 提交</button></div>
  </div></form></div>
</div></section>
<style>@media(max-width:900px){#contact-grid{grid-template-columns:1fr!important}}</style>`
  return layout(St, { title: '商务合作', active: '/contact' }, body)
}

export function notFoundPage(St: S) {
  return layout(St, { title: '页面不存在' }, `${pageHero('页面不存在', '404 Not Found', '您访问的页面可能已被移除或暂时不可用。')}<section class="section"><div class="container" style="text-align:center"><a class="btn btn-gold" href="/">返回首页</a></div></section>`)
}

export { GENRES }
