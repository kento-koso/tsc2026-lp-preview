/* One lightweight snow layer carries the atmosphere through the whole page. */
(function () {
  'use strict';
  var canvas = document.createElement('canvas');
  canvas.className = 'page-snow';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  var paused = window.SnowMotion.paused;
  var hero = document.querySelector('.hero-journey'),
    darkSections = [].slice.call(document.querySelectorAll('.enjoy,.faq-sec,[data-snow-dark]'));
  var w = 0,
    h = 0,
    flakes = [],
    dark = [],
    heroBottom = 0,
    raf = 0,
    last = 0,
    elapsed = 0,
    measureRaf = 0;
  function scheduleMeasure() {
    if (!measureRaf)
      measureRaf = requestAnimationFrame(function () {
        measureRaf = 0;
        measure();
      });
  }
  function measure() {
    heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
    dark = darkSections.map(function (el) {
      var r = el.getBoundingClientRect();
      return [r.top, r.bottom];
    });
    if (paused) draw(0);
    start();
  }
  function resize() {
    w = innerWidth;
    h = innerHeight;
    var dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = Array.from({ length: w < 761 ? 80 : 170 }, function () {
      var edge = Math.random() < 0.65,
        x = edge
          ? Math.random() < 0.5
            ? Math.random() * 0.17
            : 0.83 + Math.random() * 0.17
          : Math.random();
      return {
        x: x * w,
        y: Math.random() * h,
        r: 0.8 + Math.random() * 2.2,
        speed: 16 + Math.random() * 26,
        phase: Math.random() * 6.28,
        alpha: 0.35 + Math.random() * 0.35
      };
    });
    measure();
  }
  function draw(dt) {
    ctx.clearRect(0, 0, w, h);
    elapsed += dt;
    flakes.forEach(function (p) {
      p.y += p.speed * dt;
      if (p.y > h + 8) p.y = -8;
      var x = p.x + Math.sin(elapsed * 0.35 + p.phase) * 14;
      if (p.y < heroBottom) return;
      var isDark = dark.some(function (r) {
        return p.y >= r[0] && p.y <= r[1];
      });
      var edge = x < w * 0.16 || x > w * 0.84;
      ctx.fillStyle = isDark
        ? 'rgba(245,251,255,' + p.alpha * (edge ? 1 : 0.6) + ')'
        : 'rgba(108,159,193,' + p.alpha * (edge ? 0.6 : 0.25) + ')';
      ctx.beginPath();
      ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function frame(now) {
    raf = 0;
    if (paused || document.hidden || heroBottom >= h) return;
    if (!last) last = now;
    if (now - last >= 32) {
      draw(Math.min(0.08, (now - last) / 1000));
      last = now;
    }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (!raf && !paused && !document.hidden && heroBottom < h) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (heroBottom >= h) {
      ctx.clearRect(0, 0, w, h);
    }
  }
  document.addEventListener('snow-motion-change', function (e) {
    paused = e.detail.paused;
    cancelAnimationFrame(raf);
    raf = 0;
    start();
  });
  document.addEventListener('visibilitychange', function () {
    cancelAnimationFrame(raf);
    raf = 0;
    start();
  });
  addEventListener('scroll', scheduleMeasure, { passive: true });
  addEventListener('resize', resize, { passive: true });
  new ResizeObserver(scheduleMeasure).observe(document.querySelector('main'));
  addEventListener('pagehide', function () {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(measureRaf);
    raf = measureRaf = 0;
    last = 0;
  });
  addEventListener('pageshow', scheduleMeasure);
  resize();
})();
