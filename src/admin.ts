import { esc } from './lib'

const head = (title: string) => `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/static/img/brand/favicon.png">
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" rel="stylesheet">
<link href="/static/css/admin.css?v=3" rel="stylesheet"></head>`

export function loginPage(S: Record<string, any>) {
  return `${head('登录 · ' + (S.site?.name || '迭代盛典') + ' 管理后台')}
<body class="login-body">
<div class="login-card">
  <img src="${esc(S.site?.logo || '/static/img/brand/logo-full.png')}" alt="" class="login-logo">
  <h1>管理后台</h1>
  <p class="sub">ITERATION GRAND CEREMONY · CMS</p>
  <form id="login-form">
    <label>用户名</label><input name="username" required autocomplete="username">
    <label>密码</label><input name="password" type="password" required autocomplete="current-password">
    <div id="login-err" class="err"></div>
    <button class="btn btn-gold" type="submit" style="width:100%;margin-top:18px"><i class="fa-solid fa-right-to-bracket"></i> 登 录</button>
  </form>
  <a href="/" class="back"><i class="fa-solid fa-arrow-left"></i> 返回官网</a>
</div>
<script>
document.getElementById('login-form').onsubmit=async function(e){e.preventDefault();var f=new FormData(this);
var r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:f.get('username'),password:f.get('password')})});
var j=await r.json();if(j.ok)location.href='/admin';else document.getElementById('login-err').textContent=j.error||'登录失败'}
</script></body></html>`
}

export function adminShell(S: Record<string, any>, admin: any) {
  return `${head((S.site?.name || '迭代盛典') + ' · 管理后台')}
<body>
<aside class="sidebar" id="sidebar">
  <a class="sb-brand" href="#/dashboard"><img src="/static/img/brand/star-256.png" alt=""><div><b>迭代盛典</b><span>管理后台</span></div></a>
  <nav id="sb-nav"></nav>
  <div class="sb-foot"><a href="/" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> 查看官网</a></div>
</aside>
<div class="main">
  <header class="topbar">
    <button class="icon-btn" id="sb-toggle"><i class="fa-solid fa-bars"></i></button>
    <div class="crumb" id="crumb">仪表盘</div>
    <div class="topbar-right">
      <span class="me"><i class="fa-solid fa-circle-user"></i> ${esc(admin.display_name || admin.username)} <small>${admin.role === 'super' ? '超级管理员' : '编辑'}</small></span>
      <button class="btn btn-ghost btn-sm" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> 退出</button>
    </div>
  </header>
  <section class="content" id="view"><div class="loading"><i class="fa-solid fa-spinner fa-spin"></i></div></section>
</div>
<div class="modal" id="modal"><div class="modal-box"><div class="modal-head"><h3 id="modal-title"></h3><button class="icon-btn" data-close><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body" id="modal-body"></div><div class="modal-foot" id="modal-foot"></div></div></div>
<div class="toast" id="toast"></div>
<script>window.__ADMIN__=${JSON.stringify({ id: admin.id, username: admin.username, role: admin.role })}</script>
<script src="/static/js/admin.js?v=3"></script>
</body></html>`
}
