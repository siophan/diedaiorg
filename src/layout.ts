import { esc } from './lib'

export type PageOpts = {
  title?: string
  description?: string
  active?: string
  bodyClass?: string
  hideHeaderBg?: boolean
}

const NAV: [string, string][] = [
  ['/', '首页'],
  ['/about', '关于盛典'],
  ['/news', '新闻动态'],
  ['/editions', '历届盛典'],
  ['/works', '获奖作品'],
  ['/experts', '专家评审'],
  ['/partners', '合作院校'],
  ['/gallery', '精彩瞬间'],
  ['/contact', '商务合作'],
]

export function layout(S: Record<string, any>, o: PageOpts, body: string) {
  const site = S.site || {}
  const title = o.title ? `${o.title} - ${site.name || '迭代盛典'}` : `${site.full_name || '迭代盛典'} | ${site.slogan || ''}`
  const desc = o.description || site.seo_description || ''
  const nav = NAV.map(([h, t]) => `<a href="${h}" class="${o.active === h ? 'active' : ''}">${t}</a>`).join('')
  const meteors = Array.from({ length: 7 })
    .map((_, i) => `<span class="meteor" style="top:${(i * 13) % 70}%;left:${55 + ((i * 17) % 45)}%;animation-delay:${i * 1.1}s;animation-duration:${6 + (i % 3)}s"></span>`)
    .join('')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#071431">
<meta name="format-detection" content="telephone=no">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(site.seo_keywords || '')}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="/static/img/brand/logo-full.png">
<link rel="icon" href="/static/img/brand/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700;900&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" rel="stylesheet">
<link href="/static/css/site.css?v=4" rel="stylesheet">
</head>
<body class="${o.bodyClass || ''}">
<div class="space-bg"><div class="meteors">${meteors}</div></div>
<header class="site-header" id="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="/" aria-label="${esc(site.name)}">
      <img src="${esc(site.star || '/static/img/brand/star-256.png')}" alt="迭代盛典">
      <div><div class="b-name gold-text">${esc(site.name || '迭代盛典')}</div><div class="b-sub">${esc(site.en_name || 'ITERATION GRAND CEREMONY')}</div></div>
    </a>
    <nav class="main-nav" id="main-nav">
      ${nav}
      <div class="nav-cta">
        <a href="/register" class="btn btn-line btn-sm"><i class="fa-solid fa-user-plus"></i>报名</a>
        <a href="/submit" class="btn btn-gold btn-sm"><i class="fa-solid fa-cloud-arrow-up"></i>提交作品</a>
      </div>
    </nav>
    <button class="menu-btn" id="menu-btn" aria-label="菜单"><i class="fa-solid fa-bars"></i></button>
  </div>
</header>
<main id="main">${body}</main>
${footer(S)}
<div class="lightbox" id="lightbox"><button class="lb-close" aria-label="关闭">&times;</button><button class="lb-btn lb-prev"><i class="fa-solid fa-chevron-left"></i></button><img alt=""><button class="lb-btn lb-next"><i class="fa-solid fa-chevron-right"></i></button><div class="lb-cap"></div></div>
<nav class="mobile-bar" id="mobile-bar" aria-label="快捷入口">
  <a href="/"><i class="fa-solid fa-house"></i><span>首页</span></a>
  <a href="/news"><i class="fa-solid fa-newspaper"></i><span>动态</span></a>
  <a href="/register" class="mb-main"><i class="fa-solid fa-user-plus"></i><span>报名</span></a>
  <a href="/submit" class="mb-main gold"><i class="fa-solid fa-cloud-arrow-up"></i><span>交作品</span></a>
  <a href="/query"><i class="fa-solid fa-magnifying-glass"></i><span>查进度</span></a>
</nav>
<button class="to-top" id="to-top" aria-label="回到顶部"><i class="fa-solid fa-arrow-up"></i></button>
<script src="/static/js/site.js?v=4"></script>
</body>
</html>`
}

function footer(S: Record<string, any>) {
  const site = S.site || {}
  const cta = S.cta || {}
  return `
