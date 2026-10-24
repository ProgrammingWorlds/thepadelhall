/* ============================================================
   THE PADEL HALL — script.js
   المعمارية:
   1) أساسيات تعمل دائماً بدون مكتبات (بريلودر، ظهور، عدادات، قائمة...)
   2) تحسينات اختيارية: GSAP/ScrollTrigger + Three.js — مع تحميل احتياطي
   3) شبكات أمان متعددة: الصفحة لن تبقى مقفولة أبداً
   ============================================================ */
(function () {
  'use strict';

  var doc = document, html = doc.documentElement, body = doc.body;

  /* ---------- أدوات ---------- */
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function bind(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }

  var finePointer   = matchMedia('(pointer:fine)').matches;
  var reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function hasST()    { return !!(window.gsap && window.ScrollTrigger); }
  function hasTHREE() { return !!window.THREE; }

  /* وضع احتياطي بالـ CSS حتى تتأكد المكتبات */
  if (!hasST())    html.classList.add('no-st');
  if (!hasTHREE()) html.classList.add('no-three');

  /* ============================================================
     0) شبكة الأمان: الصفحة تُفتح دائماً
     ============================================================ */
  var revealed = false;
  function revealPage() {
    if (revealed) return;
    revealed = true;
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    var pre = $('#preloader');
    if (pre) {
      pre.classList.add('is-done');
      setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 1000);
    }
  }
  setTimeout(revealPage, 4500); // لو فشل كل شيء — تفتح بعد 4.5 ثانية

  /* ============================================================
     1) البريلودر — عدّاد JS خالص، بدون GSAP ولا أي اعتمادية
     ============================================================ */
  function initPreloader() {
    var count = $('#preCount'), bar = $('#preBar');
    var DUR = reducedMotion ? 250 : 1600;
    var t0 = performance.now();
    (function tick(now) {
      var p = clamp((now - t0) / DUR, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      if (count) count.textContent = ('00' + Math.round(eased * 100)).slice(-3);
      if (bar) bar.style.transform = 'scaleX(' + eased + ')';
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(revealPage, 250);
    })(t0);
  }

  /* ============================================================
     2) الفيديوهات: تشغيل/إيقاف حسب الظهور
     ============================================================ */
  function initVideos() {
    var vids = $$('video');
    if (!hasIO) { vids.forEach(function (v) { var p = v.play(); p && p.catch && p.catch(function(){}); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { var p = e.target.play(); p && p.catch && p.catch(function(){}); }
        else e.target.pause();
      });
    }, { threshold: 0.15 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ============================================================
     3) توست
     ============================================================ */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    var m = $('#toastMsg'); if (m) m.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }

  /* ============================================================
     4) قائمة الموبايل (CSS transitions — بدون مكتبات)
     ============================================================ */
  function initMenu() {
    var burger = $('#burger'), menu = $('#menu'), nav = $('#nav');
    if (!burger || !menu) return;
    var open = false;
    function set(v) {
      open = v;
      burger.classList.toggle('open', v);
      menu.classList.toggle('open', v);
      if (nav) nav.classList.toggle('on-menu', v);
      burger.setAttribute('aria-expanded', String(v));
      menu.setAttribute('aria-hidden', String(!v));
      body.classList.toggle('menu-open', v);
    }
    bind(burger, 'click', function () { set(!open); });
    bind(menu, 'click', function (e) { if (e.target.closest('a')) set(false); });
    bind(doc, 'keydown', function (e) { if (e.key === 'Escape' && open) set(false); });
  }

  /* ============================================================
     5) روابط الأنكور + زر العودة للأعلى
     ============================================================ */
  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      bind(a, 'click', function (e) {
        var id = a.getAttribute('href');
        if (id && id.length > 1) {
          var t = $(id);
          if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); }
        }
      });
    });
    bind($('#toTop'), 'click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ============================================================
     6) حالة النافبار عند التمرير
     ============================================================ */
  function initNavState() {
    var nav = $('#nav'); if (!nav) return;
    function upd() { nav.classList.toggle('scrolled', (window.scrollY || 0) > 60); }
    bind(window, 'scroll', upd, { passive: true }); upd();
  }

  /* ============================================================
     7) الكرسور المخصص — vanilla rAF
     ============================================================ */
  function initCursor() {
    if (!finePointer) return;
    var wrap = $('#cursor'); if (!wrap) return;
    html.classList.add('has-cursor');
    var dot = $('#cDot'), ring = $('#cRing'), label = $('#cLabel');
    var x = -100, y = -100, rx = -100, ry = -100;
    bind(window, 'mousemove', function (e) { x = e.clientX; y = e.clientY; });
    (function loop() {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      if (dot)  dot.style.transform  = 'translate(' + (x - 4)  + 'px,' + (y - 4)  + 'px)';
      if (ring) ring.style.transform = 'translate(' + (rx - 21) + 'px,' + (ry - 21) + 'px)';
      requestAnimationFrame(loop);
    })();
    doc.addEventListener('mouseover', function (e) {
      var hover = e.target.closest('a,button');
      var drag  = e.target.closest('[data-cursor="drag"]');
      wrap.classList.toggle('is-hover', !!hover && !drag);
      wrap.classList.toggle('is-drag',  !!drag && !hover);
      if (label) label.textContent = (drag && !hover) ? 'DRAG' : '';
    });
  }

  /* ============================================================
     8) العدادات — vanilla (الأرقام ظاهرة أصلاً بالـ HTML)
     ============================================================ */
  function initCounters() {
    var els = $$('.cnt'); if (!els.length) return;
    if (!hasIO || reducedMotion) return; // تبقى الأرقام النهائية كما هي
    els.forEach(function (el) { el.textContent = '0'; }); // تصفير آمن لأن الأنيميشن مضمون
    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var comma  = el.hasAttribute('data-comma');
      var t0 = performance.now(), DUR = 1600;
      (function tick(now) {
        var p = clamp((now - t0) / DUR, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        var n = Math.round(target * e);
        el.textContent = comma ? n.toLocaleString('en-US') : String(n);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     9) المانيفستو — إضاءة الكلمات مع التمرير (vanilla)
     ============================================================ */
  function initManifesto() {
    var el = $('#manifesto'); if (!el) return;
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var s = doc.createElement('span'); s.className = 'w'; s.textContent = part;
            words.push(s); frag.appendChild(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(el);
    if (!words.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var r = el.getBoundingClientRect();
      var p = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.45 + r.height * 0.5), 0, 1);
      var n = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('lit', i < n);
    }
    bind(window, 'scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ============================================================
     10) الظهور عند التمرير — IO + كلاسات CSS (بدون مكتبات)
     ============================================================ */
  function initReveals() {
    var els = $$('[data-reveal],[data-lines]'); if (!els.length) return;
    if (!hasIO) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     11) معاينة الجلسات تتبع الكرسور — vanilla
     ============================================================ */
  function initSessionsPreview() {
    if (!finePointer) return;
    var list = $('#sessions'), fp = $('#floatPreview');
    if (!list || !fp) return;
    var imgs = $$('.fp-img', fp);
    var x = 0, y = 0, tx = 0, ty = 0;
    bind(list, 'mousemove', function (e) { tx = e.clientX; ty = e.clientY; });
    $$('#sessions .session').forEach(function (row, i) {
      bind(row, 'mouseenter', function () {
        imgs.forEach(function (im, j) { im.classList.toggle('on', i === j); });
        fp.classList.add('show');
      });
    });
    bind(list, 'mouseleave', function () { fp.classList.remove('show'); });
    (function loop() {
      x += (tx - x) * 0.16; y += (ty - y) * 0.16;
      if (fp.classList.contains('show')) {
        fp.style.left = (x + 26) + 'px';
        fp.style.top  = (y - fp.offsetHeight / 2) + 'px';
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ============================================================
     12) ميلان منتجات المتجر — vanilla
     ============================================================ */
  function initTilt() {
    if (!finePointer || reducedMotion) return;
    $$('.product figure').forEach(function (f) {
      bind(f, 'pointermove', function (e) {
        var b = f.getBoundingClientRect();
        var rxx = ((e.clientY - b.top) / b.height - 0.5) * -10;
        var ryy = ((e.clientX - b.left) / b.width - 0.5) * 12;
        f.style.transform = 'perspective(900px) rotateX(' + rxx + 'deg) rotateY(' + ryy + 'deg)';
      });
      bind(f, 'pointerleave', function () {
        f.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  /* ============================================================
     13) أزرار: صوت الفيلم + نسخ اليوزرنيم
     ============================================================ */
  function initButtons() {
    var fv = $('#filmVideo'), sBtn = $('#soundBtn');
    if (fv && sBtn) {
      bind(sBtn, 'click', function () {
        fv.muted = !fv.muted;
        if (!fv.muted) { var p = fv.play(); p && p.catch && p.catch(function(){}); }
        sBtn.classList.toggle('is-on', !fv.muted);
        toast(fv.muted ? 'Sound off' : 'Sound on');
      });
    }
    var copy = $('#copyHandle');
    bind(copy, 'click', function () {
      var txt = '@thepadelhall';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(
          function () { toast('@thepadelhall copied — see you there'); },
          function () { toast('Find us: @thepadelhall'); }
        );
      } else toast('Find us: @thepadelhall');
    });
  }

  /* ============================================================
     14) تحسينات GSAP/ScrollTrigger (اختيارية بالكامل)
     ============================================================ */
  function initScrollFX() {

    // تلاشي الملعب مع النزول
    gsap.to('#courtWrap', {
      opacity: 0.12, yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true }
    });

    // باراللاكس للوسائط
    $$('.plx img, .plx video').forEach(function (m) {
      gsap.fromTo(m, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: m.closest('.plx'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    var mm = gsap.matchMedia();

    // معرض أفقي مثبّت — سطح المكتب فقط
    mm.add('(min-width: 861px)', function () {
      var track = $('#galTrack'); if (!track) return;
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: '#moments', start: 'top top',
          end: function () { return '+=' + dist(); },
          scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: function (s) {
            var b = $('#galBar');
            if (b) b.style.transform = 'scaleX(' + s.progress + ')';
          }
        }
      });
      $$('.gal-imgwrap img').forEach(function (img) {
        gsap.fromTo(img, { xPercent: -6 }, {
          xPercent: 6, ease: 'none',
          scrollTrigger: {
            trigger: img.closest('.gal-panel'), containerAnimation: tween,
            start: 'left right', end: 'right left', scrub: true
          }
        });
      });
    });

    // الفيلم يتوسّع لملء الشاشة — سطح المكتب فقط
    mm.add('(min-width: 861px)', function () {
      if (!$('#expFrame')) return;
      gsap.timeline({
        scrollTrigger: {
          trigger: '#experience', start: 'top top', end: '+=170%',
          scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true
        }
      })
      .fromTo('#expFrame',
        { width: function () { return innerWidth * 0.42 + 'px'; },
          height: function () { return innerHeight * 0.56 + 'px'; },
          borderRadius: '18px' },
        { width: function () { return innerWidth + 'px'; },
          height: function () { return innerHeight + 'px'; },
          borderRadius: '0px', ease: 'none' }, 0)
      .fromTo('#filmVideo', { scale: 1.25 }, { scale: 1, ease: 'none' }, 0)
      .fromTo('.exp-title', { y: 70, opacity: 0 }, { y: 0, opacity: 1, ease: 'none' }, 0)
      .fromTo('.exp-cap', { opacity: 0 }, { opacity: 1, ease: 'none' }, 0.5);
    });

    // أزرار مغناطيسية
    if (finePointer) {
      $$('.magnet').forEach(function (el) {
        var qx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
        var qy = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
        bind(el, 'mousemove', function (e) {
          var b = el.getBoundingClientRect();
          qx((e.clientX - b.left - b.width / 2) * 0.3);
          qy((e.clientY - b.top - b.height / 2) * 0.3);
        });
        bind(el, 'mouseleave', function () {
          gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,.4)' });
        });
      });
    }
  }

  /* ============================================================
     15) الملعب الزجاجي 3D — Three.js (اختياري + بديل ثابت)
     ============================================================ */
  function initCourt() {
    var canvas = $('#courtCanvas'), wrap = $('#courtWrap'), hero = $('#home');
    if (!canvas || !wrap || !hero) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { html.classList.add('no-three'); return; }
    html.classList.remove('no-three'); // نجح التهيئة — أخفِ البديل الثابت
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0b09, 26, 70);
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 160);
    var camX = 13, camY = 8;
    camera.position.set(camX, camY, 17);

    var world = new THREE.Group();
    scene.add(world);

    var VOLT = 0xd8ff3a, BONE = 0xefeae0;
    var HX = 5, HZ = 10, WH = 3, BR = 0.22; // نصف العرض/الطول، ارتفاع الجدران، نصف قطر الكرة

    // أرضية + شبكة محيطية
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2),
      new THREE.MeshBasicMaterial({ color: 0x11110d }));
    floor.rotation.x = -Math.PI / 2; world.add(floor);
    var grid = new THREE.GridHelper(90, 45, 0x26261f, 0x191914);
    grid.position.y = -0.02; world.add(grid);

    // خطوط
    function line(points, color, opacity) {
      var pts = points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); });
      var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity }));
      world.add(l);
    }
    line([[-HX, .02, -HZ], [HX, .02, -HZ], [HX, .02, HZ], [-HX, .02, HZ], [-HX, .02, -HZ]], BONE, .85);
    line([[-HX, .02, -3.5], [HX, .02, -3.5]], BONE, .5);
    line([[-HX, .02,  3.5], [HX, .02,  3.5]], BONE, .5);
    line([[0, .02, -3.5], [0, .02, 3.5]], BONE, .5);

    // جدران زجاجية بحواف فسفورية
    function glass(w, h, x, z, ry) {
      var g = new THREE.Group();
      var pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: 0xdfe9dc, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false }));
      pane.position.y = h / 2;
      var edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
        new THREE.LineBasicMaterial({ color: VOLT, transparent: true, opacity: 0.85 }));
      edges.position.y = h / 2;
      var mpts = [], n = Math.max(1, Math.round(w / 2.5));
      for (var i = 1; i < n; i++) {
        var px = -w / 2 + i * (w / n);
        mpts.push(new THREE.Vector3(px, 0, 0), new THREE.Vector3(px, h, 0));
      }
      var mull = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(mpts),
        new THREE.LineBasicMaterial({ color: BONE, transparent: true, opacity: 0.3 }));
      g.add(pane); g.add(edges); g.add(mull);
      g.position.set(x, 0, z); g.rotation.y = ry;
      world.add(g);
    }
    glass(HX * 2, WH, 0, -HZ, 0);
    glass(HX * 2, WH, 0,  HZ, 0);
    glass(HZ * 2, WH, -HX, 0, Math.PI / 2);
    glass(HZ * 2, WH,  HX, 0, Math.PI / 2);

    // الشبكة
    var net = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2 - 0.4, 0.88, 24, 4),
      new THREE.MeshBasicMaterial({ color: BONE, wireframe: true, transparent: true, opacity: 0.25 }));
    net.position.set(0, 0.44, 0); world.add(net);
    line([[-HX, .9, 0], [HX, .9, 0]], BONE, .9);
    line([[-HX, 0, 0], [-HX, .9, 0]], BONE, .9);
    line([[ HX, 0, 0], [ HX, .9, 0]], BONE, .9);

    // الكرة + توهج + ظل + أثر
    var ball = new THREE.Mesh(new THREE.SphereGeometry(BR, 24, 24),
      new THREE.MeshBasicMaterial({ color: VOLT }));
    ball.position.set(0, BR, 4); world.add(ball);
    var glow = new THREE.Mesh(new THREE.SphereGeometry(BR * 1.9, 16, 16),
      new THREE.MeshBasicMaterial({ color: VOLT, transparent: true, opacity: 0.22 }));
    ball.add(glow);
    var shadow = new THREE.Mesh(new THREE.CircleGeometry(BR * 1.2, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; world.add(shadow);

    var TN = 40, tpos = new Float32Array(TN * 3), k;
    for (k = 0; k < TN; k++) { tpos[k * 3] = 0; tpos[k * 3 + 1] = BR; tpos[k * 3 + 2] = 4; }
    var tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3));
    world.add(new THREE.Line(tgeo, new THREE.LineBasicMaterial({ color: VOLT, transparent: true, opacity: 0.35 })));

    // فيزياء الكرة
    var vel = new THREE.Vector3(3.5, 9, 6), ballScale = 1;
    function physics(dt) {
      vel.y -= 28 * dt;
      ball.position.addScaledVector(vel, dt);
      var p = ball.position;
      if (p.y < BR) {
        p.y = BR; vel.y = Math.abs(vel.y) * 0.8;
        if (vel.y < 4.5) { // ارتداد جديد حتى لا تموت الكرة
          vel.y = 6.5 + Math.random() * 5;
          vel.x += (Math.random() - 0.5) * 2.5;
          vel.z += (Math.random() - 0.5) * 2.5;
        }
      }
      if (Math.abs(p.x) > HX - BR) { p.x = (p.x > 0 ? 1 : -1) * (HX - BR); vel.x *= -0.92; }
      if (Math.abs(p.z) > HZ - BR) { p.z = (p.z > 0 ? 1 : -1) * (HZ - BR); vel.z *= -0.92; }
      if (Math.abs(p.z) < BR && p.y < 0.95) { p.z = (p.z >= 0 ? 1 : -1) * BR; vel.z *= -0.7; } // شبكة
      var sp = vel.length(); if (sp > 30) vel.multiplyScalar(30 / sp);

      for (k = TN - 1; k > 0; k--) {
        tpos[k * 3] = tpos[(k - 1) * 3]; tpos[k * 3 + 1] = tpos[(k - 1) * 3 + 1]; tpos[k * 3 + 2] = tpos[(k - 1) * 3 + 2];
      }
      tpos[0] = p.x; tpos[1] = p.y; tpos[2] = p.z;
      tgeo.attributes.position.needsUpdate = true;

      shadow.position.x = p.x; shadow.position.z = p.z;
      var h = clamp((p.y - BR) / 6, 0, 1);
      shadow.material.opacity = 0.42 * (1 - h);
      var s = 1 + h * 1.7; shadow.scale.set(s, s, 1);

      ballScale += (1 - ballScale) * 0.1;
      ball.scale.setScalar(ballScale);
    }

    // سحب للدوران + نقرة للسماش
    var rotY = -0.6, rotX = 0.16, tRotY = -0.6, tRotX = 0.16;
    var dragging = false, moved = 0, lx = 0, ly = 0, lastAct = 0;
    var mx = 0, my = 0;

    bind(hero, 'pointerdown', function (e) {
      if (e.target.closest('a,button')) return;
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
      lastAct = performance.now();
    });
    bind(window, 'pointermove', function (e) {
      mx = (e.clientX / innerWidth - 0.5) * 2;
      my = (e.clientY / innerHeight - 0.5) * 2;
      if (!dragging) return;
      var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      tRotY += dx * 0.0045;
      tRotX = clamp(tRotX + dy * 0.003, -0.05, 0.6);
      moved += Math.abs(dx) + Math.abs(dy);
      lastAct = performance.now();
    });
    bind(window, 'pointerup', function () {
      if (!dragging) return; dragging = false;
      if (moved < 8) { // نقرة = سماش
        vel.y = 10 + Math.random() * 4;
        vel.x += (Math.random() - 0.5) * 4;
        vel.z += (Math.random() - 0.5) * 4;
        ballScale = 1.45;
      }
    });

    // أبعاد متجاوبة
    function resize() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      var mobile = w < 861;
      world.scale.setScalar(mobile ? 0.5 : 0.8);
      world.position.x = mobile ? 0 : 1.2;
    }
    bind(window, 'resize', resize); resize();

    // إيقاف الرسم خارج الشاشة
    var active = true;
    if (hasIO) {
      new IntersectionObserver(function (es) { active = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
    }

    // حلقة الرسم
    var prev = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
      if (!active) return;
      if (!dragging && !reducedMotion && now - lastAct > 2600) tRotY += dt * 0.12; // دوران تلقائي عند السكون
      rotY += (tRotY - rotY) * 0.08; rotX += (tRotX - rotX) * 0.08;
      world.rotation.y = rotY; world.rotation.x = rotX;
      camX += (13 + mx * 0.9 - camX) * 0.04;  // باراللاكس
      camY += (8  - my * 0.5 - camY) * 0.04;
      camera.position.set(camX, camY, 17);
      camera.lookAt(0, 1.1, 0);
      if (!reducedMotion) physics(dt);
      renderer.render(scene, camera);
    })(prev);
  }

  /* ============================================================
     16) تشغيل التحسينات + تحميل احتياطي للمكتبات
     ============================================================ */
  var enhanced = false;
  function startEnhancements() {
    if (enhanced) return;
    enhanced = true;
    if (hasST()) {
      html.classList.remove('no-st');
      try { initScrollFX(); }
      catch (e) { html.classList.add('no-st'); console.warn('ScrollFX skipped:', e); }
    }
    if (hasTHREE()) {
      try { initCourt(); }
      catch (e) { html.classList.add('no-three'); console.warn('3D skipped:', e); }
    }
    function refresh() { if (hasST()) ScrollTrigger.refresh(); }
    bind(window, 'load', refresh);
    setTimeout(refresh, 2500);
  }

  // لو jsdelivr فشل → جرّب unpkg تلقائياً
  function loadFallbacks(done) {
    var called = false, pending = 0;
    function fin() { if (!called) { called = true; done(); } }
    setTimeout(fin, 3500); // مهلة قصوى
    function step() { pending--; if (pending === 0) setTimeout(fin, 150); }
    function add(src, cb) {
      pending++;
      var s = doc.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { if (cb) cb(); step(); };
      s.onerror = step;
      doc.head.appendChild(s);
    }
    if (!hasST()) {
      if (!window.gsap) add('https://unpkg.com/gsap@3.12.5/dist/gsap.min.js',
        function () { add('https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js'); });
      else add('https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js');
    }
    if (!window.THREE) add('https://unpkg.com/three@0.128.0/build/three.min.js');
    if (pending === 0) fin();
  }

  /* ============================================================
     17) الإقلاع
     ============================================================ */
  function boot() {
    try { initPreloader(); }        catch (e) { revealPage(); }
    try { initReveals(); }          catch (e) {}
    try { initVideos(); }           catch (e) {}
    try { initMenu(); }             catch (e) {}
    try { initAnchors(); }          catch (e) {}
    try { initNavState(); }         catch (e) {}
    try { initCursor(); }           catch (e) {}
    try { initCounters(); }         catch (e) {}
    try { initManifesto(); }        catch (e) {}
    try { initSessionsPreview(); }  catch (e) {}
    try { initTilt(); }             catch (e) {}
    try { initButtons(); }          catch (e) {}

    if (hasST() && hasTHREE()) startEnhancements();
    else loadFallbacks(startEnhancements);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();