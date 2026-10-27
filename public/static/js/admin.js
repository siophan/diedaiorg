/* 迭代盛典 CMS —— 由后端 schema 驱动的通用后台 */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  var SCHEMA = null, EDITIONS = [], view = $('#view')

  /* ---------- 基础 ---------- */
  function api(method, url, body, isForm) {
    var opt = { method: method, headers: {} }
    if (body && !isForm) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body) }
    if (isForm) opt.body = body
    return fetch(url, opt).then(function (r) {
      if (r.status === 401) { location.href = '/admin/login'; throw new Error('未登录') }
      return r.json()
    })
  }
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '')
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = 'toast' }, 2600)
  }
  function modal(title, bodyHtml, footHtml, small) {
    $('#modal-title').textContent = title; $('#modal-body').innerHTML = bodyHtml; $('#modal-foot').innerHTML = footHtml || ''
    $('#modal .modal-box').className = 'modal-box' + (small ? ' sm' : ''); $('#modal').classList.add('show')
  }
  function closeModal() { $('#modal').classList.remove('show') }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-close]') || e.target.id === 'modal') closeModal() })
  function confirmBox(msg) { return Promise.resolve(window.confirm(msg)) }
  function upload(file) {
    var fd = new FormData(); fd.append('file', file)
    return api('POST', '/api/admin/upload', fd, true).then(function (j) { if (!j.ok) throw new Error(j.error); return j.url })
  }
  function optLabel(opts, v) { var o = (opts || []).find(function (x) { return x[0] == v }); return o ? o[1] : (v == null ? '' : v) }
  function edLabel(id) { var e = EDITIONS.find(function (x) { return x.id == id }); return e ? e.year : '' }

  /* ---------- 侧边栏 ---------- */
  function renderNav(active) {
    var t = SCHEMA.tables, h = '<a href="#/dashboard" data-k="dashboard"><i class="fa-solid fa-gauge-high"></i>仪表盘</a>'
    h += '<div class="sb-group">内容管理</div>'
    Object.keys(t).filter(function (k) { return t[k].group === 'content' }).forEach(function (k) { h += '<a href="#/t/' + k + '" data-k="' + k + '"><i class="fa-solid ' + t[k].icon + '"></i>' + t[k].label + '</a>' })
    h += '<a href="#/wechat" data-k="wechat"><i class="fa-brands fa-weixin"></i>公众号导入</a>'
    h += '<div class="sb-group">报名与作品</div>'
    Object.keys(t).filter(function (k) { return t[k].group === 'data' }).forEach(function (k) { h += '<a href="#/t/' + k + '" data-k="' + k + '"><i class="fa-solid ' + t[k].icon + '"></i>' + t[k].label + '<span class="badge" data-badge="' + k + '" style="display:none"></span></a>' })
    h += '<div class="sb-group">系统</div>'
    h += '<a href="#/settings" data-k="settings"><i class="fa-solid fa-sliders"></i>站点设置</a>'
    h += '<a href="#/media" data-k="media"><i class="fa-solid fa-photo-film"></i>媒体库</a>'
    h += '<a href="#/admins" data-k="admins"><i class="fa-solid fa-users-gear"></i>账号管理</a>'
    $('#sb-nav').innerHTML = h
  }
  function setActive(k, crumb) {
    $$('#sb-nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-k') === k) })
    $('#crumb').textContent = crumb; window.__sbClose && window.__sbClose()
  }
  function refreshBadges() {
    api('GET', '/api/admin/dashboard').then(function (j) {
      if (!j.ok) return
      var m = { registrations: j.stats.regsNew, submissions: j.stats.subsNew, messages: j.stats.msgs }
      Object.keys(m).forEach(function (k) { var b = $('[data-badge="' + k + '"]'); if (b) { b.textContent = m[k]; b.style.display = m[k] ? '' : 'none' } })
    })
  }

  /* ---------- 路由 ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, '') || 'dashboard', p = h.split('/')
    if (p[0] === 'dashboard') return dashboard()
    if (p[0] === 't' && SCHEMA.tables[p[1]]) return listView(p[1])
    if (p[0] === 'settings') return settingsView(p[1])
    if (p[0] === 'wechat') return wechatView()
    if (p[0] === 'media') return mediaView()
    if (p[0] === 'admins') return adminsView()
    dashboard()
  }

  /* ---------- 仪表盘 ---------- */
  function dashboard() {
    setActive('dashboard', '仪表盘'); view.innerHTML = '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i></div>'
    api('GET', '/api/admin/dashboard').then(function (j) {
      var s = j.stats
      var kpi = function (ic, cls, n, l, href, extra) { return '<a class="kpi" href="' + href + '"><div class="ic ' + cls + '"><i class="fa-solid ' + ic + '"></i></div><div><b>' + n + (extra ? '<em>' + extra + '</em>' : '') + '</b><span>' + l + '</span></div></a>' }
      var row = function (r, isSub) { return '<tr><td>' + esc(r.code) + '</td><td>' + esc(isSub ? r.title : r.name) + '</td><td>' + esc(r.school) + '</td><td><span class="pill ' + r.status + '">' + esc(r.status) + '</span></td><td style="color:#97a0b8">' + esc((r.created_at || '').slice(5, 16)) + '</td></tr>' }
      var maxS = Math.max.apply(null, (j.bySchool || []).map(function (x) { return x.c }).concat([1]))
      view.innerHTML =
        '<div class="welcome"><img src="/static/img/brand/star-256.png" alt=""><div><h2>欢迎回来，' + esc(window.__ADMIN__.username) + '</h2><p>前台所有内容（首页文案、新闻、作品、院校、图片、规则、奖项……）均可在此编辑，保存后即时生效。</p></div><div class="acts"><a class="btn btn-gold" href="#/t/news" data-new="news"><i class="fa-solid fa-plus"></i>发布新闻</a><a class="btn btn-ghost" href="#/wechat"><i class="fa-brands fa-weixin"></i>导入公众号</a><a class="btn btn-ghost" href="/" target="_blank"><i class="fa-solid fa-eye"></i>预览官网</a></div></div>' +
        '<div class="kpis">' +
        kpi('fa-id-card', 'gold', s.regs, '报名总数', '#/t/registrations', s.regsNew ? s.regsNew + ' 待审' : '') +
        kpi('fa-clapperboard', '', s.subs, '作品提交', '#/t/submissions', s.subsNew ? s.subsNew + ' 待审' : '') +
        kpi('fa-envelope', 'red', s.msgs, '未处理留言', '#/t/messages') +
        kpi('fa-newspaper', 'green', s.news, '新闻文章', '#/t/news') +
        kpi('fa-film', '', s.works, '获奖作品', '#/t/works') +
        kpi('fa-building-columns', 'gold', s.partners, '合作院校/机构', '#/t/partners') +
        kpi('fa-images', 'green', s.gallery, '图库图片', '#/t/gallery') +
        kpi('fa-sliders', 'red', SCHEMA.settings.length, '站点配置模块', '#/settings') +
        '</div><div class="two-col">' +
        '<div class="panel"><div class="panel-head"><h3><i class="fa-solid fa-id-card"></i> 最新报名</h3><a class="btn btn-ghost btn-sm" style="margin-left:auto" href="#/t/registrations">全部</a></div><div class="tbl-wrap">' + ((j.recentRegs || []).length ? '<table class="tbl"><tbody>' + j.recentRegs.map(function (r) { return row(r) }).join('') + '</tbody></table>' : '<div class="empty">暂无报名</div>') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3><i class="fa-solid fa-clapperboard"></i> 最新作品</h3><a class="btn btn-ghost btn-sm" style="margin-left:auto" href="#/t/submissions">全部</a></div><div class="tbl-wrap">' + ((j.recentSubs || []).length ? '<table class="tbl"><tbody>' + j.recentSubs.map(function (r) { return row(r, 1) }).join('') + '</tbody></table>' : '<div class="empty">暂无作品</div>') + '</div></div>' +
        '</div>' +
        ((j.bySchool || []).length ? '<div class="panel"><div class="panel-head"><h3><i class="fa-solid fa-chart-bar"></i> 各院校作品提交数</h3></div><div class="panel-body">' + j.bySchool.map(function (b) { return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="width:180px;font-size:13px">' + esc(b.school) + '</span><div style="flex:1;background:#f0f2f7;border-radius:6px;height:14px"><div style="width:' + (b.c / maxS * 100) + '%;height:100%;border-radius:6px;background:linear-gradient(90deg,#e3c27d,#b88a3e)"></div></div><b style="width:30px;text-align:right">' + b.c + '</b></div>' }).join('') + '</div></div>' : '')
      var nb = $('[data-new="news"]'); nb && nb.addEventListener('click', function (e) { e.preventDefault(); location.hash = '#/t/news'; setTimeout(function () { editRecord('news', null) }, 300) })
    })
  }

  /* ---------- 通用列表 ---------- */
  var listState = {}
  function listView(table) {
    var t = SCHEMA.tables[table]
    setActive(table, t.label)
    var st = listState[table] = listState[table] || { page: 1, q: '', f: {} }
    var hasBatch = ['registrations', 'submissions', 'messages'].indexOf(table) >= 0
    var statusField = t.fields.find(function (f) { return f.k === 'status' })
    var filterHtml = (t.filters || []).map(function (fk) {
      var f = t.fields.find(function (x) { return x.k === fk }) || { k: fk, label: fk }
      var opts = f.t === 'edition' ? EDITIONS.map(function (e) { return [String(e.id), e.year + ''] }) : (f.opts || [])
      if (!opts.length && fk === 'album') return '<input data-filter="album" placeholder="相册名" value="' + esc(st.f.album || '') + '">'
      return '<select data-filter="' + fk + '"><option value="">全部' + esc(f.label) + '</option>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '" ' + (st.f[fk] == o[0] ? 'selected' : '') + '>' + esc(o[1]) + '</option>' }).join('') + '</select>'
    }).join('')
    view.innerHTML = '<div class="panel"><div class="panel-head"><h3><i class="fa-solid ' + t.icon + '"></i> ' + t.label + '</h3><span id="total" style="color:#97a0b8;font-size:12.5px"></span>' +
      '<div class="toolbar" style="margin-left:auto"><input id="q" placeholder="搜索…" value="' + esc(st.q) + '">' + filterHtml +
      (hasBatch ? '<a class="btn btn-ghost btn-sm" href="/api/admin/export/' + table + '"><i class="fa-solid fa-file-csv"></i>导出 CSV</a>' : '') +
      (t.noCreate ? '' : '<button class="btn btn-gold btn-sm" id="add-btn"><i class="fa-solid fa-plus"></i>新增</button>') + '</div></div>' +
      (hasBatch && statusField ? '<div class="batch-bar" id="batch-bar">已选 <b id="sel-n">0</b> 项：' + statusField.opts.map(function (o) { return '<button class="btn btn-ghost btn-sm" data-batch="' + o[0] + '">设为' + o[1] + '</button>' }).join('') + '<button class="btn btn-danger btn-sm" data-batch-del>删除</button></div>' : '') +
      '<div class="tbl-wrap" id="tbl"></div><div class="pager" id="pager"></div></div>'
    var load = function () {
      var qs = 'page=' + st.page + '&q=' + encodeURIComponent(st.q)
      Object.keys(st.f).forEach(function (k) { if (st.f[k]) qs += '&' + k + '=' + encodeURIComponent(st.f[k]) })
      $('#tbl').innerHTML = '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i></div>'
      api('GET', '/api/admin/t/' + table + '?' + qs).then(function (j) {
        $('#total').textContent = '共 ' + j.total + ' 条'
        if (!j.data.length) { $('#tbl').innerHTML = '<div class="empty"><i class="fa-regular fa-folder-open" style="font-size:30px"></i><br>暂无数据</div>'; $('#pager').innerHTML = ''; return }
        var cols = t.list.map(function (k) { return t.fields.find(function (f) { return f.k === k }) || { k: k, label: k } })
        var h = '<table class="tbl tbl-cards"><thead><tr>' + (hasBatch ? '<th style="width:30px"><input type="checkbox" id="chk-all"></th>' : '') + cols.map(function (c) { return '<th>' + esc(c.label) + '</th>' }).join('') + '<th></th></tr></thead><tbody>'
        j.data.forEach(function (r) {
          h += '<tr>' + (hasBatch ? '<td class="td-chk"><input type="checkbox" class="chk" value="' + r.id + '"></td>' : '')
          cols.forEach(function (c, ci) { h += '<td data-label="' + esc(c.label) + '"' + (c.t === 'image' ? ' class="td-img"' : ci === 1 || (ci === 0 && c.t !== 'image') ? ' class="td-main"' : '') + '>' + cell(c, r[c.k], table) + '</td>' })
          h += '<td class="acts">' + (table === 'news' ? '<a class="btn btn-ghost btn-sm" target="_blank" href="/news/' + r.id + '"><i class="fa-solid fa-eye"></i></a> ' : '') +
            '<button class="btn btn-ghost btn-sm" data-edit="' + r.id + '"><i class="fa-solid fa-pen"></i> ' + (t.noCreate ? '查看' : '编辑') + '</button> <button class="btn btn-danger btn-sm" data-del="' + r.id + '"><i class="fa-solid fa-trash"></i></button></td></tr>'
        })
        $('#tbl').innerHTML = h + '</tbody></table>'
        var pages = Math.ceil(j.total / j.size), ph = ''
        if (pages > 1) {
          ph += '<button ' + (st.page <= 1 ? 'disabled' : '') + ' data-pg="' + (st.page - 1) + '">‹</button>'
          for (var i = Math.max(1, st.page - 3); i <= Math.min(pages, st.page + 3); i++) ph += '<button class="' + (i === st.page ? 'on' : '') + '" data-pg="' + i + '">' + i + '</button>'
          ph += '<button ' + (st.page >= pages ? 'disabled' : '') + ' data-pg="' + (st.page + 1) + '">›</button>'
        }
        $('#pager').innerHTML = ph
        updateSel()
      })
    }
    var updateSel = function () {
      if (!hasBatch) return
      var n = $$('.chk:checked').length; var bb = $('#batch-bar'); if (bb) { bb.classList.toggle('show', n > 0); $('#sel-n').textContent = n }
    }
    view.onclick = function (e) {
      var b
      if ((b = e.target.closest('[data-edit]'))) editRecord(table, b.getAttribute('data-edit'), load)
      else if ((b = e.target.closest('[data-del]'))) confirmBox('确认删除这条记录？此操作不可恢复').then(function (ok) { if (ok) api('DELETE', '/api/admin/t/' + table + '/' + b.getAttribute('data-del')).then(function () { toast('已删除'); load(); refreshBadges() }) })
      else if ((b = e.target.closest('[data-pg]'))) { st.page = Number(b.getAttribute('data-pg')); load() }
      else if (e.target.id === 'add-btn' || e.target.closest('#add-btn')) editRecord(table, null, load)
      else if ((b = e.target.closest('[data-batch]')) || (b = e.target.closest('[data-batch-del]'))) {
        var ids = $$('.chk:checked').map(function (c) { return c.value })
        var del = b.hasAttribute('data-batch-del')
        confirmBox(del ? '确认删除选中的 ' + ids.length + ' 条记录？' : '确认批量更新状态？').then(function (ok) {
          if (!ok) return
          api('POST', '/api/admin/t/' + table + '/batch', del ? { ids: ids, action: 'delete' } : { ids: ids, status: b.getAttribute('data-batch') }).then(function (j) { if (j.ok) { toast('已更新'); load(); refreshBadges() } else toast(j.error, 1) })
        })
      }
    }
    view.onchange = function (e) {
      if (e.target.id === 'chk-all') { $$('.chk').forEach(function (c) { c.checked = e.target.checked }); updateSel() }
      else if (e.target.classList.contains('chk')) updateSel()
      else if (e.target.hasAttribute('data-filter')) { st.f[e.target.getAttribute('data-filter')] = e.target.value; st.page = 1; load() }
    }
    var qt; $('#q').oninput = function () { clearTimeout(qt); var v = this.value; qt = setTimeout(function () { st.q = v; st.page = 1; load() }, 350) }
    load()
  }
  function cell(f, v, table) {
    if (f.t === 'image') return v ? '<img class="thumb ' + (table === 'partners' ? 'logo' : '') + '" src="' + esc(v) + '" loading="lazy">' : '<span class="thumb" style="display:inline-block"></span>'
    if (f.t === 'bool') return v ? '<span class="pill yes">是</span>' : '<span style="color:#c0c6d6">—</span>'
    if (f.t === 'edition') return esc(edLabel(v))
    if (f.k === 'status') return '<span class="pill ' + esc(v) + '">' + esc(optLabel(f.opts, v)) + '</span>'
    if (f.opts) return esc(optLabel(f.opts, v))
    if (f.k === 'created_at') return '<span style="color:#97a0b8">' + esc(String(v || '').slice(0, 16)) + '</span>'
    return '<div class="ellipsis">' + esc(v) + '</div>'
  }

  /* ---------- 通用编辑表单 ---------- */
  function editRecord(table, id, after) {
    var t = SCHEMA.tables[table]
    var go = function (rec) {
      var html = '<form id="edit-form" class="form-grid">' + t.fields.map(function (f) { return fieldHtml(f, rec[f.k]) }).join('') + '</form>'
      var preview = table === 'submissions' && rec.netdisk_url ? '<a class="btn btn-ghost" target="_blank" href="' + esc(rec.netdisk_url) + '"><i class="fa-solid fa-cloud"></i>打开网盘</a>' : ''
      modal((id ? (t.noCreate ? '查看 / 审核 · ' : '编辑 · ') : '新增 · ') + t.label, html, preview + '<button class="btn btn-ghost" data-close>取消</button><button class="btn btn-gold" id="save-btn"><i class="fa-solid fa-floppy-disk"></i> 保存</button>')
      bindFields($('#edit-form'))
      $('#save-btn').onclick = function () {
        var data = collect($('#edit-form'), t.fields)
        var btn = this; btn.disabled = true
        api(id ? 'PUT' : 'POST', '/api/admin/t/' + table + (id ? '/' + id : ''), data).then(function (j) {
          btn.disabled = false
          if (!j.ok) return toast(j.error || '保存失败', 1)
          toast('保存成功'); closeModal(); after && after(); refreshBadges()
          if (table === 'editions') loadEditions()
        })
      }
    }
    if (id) api('GET', '/api/admin/t/' + table + '/' + id).then(function (j) { go(j.data || {}) })
    else {
      var def = {}; t.fields.forEach(function (f) { if (f.t === 'bool' && (f.k === 'visible')) def[f.k] = 1; if (f.k === 'status' && f.opts) def[f.k] = f.opts[0][0]; if (f.t === 'date') def[f.k] = new Date().toISOString().slice(0, 10) })
      if (table === 'news') def.category = 'news'
      go(def)
    }
  }
  function fieldHtml(f, v) {
    var full = ['textarea', 'richtext', 'image'].indexOf(f.t) >= 0 || f.k === 'title' || f.k === 'name'
    var lab = '<label>' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</label>'
    var help = f.help ? '<div class="help">' + esc(f.help) + '</div>' : ''
    var inner
    var val = v == null ? '' : v
    if (f.ro) inner = '<input type="text" readonly value="' + esc(val) + '">'
    else if (f.t === 'textarea') inner = '<textarea name="' + f.k + '">' + esc(val) + '</textarea>'
    else if (f.t === 'richtext') inner = rteHtml(f.k, val)
    else if (f.t === 'image') inner = imgFieldHtml(f.k, val)
    else if (f.t === 'bool') inner = '<label class="switch"><input type="checkbox" name="' + f.k + '" ' + (Number(val) ? 'checked' : '') + '><span></span></label>'
    else if (f.t === 'select') inner = '<select name="' + f.k + '"><option value="">—</option>' + f.opts.map(function (o) { return '<option value="' + esc(o[0]) + '" ' + (o[0] == val ? 'selected' : '') + '>' + esc(o[1]) + '</option>' }).join('') + '</select>'
    else if (f.t === 'edition') inner = '<select name="' + f.k + '"><option value="">— 不关联 —</option>' + EDITIONS.map(function (e) { return '<option value="' + e.id + '" ' + (e.id == val ? 'selected' : '') + '>' + e.year + ' · ' + esc(e.title) + '</option>' }).join('') + '</select>'
    else inner = '<input type="' + (f.t === 'number' ? 'number' : f.t === 'date' ? 'date' : f.t === 'url' ? 'url' : 'text') + '" name="' + f.k + '" value="' + esc(f.t === 'date' ? String(val).slice(0, 10) : val) + '"' + (f.t === 'number' ? ' step="any"' : '') + '>'
    return '<div class="fld ' + (full ? 'full' : '') + '">' + lab + inner + help + '</div>'
  }
  function imgFieldHtml(name, val) {
    return '<div class="img-field" data-img="' + name + '"><div class="preview" style="' + (val ? "background-image:url('" + esc(val) + "')" : '') + '">' + (val ? '' : '<i class="fa-regular fa-image"></i>') + '</div><div class="ctrl"><input type="text" name="' + name + '" value="' + esc(val) + '" placeholder="图片地址，可上传或从媒体库选择"><div class="row"><button type="button" class="btn btn-ghost btn-sm" data-up><i class="fa-solid fa-upload"></i>上传</button><button type="button" class="btn btn-ghost btn-sm" data-pick><i class="fa-solid fa-photo-film"></i>媒体库</button><button type="button" class="btn btn-ghost btn-sm" data-clear><i class="fa-solid fa-xmark"></i>清除</button><input type="file" accept="image/*" hidden></div></div></div>'
  }
  function rteHtml(name, val) {
    var b = function (cmd, ic, t, arg) { return '<button type="button" data-cmd="' + cmd + '"' + (arg ? ' data-arg="' + arg + '"' : '') + ' title="' + t + '"><i class="fa-solid ' + ic + '"></i></button>' }
    return '<div class="rte" data-rte="' + name + '"><div class="rte-bar">' + b('formatBlock', 'fa-heading', '标题', 'h3') + b('formatBlock', 'fa-paragraph', '段落', 'p') + '<span class="sep"></span>' + b('bold', 'fa-bold', '加粗') + b('italic', 'fa-italic', '斜体') + b('underline', 'fa-underline', '下划线') + '<span class="sep"></span>' +
      b('insertUnorderedList', 'fa-list-ul', '无序列表') + b('insertOrderedList', 'fa-list-ol', '有序列表') + b('formatBlock', 'fa-quote-left', '引用', 'blockquote') + b('justifyCenter', 'fa-align-center', '居中') + '<span class="sep"></span>' +
      b('createLink', 'fa-link', '链接') + '<button type="button" data-rimg title="插入图片"><i class="fa-solid fa-image"></i></button><button type="button" data-rpick title="从媒体库插入"><i class="fa-solid fa-photo-film"></i></button>' + b('removeFormat', 'fa-eraser', '清除格式') + '<span class="sep"></span><button type="button" data-src title="源码"><i class="fa-solid fa-code"></i></button><input type="file" accept="image/*" multiple hidden></div>' +
      '<div class="rte-area" contenteditable="true">' + (val || '<p><br></p>') + '</div><textarea class="rte-src"></textarea></div>'
  }
  function setImg(box, url) {
    box.querySelector('input[type=text]').value = url
    var pv = box.querySelector('.preview'); pv.style.backgroundImage = url ? "url('" + url + "')" : ''; pv.innerHTML = url ? '' : '<i class="fa-regular fa-image"></i>'
  }
  function bindFields(root) {
    $$('.img-field', root).forEach(function (box) {
      var file = box.querySelector('input[type=file]'), txt = box.querySelector('input[type=text]')
      box.querySelector('[data-up]').onclick = function () { file.click() }
      box.querySelector('[data-clear]').onclick = function () { setImg(box, '') }
      box.querySelector('[data-pick]').onclick = function () { pickMedia(function (u) { setImg(box, u) }) }
      txt.onchange = function () { setImg(box, txt.value.trim()) }
      file.onchange = function () { if (!file.files[0]) return; toast('上传中…'); upload(file.files[0]).then(function (u) { setImg(box, u); toast('上传成功') }).catch(function (e) { toast(e.message, 1) }) }
    })
    $$('.rte', root).forEach(function (r) {
      var area = r.querySelector('.rte-area'), src = r.querySelector('.rte-src'), file = r.querySelector('input[type=file]'), srcMode = false
      var insertImg = function (u) { area.focus(); document.execCommand('insertHTML', false, '<figure><img src="' + u + '" alt=""></figure><p><br></p>') }
      r.querySelector('.rte-bar').addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault() })
      r.querySelector('.rte-bar').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return
        if (b.hasAttribute('data-src')) { srcMode = !srcMode; if (srcMode) { src.value = area.innerHTML; src.style.display = 'block'; area.style.display = 'none' } else { area.innerHTML = src.value; src.style.display = 'none'; area.style.display = 'block' } return }
        if (b.hasAttribute('data-rimg')) return file.click()
        if (b.hasAttribute('data-rpick')) return pickMedia(insertImg)
        var cmd = b.getAttribute('data-cmd'), arg = b.getAttribute('data-arg')
        if (cmd === 'createLink') { arg = prompt('链接地址：', 'https://'); if (!arg) return }
        document.execCommand(cmd, false, arg || null)
      })
      file.onchange = function () {
        var fs = Array.prototype.slice.call(file.files); toast('上传中…')
        fs.reduce(function (p, f) { return p.then(function () { return upload(f).then(insertImg) }) }, Promise.resolve()).then(function () { toast('图片已插入') }).catch(function (e) { toast(e.message, 1) })
      }
      area.addEventListener('paste', function (e) {
        var items = (e.clipboardData || {}).items || []
        for (var i = 0; i < items.length; i++) if (items[i].type.indexOf('image') === 0) { e.preventDefault(); upload(items[i].getAsFile()).then(insertImg); return }
      })
      r._get = function () { return srcMode ? src.value : area.innerHTML }
    })
  }
  function collect(form, fields) {
    var d = {}
    fields.forEach(function (f) {
      if (f.ro) return
      if (f.t === 'richtext') { var r = form.querySelector('[data-rte="' + f.k + '"]'); d[f.k] = r._get() }
      else if (f.t === 'bool') d[f.k] = form.querySelector('[name="' + f.k + '"]').checked ? 1 : 0
      else { var el = form.querySelector('[name="' + f.k + '"]'); if (el) d[f.k] = el.value }
    })
    return d
  }

  /* ---------- 媒体选择器 ---------- */
  function pickMedia(cb) {
    var box = document.createElement('div'); box.className = 'modal show'; box.style.zIndex = 150
    box.innerHTML = '<div class="modal-box picker"><div class="modal-head"><h3>选择图片</h3><button class="icon-btn" data-x><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body"><div class="drop" data-drop><i class="fa-solid fa-cloud-arrow-up" style="font-size:24px"></i><br>点击或拖拽图片到这里上传<input type="file" accept="image/*" hidden multiple></div><div class="fld" style="margin-bottom:14px"><label>或使用站内已有图片路径 / 外部图片地址</label><div style="display:flex;gap:8px"><input type="text" placeholder="/static/img/... 或 https://..." data-url><button class="btn btn-gold btn-sm" data-use>使用</button></div></div><div class="media-grid" data-grid><div class="loading"><i class="fa-solid fa-spinner fa-spin"></i></div></div></div></div>'
    document.body.appendChild(box)
    var close = function () { box.remove() }
    var done = function (u) { close(); cb(u) }
    box.querySelector('[data-x]').onclick = close
    box.addEventListener('click', function (e) { if (e.target === box) close() })
    box.querySelector('[data-use]').onclick = function () { var u = box.querySelector('[data-url]').value.trim(); if (u) done(u) }
    var drop = box.querySelector('[data-drop]'), file = drop.querySelector('input')
    drop.onclick = function () { file.click() }
    var up = function (fs) { toast('上传中…'); Array.prototype.reduce.call(fs, function (p, f) { return p.then(function () { return upload(f) }) }, Promise.resolve()).then(function (u) { toast('上传成功'); done(u) }).catch(function (e) { toast(e.message, 1) }) }
    file.onchange = function () { up(file.files) }
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over') }
    drop.ondragleave = function () { drop.classList.remove('over') }
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); up(e.dataTransfer.files) }
    api('GET', '/api/admin/media').then(function (j) {
      var g = box.querySelector('[data-grid]')
      var builtin = ['brand/logo-full.png', 'brand/star.png', 'brand/bg-space.jpg', 'pdf/2024-group.jpg', 'pdf/launch-stage.jpg', 'pdf/launch-group.jpg', 'pdf/live-stage.jpg', 'pdf/graduate.jpg', 'pdf/trophy.jpg', 'pdf/film-museum.jpg', 'pdf/sign-bazhong.jpg', 'pdf/gala-dinner.jpg'].map(function (p) { return { url: '/static/img/' + p, filename: p } })
      var all = (j.data || []).concat(builtin)
      g.innerHTML = all.map(function (m) { return '<div class="media-item" data-u="' + esc(m.url) + '"><img src="' + esc(m.url) + '" loading="lazy"><div class="nm">' + esc(m.filename || m.key) + '</div></div>' }).join('')
      g.onclick = function (e) { var it = e.target.closest('[data-u]'); if (it) done(it.getAttribute('data-u')) }
    })
  }

  /* ---------- 站点设置（JSON 自动表单） ---------- */
  var IMG_KEYS = /(image|logo|background|star|qr|cover|photo|poster|icon_img)$/i
  var LABELS = { name: '名称', en_name: '英文名', full_name: '全称', slogan: '口号', logo: 'Logo', star: '星标图', company: '运营公司', address: '地址', phone: '电话', email: '邮箱', wechat_name: '公众号名称', wechat_qr: '公众号二维码', icp: 'ICP备案号', copyright: '版权信息', seo_keywords: 'SEO 关键词', seo_description: 'SEO 描述',
    year: '年份', edition_label: '届次标签', title: '标题', subtitle: '副标题', tagline: '标语', intro: '简介', background: '背景图', primary_text: '主按钮文字', primary_link: '主按钮链接', secondary_text: '次按钮文字', secondary_link: '次按钮链接', notice: '顶部公告',
    lead: '导语', paragraphs: '正文段落', company_title: '公司板块标题', company_text: '公司介绍', image: '配图', positioning: '定位亮点', text: '文字', num: '数值', unit: '单位', label: '标签', icon: '图标(FontAwesome)', items: '条目', deadline: '截止日期', sections: '章节',
    cn: '中文名', en: '英文名', date: '日期', role: '角色', names: '单位名称', channels: '传播渠道', media: '合作媒体', button_text: '按钮文字', button_link: '按钮链接' }
  var lbl = function (k) { return LABELS[k] || k }
  function jsonEditor(val, path) {
    if (Array.isArray(val)) {
      var isPrim = val.every(function (x) { return typeof x !== 'object' || x === null })
      var tpl = val.length ? val[0] : ''
      var h = '<div data-arr="' + path + '" data-prim="' + (isPrim ? 1 : 0) + '" data-tpl=\'' + esc(JSON.stringify(blank(tpl))) + '\'>'
      val.forEach(function (it, i) { h += arrItem(it, path + '.' + i, isPrim, i) })
      return h + '</div><button type="button" class="btn btn-ghost btn-sm" data-add="' + path + '"><i class="fa-solid fa-plus"></i> 添加一项</button>'
    }
    if (val && typeof val === 'object') {
      return '<div class="form-grid">' + Object.keys(val).map(function (k) {
        var v = val[k], p = path ? path + '.' + k : k
        if (v && typeof v === 'object') return '<div class="fld full"><label>' + esc(lbl(k)) + '</label>' + jsonEditor(v, p) + '</div>'
        return leaf(k, v, p)
      }).join('') + '</div>'
    }
    return leaf('', val, path)
  }
  function leaf(k, v, p) {
    var s = v == null ? '' : String(v)
    if (IMG_KEYS.test(k)) return '<div class="fld full"><label>' + esc(lbl(k)) + '</label>' + imgFieldHtml('__' + p, s).replace('name="__' + p + '"', 'data-path="' + p + '"') + '</div>'
    var long = s.length > 60 || /text|intro|lead|description|copyright/.test(k)
    return '<div class="fld ' + (long ? 'full' : '') + '">' + (k ? '<label>' + esc(lbl(k)) + '</label>' : '') + (long ? '<textarea data-path="' + p + '">' + esc(s) + '</textarea>' : '<input type="text" data-path="' + p + '" value="' + esc(s) + '">') + '</div>'
  }
  function arrItem(it, p, prim, i) {
    var ctl = '<div style="display:flex;gap:4px"><button type="button" class="icon-btn" data-up-item title="上移"><i class="fa-solid fa-arrow-up"></i></button><button type="button" class="icon-btn" data-down-item title="下移"><i class="fa-solid fa-arrow-down"></i></button><button type="button" class="icon-btn" data-rm-item title="删除" style="color:#e5484d"><i class="fa-solid fa-trash"></i></button></div>'
    if (prim) return '<div class="arr-item" data-item><div class="grow">' + (String(it).length > 50 ? '<textarea data-path="' + p + '" style="width:100%;min-height:60px;padding:8px;border:1px solid #e6e9f2;border-radius:8px">' + esc(it) + '</textarea>' : '<input type="text" data-path="' + p + '" value="' + esc(it) + '" style="width:100%;padding:8px 10px;border:1px solid #e6e9f2;border-radius:8px">') + '</div>' + ctl + '</div>'
    return '<div class="json-node" data-item><div class="jn-head"><span class="idx">#' + (i + 1) + '</span><span style="flex:1"></span>' + ctl + '</div>' + jsonEditor(it, p) + '</div>'
  }
  function blank(v) {
    if (Array.isArray(v)) return []
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = blank(v[k]) }); return o }
    return ''
  }
  // 从 DOM 重建 JSON：按 data-path 顺序写回
  function readJson(root, orig) {
    var out = JSON.parse(JSON.stringify(orig))
    // 先根据当前 DOM 的数组顺序重建数组
    var rebuild = function (container, base) {
      $$(':scope > [data-arr]', container)
    }
    var setPath = function (obj, path, val) {
      var ks = path.split('.'), o = obj
      for (var i = 0; i < ks.length - 1; i++) { var k = ks[i], nk = ks[i + 1]; if (o[k] == null) o[k] = /^\d+$/.test(nk) ? [] : {}; o = o[k] }
      o[ks[ks.length - 1]] = val
    }
    // 清空所有数组，再按 DOM 填充
    $$('[data-arr]', root).forEach(function (a) { setPath(out, a.getAttribute('data-arr'), []) })
    $$('[data-path]', root).forEach(function (el) { setPath(out, el.getAttribute('data-path'), el.value) })
    // 去除空洞
    var compact = function (v) { if (Array.isArray(v)) return v.filter(function (x) { return x !== undefined }).map(compact); if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { v[k] = compact(v[k]) }); return v } return v }
    return compact(out)
  }
  function reindex(root) {
    // 重新计算所有 data-path / data-arr 路径以匹配 DOM 顺序
    var walk = function (el, base) {
      $$(':scope > *', el).forEach(function (ch) {
        if (ch.hasAttribute('data-arr')) {
          var p = ch.getAttribute('data-arr')
          var items = $$(':scope > [data-item]', ch)
          items.forEach(function (it, i) {
            var np = p + '.' + i
            var idx = it.querySelector('.idx'); if (idx) idx.textContent = '#' + (i + 1)
            $$('[data-path],[data-arr],[data-add]', it).forEach(function (n) {
              ['data-path', 'data-arr', 'data-add'].forEach(function (attr) {
                var v = n.getAttribute(attr); if (!v) return
                var re = new RegExp('^' + p.replace(/\./g, '\\.') + '\\.\\d+')
                n.setAttribute(attr, v.replace(re, np))
              })
            })
          })
        }
        walk(ch)
      })
    }
    walk(root)
  }
  function settingsView(key) {
    setActive('settings', '站点设置')
    api('GET', '/api/admin/settings').then(function (j) {
      var map = {}; (j.data || []).forEach(function (r) { try { map[r.key] = JSON.parse(r.value) } catch (e) { map[r.key] = r.value } })
      key = key || 'site'
      var tabs = SCHEMA.settings.map(function (s) { return '<button class="' + (s[0] === key ? 'on' : '') + '" data-tab="' + s[0] + '">' + s[1] + '</button>' }).join('')
      var val = map[key] == null ? {} : map[key]
      view.innerHTML = '<div class="panel"><div class="panel-head"><h3><i class="fa-solid fa-sliders"></i> 站点设置</h3><span style="color:#97a0b8;font-size:12.5px">修改后点击保存，前台即时生效</span></div><div class="panel-body"><div class="set-tabs">' + tabs + '</div><form id="set-form">' + jsonEditor(val, '') + '</form><div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end"><a class="btn btn-ghost" href="/" target="_blank"><i class="fa-solid fa-eye"></i>预览</a><button class="btn btn-gold" id="save-set"><i class="fa-solid fa-floppy-disk"></i> 保存「' + SCHEMA.settings.find(function (s) { return s[0] === key })[1] + '」</button></div></div></div>'
      var form = $('#set-form')
      // 顶层数组的 path 为空字符串，修正
      if (Array.isArray(val)) { $$('[data-path]', form).forEach(function (n) { n.setAttribute('data-path', 'root' + n.getAttribute('data-path')) }); $$('[data-arr],[data-add]', form).forEach(function (n) { ['data-arr', 'data-add'].forEach(function (a) { var v = n.getAttribute(a); if (v !== null) n.setAttribute(a, 'root' + v) }) }) }
      bindSettingImgs(form)
      form.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return
        var item = b.closest('[data-item]')
        if (b.hasAttribute('data-rm-item')) { item.remove(); reindex(form) }
        else if (b.hasAttribute('data-up-item') && item.previousElementSibling) { item.parentNode.insertBefore(item, item.previousElementSibling); reindex(form) }
        else if (b.hasAttribute('data-down-item') && item.nextElementSibling) { item.parentNode.insertBefore(item.nextElementSibling, item); reindex(form) }
        else if (b.hasAttribute('data-add')) {
          var p = b.getAttribute('data-add'), arr = form.querySelector('[data-arr="' + p + '"]')
          var tpl = JSON.parse(arr.getAttribute('data-tpl') || '""'), n = $$(':scope > [data-item]', arr).length
          var tmp = document.createElement('div'); tmp.innerHTML = arrItem(tpl, p + '.' + n, arr.getAttribute('data-prim') === '1', n)
          arr.appendChild(tmp.firstChild); bindSettingImgs(arr)
        }
      }
      view.querySelector('.set-tabs').onclick = function (e) { var b = e.target.closest('[data-tab]'); if (b) location.hash = '#/settings/' + b.getAttribute('data-tab') }
      $('#save-set').onclick = function () {
        var wrap = Array.isArray(val) ? { root: val } : val
        var out = readJson(form, wrap)
        if (Array.isArray(val)) out = out.root || []
        api('PUT', '/api/admin/settings/' + key, { value: out }).then(function (r) { r.ok ? toast('已保存，前台已更新') : toast(r.error, 1) })
      }
    })
  }
  function bindSettingImgs(root) {
    $$('.img-field', root).forEach(function (box) {
      if (box._bound) return; box._bound = 1
      var file = box.querySelector('input[type=file]'), txt = box.querySelector('input[type=text]')
      box.querySelector('[data-up]').onclick = function () { file.click() }
      box.querySelector('[data-clear]').onclick = function () { setImg(box, '') }
      box.querySelector('[data-pick]').onclick = function () { pickMedia(function (u) { setImg(box, u) }) }
      txt.onchange = function () { setImg(box, txt.value.trim()) }
      file.onchange = function () { if (!file.files[0]) return; toast('上传中…'); upload(file.files[0]).then(function (u) { setImg(box, u); toast('上传成功') }).catch(function (e) { toast(e.message, 1) }) }
    })
  }

  /* ---------- 公众号导入 ---------- */
  function wechatView() {
    setActive('wechat', '公众号文章导入')
    view.innerHTML = '<div class="panel"><div class="panel-head"><h3><i class="fa-brands fa-weixin" style="color:#1aad19"></i> 一键导入微信公众号文章</h3></div><div class="panel-body">' +
      '<p style="color:#6b7593;margin-top:0">在微信中打开“迭代盛典”公众号文章 → 右上角 ··· → 复制链接，粘贴到下方即可。系统会自动抓取标题、正文、封面、发布时间，并把文中所有图片转存到本站媒体库（规避微信防盗链）。支持一次粘贴多条链接（每行一条）。</p>' +
      '<div class="fld full"><label>文章链接（每行一条）</label><textarea id="wx-urls" placeholder="https://mp.weixin.qq.com/s/xxxxxxxx" style="min-height:120px"></textarea></div>' +
      '<div style="display:flex;gap:14px;align-items:center;margin-top:12px;flex-wrap:wrap"><div class="fld"><label>导入分类</label><select id="wx-cat"><option value="wechat">公众号文章</option><option value="news">盛典动态</option><option value="media">媒体报道</option><option value="notice">通知公告</option></select></div><label style="display:flex;align-items:center;gap:8px;margin-top:18px"><label class="switch"><input type="checkbox" id="wx-img" checked><span></span></label> 转存文章图片</label><button class="btn btn-gold" id="wx-go" style="margin-left:auto;margin-top:18px"><i class="fa-solid fa-cloud-arrow-down"></i> 开始导入</button></div>' +
      '<div id="wx-log" style="margin-top:18px"></div></div></div>' +
      '<div class="panel"><div class="panel-head"><h3>已导入的公众号文章</h3><a class="btn btn-ghost btn-sm" style="margin-left:auto" href="#/t/news">管理全部新闻</a></div><div id="wx-list"></div></div>'
    var loadList = function () {
      api('GET', '/api/admin/t/news?category=wechat&size=50').then(function (j) {
        $('#wx-list').innerHTML = j.data.length ? '<table class="tbl"><tbody>' + j.data.map(function (n) { return '<tr><td><img class="thumb" src="' + esc(n.cover || '') + '"></td><td>' + esc(n.title) + '</td><td style="color:#97a0b8">' + esc(n.published_at || '') + '</td><td class="acts"><a class="btn btn-ghost btn-sm" target="_blank" href="/news/' + n.id + '">查看</a></td></tr>' }).join('') + '</tbody></table>' : '<div class="empty">暂无</div>'
      })
    }
    loadList()
    $('#wx-go').onclick = function () {
      var urls = $('#wx-urls').value.split(/\s+/).map(function (s) { return s.trim() }).filter(Boolean)
      if (!urls.length) return toast('请粘贴文章链接', 1)
      var log = $('#wx-log'), btn = this; btn.disabled = true; log.innerHTML = ''
      urls.reduce(function (p, u) {
        return p.then(function () {
          var line = document.createElement('div'); line.style.cssText = 'padding:8px 12px;border-radius:8px;margin-bottom:6px;background:#f7f8fb;font-size:13px'
          line.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在导入 ' + esc(u.slice(0, 60)) + '…'; log.appendChild(line)
          return api('POST', '/api/admin/import-wechat', { url: u, category: $('#wx-cat').value, save_images: $('#wx-img').checked }).then(function (j) {
            line.style.background = j.ok ? '#e3f6ec' : '#fde8e8'
            line.innerHTML = j.ok ? '<i class="fa-solid fa-circle-check" style="color:#1f9d63"></i> 《' + esc(j.title) + '》导入成功，转存图片 ' + j.images + ' 张 <a href="/news/' + j.id + '" target="_blank" style="color:#1e6fe0">查看</a>' : '<i class="fa-solid fa-circle-xmark" style="color:#e5484d"></i> ' + esc(j.error) + ' — ' + esc(u.slice(0, 60))
          })
        })
      }, Promise.resolve()).then(function () { btn.disabled = false; loadList() })
    }
  }

  /* ---------- 媒体库 ---------- */
  function mediaView() {
    setActive('media', '媒体库')
    view.innerHTML = '<div class="panel"><div class="panel-head"><h3><i class="fa-solid fa-photo-film"></i> 媒体库</h3><span style="color:#97a0b8;font-size:12.5px">图片存储于 Cloudflare R2，点击图片复制地址</span></div><div class="panel-body"><div class="drop" id="m-drop"><i class="fa-solid fa-cloud-arrow-up" style="font-size:26px"></i><br>点击或拖拽图片到这里批量上传<input type="file" accept="image/*" multiple hidden></div><div class="media-grid" id="m-grid"></div></div></div>'
    var load = function () {
      api('GET', '/api/admin/media').then(function (j) {
        $('#m-grid').innerHTML = (j.data || []).length ? j.data.map(function (m) { return '<div class="media-item" data-u="' + esc(m.url) + '"><img src="' + esc(m.url) + '" loading="lazy"><div class="nm">' + esc(m.filename || m.key) + ' · ' + Math.round((m.size || 0) / 1024) + 'KB</div><button class="del" data-mdel="' + m.id + '"><i class="fa-solid fa-trash"></i></button></div>' }).join('') : '<div class="empty" style="grid-column:1/-1">还没有上传的图片</div>'
      })
    }
    var drop = $('#m-drop'), file = drop.querySelector('input')
    var up = function (fs) { var n = 0; toast('上传中…'); Array.prototype.reduce.call(fs, function (p, f) { return p.then(function () { return upload(f).then(function () { n++ }) }) }, Promise.resolve()).then(function () { toast('已上传 ' + n + ' 张'); load() }).catch(function (e) { toast(e.message, 1); load() }) }
    drop.onclick = function () { file.click() }; file.onchange = function () { up(file.files) }
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over') }
    drop.ondragleave = function () { drop.classList.remove('over') }
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); up(e.dataTransfer.files) }
    $('#m-grid').onclick = function (e) {
      var d = e.target.closest('[data-mdel]')
      if (d) { e.stopPropagation(); return confirmBox('删除该图片？已引用此图的页面将无法显示').then(function (ok) { if (ok) api('DELETE', '/api/admin/media/' + d.getAttribute('data-mdel')).then(load) }) }
      var it = e.target.closest('[data-u]'); if (!it) return
      var u = location.origin + it.getAttribute('data-u')
      navigator.clipboard ? navigator.clipboard.writeText(it.getAttribute('data-u')).then(function () { toast('已复制：' + it.getAttribute('data-u')) }) : prompt('图片地址', u)
    }
    load()
  }

  /* ---------- 账号 ---------- */
  function adminsView() {
    setActive('admins', '账号管理')
    var isSuper = window.__ADMIN__.role === 'super'
    view.innerHTML = '<div class="two-col"><div class="panel"><div class="panel-head"><h3><i class="fa-solid fa-users-gear"></i> 管理员列表</h3></div><div id="ad-list"></div></div>' +
      '<div><div class="panel"><div class="panel-head"><h3><i class="fa-solid fa-key"></i> 修改我的密码</h3></div><div class="panel-body"><form id="pw-form" class="form-grid"><div class="fld full"><label>原密码</label><input type="password" name="old_password" required></div><div class="fld full"><label>新密码（至少8位）</label><input type="password" name="new_password" required minlength="8"></div><div class="full"><button class="btn btn-gold">更新密码</button></div></form></div></div>' +
      (isSuper ? '<div class="panel"><div class="panel-head"><h3><i class="fa-solid fa-user-plus"></i> 新增管理员</h3></div><div class="panel-body"><form id="ad-form" class="form-grid"><div class="fld"><label>用户名</label><input type="text" name="username" required></div><div class="fld"><label>显示名称</label><input type="text" name="display_name"></div><div class="fld"><label>初始密码（至少8位）</label><input type="password" name="password" required minlength="8"></div><div class="fld"><label>角色</label><select name="role"><option value="editor">编辑</option><option value="super">超级管理员</option></select></div><div class="full"><button class="btn btn-gold">创建</button></div></form></div></div>' : '') + '</div></div>'
    var load = function () {
      api('GET', '/api/admin/admins').then(function (j) {
        $('#ad-list').innerHTML = '<table class="tbl tbl-cards"><thead><tr><th>用户名</th><th>名称</th><th>角色</th><th>最近登录</th><th></th></tr></thead><tbody>' + j.data.map(function (a) { return '<tr><td>' + esc(a.username) + '</td><td>' + esc(a.display_name) + '</td><td><span class="pill ' + (a.role === 'super' ? 'yes' : '') + '">' + (a.role === 'super' ? '超级管理员' : '编辑') + '</span></td><td style="color:#97a0b8">' + esc((a.last_login || '—').slice(0, 16)) + '</td><td class="acts">' + (isSuper && a.id !== window.__ADMIN__.id ? '<button class="btn btn-danger btn-sm" data-adel="' + a.id + '"><i class="fa-solid fa-trash"></i></button>' : '') + '</td></tr>' }).join('') + '</tbody></table>'
      })
    }
    load()
    $('#ad-list').onclick = function (e) { var b = e.target.closest('[data-adel]'); if (b) confirmBox('确认删除该管理员？').then(function (ok) { if (ok) api('DELETE', '/api/admin/admins/' + b.getAttribute('data-adel')).then(function (j) { j.ok ? load() : toast(j.error, 1) }) }) }
    $('#pw-form').onsubmit = function (e) { e.preventDefault(); var f = Object.fromEntries(new FormData(this)); api('POST', '/api/admin/password', f).then(function (j) { j.ok ? (toast('密码已更新'), e.target.reset()) : toast(j.error, 1) }) }
    var af = $('#ad-form'); af && (af.onsubmit = function (e) { e.preventDefault(); var f = Object.fromEntries(new FormData(this)); api('POST', '/api/admin/admins', f).then(function (j) { j.ok ? (toast('已创建'), e.target.reset(), load()) : toast(j.error, 1) }) })
  }

  /* ---------- 启动 ---------- */
  function loadEditions() { return api('GET', '/api/admin/editions-options').then(function (j) { EDITIONS = j.data || [] }) }
  var mask = document.createElement('div'); mask.className = 'sb-mask'; document.body.appendChild(mask)
  var sbSet = function (o) { $('#sidebar').classList.toggle('open', o); mask.classList.toggle('show', o) }
  $('#sb-toggle').onclick = function () { sbSet(!$('#sidebar').classList.contains('open')) }
  mask.onclick = function () { sbSet(false) }
  window.__sbClose = function () { sbSet(false) }
  $('#logout-btn').onclick = function () { api('POST', '/api/auth/logout').then(function () { location.href = '/admin/login' }) }
  Promise.all([api('GET', '/api/admin/schema'), loadEditions()]).then(function (r) {
    SCHEMA = r[0]; renderNav(); refreshBadges(); route()
    window.addEventListener('hashchange', route)
  })
})()