<section class="cta-band" id="cta-band">
  <div class="container reveal">
    <img src="/static/img/brand/film-gold.png" alt="" style="width:46px;margin:0 auto 14px">
    <h2 class="gold-text">${esc(cta.title || '')}</h2>
    <p>${esc(cta.text || '')}</p>
    <div class="hero-actions">
      <a class="btn btn-gold btn-lg" href="/register"><i class="fa-solid fa-star"></i>报名参加</a>
      <a class="btn btn-line btn-lg" href="${esc(cta.button_link || '/contact')}">${esc(cta.button_text || '商务合作')}</a>
    </div>
  </div>
</section>
<footer class="site-footer" id="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <img src="${esc(site.logo || '/static/img/brand/logo-full.png')}" alt="迭代盛典" style="width:170px;margin-bottom:16px">
        <p style="margin:0">${esc(site.seo_description || '')}</p>
      </div>
      <div>
        <h4>快速入口</h4>
        <ul>
          <li><a href="/register"><i class="fa-solid fa-angle-right"></i> 毕业生报名</a></li>
          <li><a href="/submit"><i class="fa-solid fa-angle-right"></i> 作品提交</a></li>
          <li><a href="/query"><i class="fa-solid fa-angle-right"></i> 进度查询</a></li>
          <li><a href="/rules"><i class="fa-solid fa-angle-right"></i> 征集规则与奖项</a></li>
          <li><a href="/news?cat=wechat"><i class="fa-solid fa-angle-right"></i> 公众号文章</a></li>
        </ul>
      </div>
      <div>
        <h4>关于我们</h4>
        <ul>
          <li><a href="/about">盛典介绍</a></li>
          <li><a href="/editions">历届盛典</a></li>
          <li><a href="/experts">发起人与评审</a></li>
          <li><a href="/partners">合作院校</a></li>
          <li><a href="/contact">商务合作</a></li>
        </ul>
      </div>
      <div>
        <h4>联系我们</h4>
        <ul>
          <li><i class="fa-solid fa-building" style="color:var(--gold);width:18px"></i> ${esc(site.company || '')}</li>
          ${site.address ? `<li><i class="fa-solid fa-location-dot" style="color:var(--gold);width:18px"></i> ${esc(site.address)}</li>` : ''}
          ${site.phone ? `<li><i class="fa-solid fa-phone" style="color:var(--gold);width:18px"></i> ${esc(site.phone)}</li>` : ''}
          ${site.email ? `<li><i class="fa-solid fa-envelope" style="color:var(--gold);width:18px"></i> ${esc(site.email)}</li>` : ''}
          <li><i class="fa-brands fa-weixin" style="color:var(--gold);width:18px"></i> 微信公众号：${esc(site.wechat_name || '迭代盛典')}</li>
        </ul>
        ${site.wechat_qr ? `<img class="qr" src="${esc(site.wechat_qr)}" alt="公众号二维码" style="margin-top:10px">` : ''}
      </div>
    </div>
    <div class="footer-bottom">
      <span>${esc(site.copyright || '')}</span>
      <span>${site.icp ? `<a href="https://beian.miit.gov.cn" target="_blank" rel="noopener">${esc(site.icp)}</a> · ` : ''}<a href="/admin" rel="nofollow">管理后台</a></span>
    </div>
  </div>
</footer>`
}

export function pageHero(title: string, en: string, desc = '', crumbs = '') {
  return `<section class="page-hero"><div class="container">
    <img src="/static/img/brand/star-256.png" alt="" style="width:64px;margin:0 auto 14px;filter:drop-shadow(0 0 16px rgba(30,139,255,.6))">
    <h1 class="gold-text">${esc(title)}</h1><div class="en">${esc(en)}</div>
    ${desc ? `<p>${esc(desc)}</p>` : ''}
    <div class="crumbs"><a href="/">首页</a> / ${crumbs || esc(title)}</div>
  </div></section>`
}

export function secHead(title: string, en: string, desc = '', left = false) {
  return `<div class="sec-head reveal ${left ? 'left' : ''}"><img class="film" src="/static/img/brand/film-gold.png" alt=""><h2 class="gold-text">${esc(title)}</h2><div class="en">${esc(en)}</div>${desc ? `<p>${esc(desc)}</p>` : ''}</div>`
}
