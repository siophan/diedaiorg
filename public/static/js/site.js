(function () {
  // 导航滚动态
  var header = document.getElementById('site-header')
  var toTop = document.getElementById('to-top')
  function onScroll() {
    var y = window.scrollY
    if (header) header.classList.toggle('scrolled', y > 30)
    if (toTop) toTop.classList.toggle('show', y > 600)
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll()
  toTop && toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }) })

  // 移动菜单
  var mb = document.getElementById('menu-btn'), nav = document.getElementById('main-nav')
  mb && mb.addEventListener('click', function () { nav.classList.toggle('open') })

  // 进入视口动画
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
  }, { threshold: 0.12 }) : null
  document.querySelectorAll('.reveal').forEach(function (el) { io ? io.observe(el) : el.classList.add('in') })

  // 数字滚动
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var raw = el.getAttribute('data-count'), target = parseInt(raw.replace(/,/g, ''), 10)
    if (!target) return
    var obs = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; obs.disconnect()
      var t0 = performance.now(), dur = 1600
      function step(t) {
        var p = Math.min(1, (t - t0) / dur), v = Math.floor(target * (1 - Math.pow(1 - p, 3)))
        el.textContent = v.toLocaleString('en-US'); if (p < 1) requestAnimationFrame(step); else el.textContent = raw
      }
      requestAnimationFrame(step)
    })
    obs.observe(el)
  })

  // 倒计时
  var cd = document.getElementById('countdown')
  if (cd) {
    var end = new Date(cd.getAttribute('data-end') + 'T23:59:59+08:00').getTime()
    var tick = function () {
      var d = Math.max(0, end - Date.now())
      var s = Math.floor(d / 1000)
      cd.querySelector('[data-d]').textContent = Math.floor(s / 86400)
      cd.querySelector('[data-h]').textContent = String(Math.floor(s % 86400 / 3600)).padStart(2, '0')
      cd.querySelector('[data-m]').textContent = String(Math.floor(s % 3600 / 60)).padStart(2, '0')
      cd.querySelector('[data-s]').textContent = String(s % 60).padStart(2, '0')
    }
    tick(); setInterval(tick, 1000)
  }

  // 灯箱
  var lb = document.getElementById('lightbox'), lbImg = lb && lb.querySelector('img'), lbCap = lb && lb.querySelector('.lb-cap')
  var group = [], idx = 0
  function show(i) { idx = (i + group.length) % group.length; var a = group[idx]; lbImg.src = a.getAttribute('href'); lbCap.textContent = a.getAttribute('data-cap') || ''; lb.classList.add('show') }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-lightbox]')
    if (!a) return
    e.preventDefault()
    group = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox="' + a.getAttribute('data-lightbox') + '"]'))
    show(group.indexOf(a))
  })
  if (lb) {
    lb.querySelector('.lb-close').onclick = function () { lb.classList.remove('show') }
    lb.querySelector('.lb-prev').onclick = function () { show(idx - 1) }
    lb.querySelector('.lb-next').onclick = function () { show(idx + 1) }
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.classList.remove('show') })
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('show')) return
      if (e.key === 'Escape') lb.classList.remove('show')
      if (e.key === 'ArrowLeft') show(idx - 1)
      if (e.key === 'ArrowRight') show(idx + 1)
    })
  }

  // 前台表单（报名 / 作品提交 / 留言）
  document.querySelectorAll('form[data-api]').forEach(function (form) {
    var box = form.querySelector('.form-msg')
    // 海报上传
    form.querySelectorAll('.upload-box').forEach(function (ub) {
      var input = ub.querySelector('input[type=file]'), hidden = form.querySelector('input[name="' + ub.getAttribute('data-target') + '"]')
      ub.addEventListener('click', function (e) { if (e.target !== input) input.click() })
      input.addEventListener('change', function () {
        var f = input.files[0]; if (!f) return
        if (f.size > 5 * 1024 * 1024) { alert('图片不能超过 5MB'); return }
        var fd = new FormData(); fd.append('file', f)
        ub.querySelector('.ub-text').textContent = '上传中…'
        fetch('/api/public/upload', { method: 'POST', body: fd }).then(function (r) { return r.json() }).then(function (j) {
          if (!j.ok) throw new Error(j.error || '上传失败')
          hidden.value = j.url
          var im = ub.querySelector('img'); if (!im) { im = document.createElement('img'); ub.insertBefore(im, ub.firstChild) }
          im.src = j.url; ub.querySelector('.ub-text').textContent = '已上传，点击可更换'
        }).catch(function (err) { ub.querySelector('.ub-text').textContent = err.message })
      })
    })
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var btn = form.querySelector('[type=submit]'), data = {}
      new FormData(form).forEach(function (v, k) { if (typeof v === 'string') data[k] = v.trim() })
      btn.disabled = true; var old = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 提交中…'
      fetch(form.getAttribute('data-api'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (!j.ok) throw new Error(j.error || '提交失败，请稍后重试')
          var ok = form.getAttribute('data-success') || '提交成功！'
          form.parentNode.innerHTML = '<div class="gold-frame success-box"><div class="big"><i class="fa-solid fa-circle-check"></i></div><h2 class="gold-text serif" style="letter-spacing:4px">' + ok + '</h2>' +
            (j.code ? '<p style="color:var(--muted)">请妥善保存您的编号，可用于查询审核进度</p><div class="code">' + j.code + '</div>' : '<p style="color:var(--muted)">我们会尽快与您联系</p>') +
            '<div class="hero-actions" style="margin-top:18px"><a class="btn btn-line" href="/">返回首页</a>' + (j.code ? '<a class="btn btn-gold" href="/query?code=' + j.code + '">查询进度</a>' : '') + '</div></div>'
          window.scrollTo({ top: 200, behavior: 'smooth' })
        })
        .catch(function (err) {
          box.innerHTML = '<div class="alert alert-err"><i class="fa-solid fa-triangle-exclamation"></i> ' + err.message + '</div>'
          btn.disabled = false; btn.innerHTML = old
        })
    })
  })
})()
