(function () {
  var gift = document.getElementById('gift');

  var cv = document.getElementById('snow'),
    ctx = cv.getContext('2d');
  var kgEl = document.getElementById('kg');
  var reduce = window.SnowMotion.paused;
  var raf = 0,
    visible = true,
    stoppedAt = null;
  var W,
    H,
    dpr,
    COL = 6,
    cols,
    ground,
    target,
    room,
    units = 1,
    shown = false,
    flakes = [],
    done = false,
    t0 = performance.now(),
    last = t0;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = gift.clientWidth;
    H = gift.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.ceil(W / COL) + 1,
      old = ground;
    cols = n;
    ground = new Float32Array(n);
    if (old)
      for (var i = 0; i < n; i++)
        ground[i] = old[Math.min(old.length - 1, Math.round((i * old.length) / n))];
    // 文字とボタンの下端より下だけに積もらせる（画面が小さくても文字が雪に埋もれないように）
    var inner = gift.querySelector('.gift__more').getBoundingClientRect(),
      top = gift.getBoundingClientRect().top;
    room = Math.max(H * 0.12, H - (inner.bottom - top) - 20);
    target = T(units);
  }
  // k口ぶん積もったときの雪の平均の高さ。1口目は画面の22%、2口目からは少しずつ（文字に重ならない30%まで）
  function T(k) {
    return k <= 0
      ? 0
      : Math.min(room * 0.8, H * 0.22) +
          (room * 0.92 - Math.min(room * 0.8, H * 0.22)) * (1 - Math.pow(0.7, k - 1));
  }
  function kgNow() {
    var a = avg();
    for (var k = 1; k <= units; k++)
      if (a < T(k)) return (k - 1) * 100 + Math.floor(((a - T(k - 1)) / (T(k) - T(k - 1))) * 100);
    return units * 100;
  }
  size();
  window.addEventListener('resize', size);

  function flake(x, y, burst) {
    var r = Math.random() * 2.2 + 0.8;
    flakes.push({
      x: x,
      y: y,
      r: r,
      vy: burst ? -Math.random() * 3 - 1 : r * 1.1 + 1.4,
      vx: burst ? (Math.random() - 0.5) * 6 : 0,
      ph: Math.random() * 6.28,
      sw: Math.random() * 0.8 + 0.3,
      a: Math.random() * 0.5 + 0.5,
      burst: !!burst
    });
  }

  function avg() {
    var s = 0;
    for (var i = 0; i < cols; i++) s += ground[i];
    return s / cols;
  }

  function land(f) {
    if (done) return;
    var c = Math.round(f.x / COL);
    if (c < 0 || c >= cols) return;
    var add = f.r * 1.1;
    for (var k = -3; k <= 3; k++) {
      var j = c + k;
      if (j >= 0 && j < cols) ground[j] = Math.min(room, ground[j] + add * (1 - Math.abs(k) / 4));
    }
  }

  function smooth() {
    for (var i = 1; i < cols - 1; i++) {
      var m = (ground[i - 1] + ground[i + 1]) / 2;
      ground[i] += (m - ground[i]) * 0.08;
    }
  }

  function groundY(x) {
    var c = Math.max(0, Math.min(cols - 1, Math.round(x / COL)));
    return H - ground[c];
  }

  function drawGround() {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var i = 0; i < cols; i++) ctx.lineTo(i * COL, H - ground[i]);
    ctx.lineTo(W, H);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, H - target * 1.4, 0, H);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(1, '#E3EBF5');
    ctx.fillStyle = g;
    ctx.fill();
  }

  function finish() {
    if (done) return;
    done = true;
    kgEl.textContent = units * 100;
    if (!shown) {
      shown = true;
      gift.classList.add('is-done');
    }
  }

  // ＋1口：もう100kg降らせて積もらせる
  document.getElementById('more').addEventListener('click', function () {
    units++;
    target = T(units);
    done = false;
    t0 = performance.now() - 2500;
    if (reduce) {
      for (var c = 0; c < cols; c++) ground[c] = target * (1 + 0.12 * Math.sin(c / 9));
      ctx.clearRect(0, 0, W, H);
      drawGround();
      finish();
    }
  });

  function frame(now) {
    raf = 0;
    if (reduce || !visible || document.hidden) return;
    var el = now - t0,
      dt = Math.min(3, (now - last) / 16.7);
    last = now; // 端末の速さに左右されないよう、経過時間で動かす
    // 降った粒だけで積もらせる。画面の幅に合わせて降る量を変え、8秒前後で100kgに届くようにする
    var rate = ((done ? 0.5 : 4 + 4 * Math.min(1, el / 2500)) * W) / 430;
    for (var s = 0; s < rate * dt; s++) if (Math.random() < 0.9) flake(Math.random() * W, -10);

    ctx.clearRect(0, 0, W, H);
    for (var i = flakes.length - 1; i >= 0; i--) {
      var f = flakes[i];
      f.ph += 0.02 * dt;
      if (f.burst) {
        f.vy += 0.08 * dt;
        f.vx *= Math.pow(0.97, dt);
        if (f.vy > f.r * 1.1 + 1.4) {
          f.burst = false;
          f.vx = 0;
        }
      }
      f.x += (f.vx + Math.sin(f.ph) * f.sw) * dt;
      f.y += f.vy * dt;
      if (f.y >= groundY(f.x) - 1) {
        land(f);
        flakes.splice(i, 1);
        continue;
      }
      if (f.x < -20 || f.x > W + 20) {
        flakes.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = f.a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    smooth();
    drawGround();

    if (!done) {
      kgEl.textContent = kgNow();
      if (avg() >= target || el > 20000) finish(); // 極端に遅い端末でも20秒で区切る
    }
    raf = requestAnimationFrame(frame);
  }

  function syncMotion() {
    if (reduce || !visible || document.hidden) {
      if (stoppedAt === null) stoppedAt = performance.now();
      cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    if (raf) return;
    var now = performance.now();
    if (stoppedAt !== null) {
      t0 += now - stoppedAt;
      stoppedAt = null;
    }
    last = now;
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('snow-motion-change', function (event) {
    reduce = event.detail.paused;
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncMotion);
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    syncMotion();
  }).observe(gift);
  addEventListener('pagehide', function () {
    cancelAnimationFrame(raf);
    raf = 0;
    stoppedAt = performance.now();
  });
  addEventListener('pageshow', syncMotion);

  // 開いた瞬間から雪が降っているように、画面全体に散らしておく
  for (var i0 = 0; i0 < 160; i0++) flake(Math.random() * W, Math.random() * H * 0.9);

  // さわると雪が舞う
  gift.addEventListener('pointerdown', function (e) {
    var r = gift.getBoundingClientRect(),
      x = e.clientX - r.left,
      y = e.clientY - r.top;
    for (var i = 0; i < 40; i++) flake(x, y, true);
  });

  if (reduce) {
    for (var c = 0; c < cols; c++) ground[c] = target * (1 + 0.12 * Math.sin(c / 9));
    ctx.clearRect(0, 0, W, H);
    drawGround();
    finish();
  } else {
    syncMotion();
  }
})();
