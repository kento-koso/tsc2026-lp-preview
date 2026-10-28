/* Original MARC render layers with cinematic parallax and perspective-projected snow.
   Building imagery is prerendered; this is deliberately a lightweight 2.5D scene,
   not the 3.8 GB Blender mesh. No tracking, dependencies or device sensors. */
(function () {
  'use strict';
  var hero = document.querySelector('.kv--official');
  if (!hero) return;
  var journey = hero.closest('.hero-journey');
  var canvas = hero.querySelector('.kv__snow');
  var ctx = canvas.getContext('2d');
  var toggle = hero.querySelector('.motion-toggle');
  var art = hero.querySelector('.kv__art');
  var sceneImage = art.querySelector('img');
  var lightCanvas = hero.querySelector('.kv__market-lights');
  var lightCtx = lightCanvas && lightCanvas.getContext('2d');
  var shopLights = [],
    lightSource = '',
    lightWidth = 0,
    lightHeight = 0;
  var crystals = hero.querySelector('.kv__crystals');
  var woods = hero.querySelector('.kv__woods');
  var desktop = window.matchMedia('(min-width: 1024px)');
  var copy = hero.querySelector('.kv__in');
  var seal = hero.querySelector('.hero-seal');
  var scrollHint = hero.querySelector('.hero-scroll');
  var pointerFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var paused = window.SnowMotion.paused;
  var visible = true,
    raf = 0,
    lastTime = 0,
    elapsed = 0;
  var width = 0,
    height = 0,
    ratio = 1,
    focal = 700,
    particles = [];
  var mouse = { x: 0, y: 0 },
    eased = { x: 0, y: 0 };
  var progress = 0,
    targetProgress = 0;
  var entryTime = performance.now();
  var sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  var brush = sprite.getContext('2d');
  if (!ctx || !brush) return;
  var glow = brush.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.3, 'rgba(245,251,255,.85)');
  glow.addColorStop(0.7, 'rgba(224,242,255,.19)');
  glow.addColorStop(1, 'rgba(224,242,255,0)');
  brush.fillStyle = glow;
  brush.fillRect(0, 0, 64, 64);
  function clamp(x, min, max) {
    return Math.min(max, Math.max(min, x));
  }
  function particle(randomY) {
    // Three depth bands: fine distant snow, readable midground flakes,
    // and occasional soft flakes passing close to the camera.
    var band = Math.random();
    var near = band > 0.94,
      middle = band > 0.6 && !near;
    var z = near
      ? 150 + Math.random() * 250
      : middle
        ? 450 + Math.random() * 550
        : 1100 + Math.random() * 1100;
    return {
      x: (((Math.random() - 0.5) * width * (z + focal)) / focal) * 1.4,
      y: ((randomY ? Math.random() - 0.5 : -0.66) * height * (z + focal)) / focal,
      z: z,
      r: near
        ? 3 + Math.random() * 2.5
        : middle
          ? 2 + Math.random() * 2
          : 1.4 + Math.random() * 1.8,
      speed: near
        ? 135 + Math.random() * 80
        : middle
          ? 105 + Math.random() * 65
          : 85 + Math.random() * 60,
      phase: Math.random() * Math.PI * 2
    };
  }
  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    focal = Math.max(450, width * 0.65);
    var count = Math.round(clamp((width * height) / (width < 761 ? 1900 : 2900), 160, 500));
    particles = Array.from({ length: count }, function () {
      return particle(true);
    });
    readScroll();
    if (lightCtx) {
      lightCanvas.width = canvas.width;
      lightCanvas.height = canvas.height;
      buildShopLights();
      drawShopLights();
    }
    if (paused) drawSnow(0, 0);
  }
  function buildShopLights() {
    if (!lightCtx || !sceneImage.complete || !sceneImage.naturalWidth) return;
    var source = sceneImage.currentSrc;
    if (source === lightSource) return;
    lightSource = source;
    lightWidth = sceneImage.naturalWidth;
    lightHeight = sceneImage.naturalHeight;
    var mobile = lightHeight > lightWidth;
    var sample = document.createElement('canvas');
    sample.width = mobile ? 512 : 960;
    sample.height = Math.round((sample.width * lightHeight) / lightWidth);
    var sampleCtx = sample.getContext('2d');
    sampleCtx.drawImage(sceneImage, 0, 0, sample.width, sample.height);
    var pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height);
    var data = pixels.data;
    // Extract the artwork’s warm lights; region masks below exclude office
    // windows, snow and the central tree.
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      var strength =
        r > g * 1.08 && g > b * 1.15
          ? clamp((r - 140) / 100, 0, 1) * clamp((g - 70) / 110, 0, 1)
          : 0;
      data[i] = 255;
      data[i + 1] = 204;
      data[i + 2] = 116;
      data[i + 3] = Math.round(strength * 230);
    }
    sampleCtx.putImageData(pixels, 0, 0);
    var groups = mobile
      ? [
          [0.05, 0.19],
          [0.19, 0.29],
          [0.29, 0.4],
          [0.62, 0.72],
          [0.72, 0.82],
          [0.82, 0.94]
        ]
      : [
          [0.21, 0.29],
          [0.29, 0.34],
          [0.34, 0.41],
          [0.56, 0.62],
          [0.62, 0.68],
          [0.68, 0.755]
        ];
    var top = mobile ? 0.66 : 0.71,
      bottom = mobile ? 0.735 : 0.805;
    var regions = groups.map(function (bounds) {
      return { left: bounds[0], right: bounds[1], top: top, bottom: bottom, market: true };
    });
    // Lights wound around the two bare trees, above the market roofs.
    var branches = mobile
      ? [
          [0.15, 0.25, 0.63, 0.665],
          [0.25, 0.36, 0.63, 0.665],
          [0.69, 0.76, 0.615, 0.66],
          [0.76, 0.82, 0.615, 0.655]
        ]
      : [
          [0.29, 0.34, 0.645, 0.71],
          [0.34, 0.4, 0.645, 0.71],
          [0.61, 0.65, 0.625, 0.71],
          [0.65, 0.695, 0.625, 0.69]
        ];
    branches.forEach(function (bounds) {
      regions.push({
        left: bounds[0],
        right: bounds[1],
        top: bounds[2],
        bottom: bounds[3],
        market: false
      });
    });
    shopLights = regions.map(function (region, index) {
      var x = Math.floor(region.left * sample.width),
        y = Math.floor(region.top * sample.height);
      var w = Math.ceil((region.right - region.left) * sample.width),
        h = Math.ceil((region.bottom - region.top) * sample.height);
      var pad = 32,
        cut = document.createElement('canvas'),
        halo = document.createElement('canvas');
      cut.width = halo.width = w + pad * 2;
      cut.height = halo.height = h + pad * 2;
      cut.getContext('2d').drawImage(sample, x, y, w, h, pad, pad, w, h);
      var glowCtx = halo.getContext('2d');
      var weight = 0,
        cx = 0,
        cy = 0;
      for (var py = y; py < Math.min(y + h, sample.height); py++) {
        for (var px = x; px < Math.min(x + w, sample.width); px++) {
          var a = data[(py * sample.width + px) * 4 + 3];
          weight += a;
          cx += (px - x + pad) * a;
          cy += (py - y + pad) * a;
        }
      }
      if (weight && region.market) {
        cx /= weight;
        cy /= weight;
        var radius = Math.max(w * 0.6, h * 0.8);
        glowCtx.save();
        glowCtx.translate(cx, cy);
        glowCtx.scale(1, 0.7);
        var warmth = glowCtx.createRadialGradient(0, 0, 0, 0, 0, radius);
        warmth.addColorStop(0, 'rgba(255,185,85,.38)');
        warmth.addColorStop(0.45, 'rgba(255,168,65,.16)');
        warmth.addColorStop(1, 'rgba(255,154,50,0)');
        glowCtx.fillStyle = warmth;
        glowCtx.fillRect(-radius, -radius, radius * 2, radius * 2);
        glowCtx.restore();
      }
      glowCtx.globalCompositeOperation = 'lighter';
      glowCtx.filter = 'blur(8px)';
      glowCtx.globalAlpha = 1;
      glowCtx.drawImage(cut, 0, 0);
      glowCtx.filter = 'blur(3px)';
      glowCtx.globalAlpha = 0.85;
      glowCtx.drawImage(cut, 0, 0);
      return {
        image: halo,
        core: cut,
        x: (x - pad) / sample.width,
        y: (y - pad) / sample.height,
        w: halo.width / sample.width,
        h: halo.height / sample.height,
        phase: index * 1.91,
        period: 7.6 + (index % 6) * 0.6
      };
    });
  }
  function drawShopLights() {
    if (!lightCtx || !lightWidth) return;
    lightCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    lightCtx.clearRect(0, 0, width, height);
    var fit = Math.max(width / lightWidth, height / lightHeight);
    var fittedW = lightWidth * fit,
      fittedH = lightHeight * fit;
    var left = (width - fittedW) / 2,
      top = height - fittedH;
    shopLights.forEach(function (light) {
      // One slow breath, like the garland. Keep bulbs registered to the
      // artwork while only their soft bloom expands into the surrounding air.
      var breath = 0.5 + 0.5 * Math.sin((elapsed * Math.PI * 2) / light.period + light.phase);
      var w = light.w * fittedW,
        h = light.h * fittedH;
      lightCtx.globalAlpha = 0.08 + breath * 0.52;
      lightCtx.drawImage(light.core, left + light.x * fittedW, top + light.y * fittedH, w, h);
      lightCtx.globalAlpha = 0.12 + breath * 0.85;
      var spread = 1 + breath * 0.13;
      lightCtx.drawImage(
        light.image,
        left + light.x * fittedW - (w * (spread - 1)) / 2,
        top + light.y * fittedH - (h * (spread - 1)) / 2,
        w * spread,
        h * spread
      );
    });
    lightCtx.globalAlpha = 1;
  }
  function readScroll() {
    var rect = journey.getBoundingClientRect();
    var travel = Math.max(1, journey.offsetHeight - height);
    targetProgress = clamp(-rect.top / travel, 0, 1);
  }
  function drawSnow(dt, cameraDepth) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    particles.forEach(function (p, i) {
      p.y += p.speed * dt;
      p.x += (8 + Math.sin(elapsed * 0.65 + p.phase) * 17) * dt;
      var z = Math.max(95, p.z - cameraDepth);
      var scale = focal / (focal + z);
      var x = width * 0.5 + (p.x - eased.x * 26) * scale;
      var y = height * 0.5 + (p.y - eased.y * 15) * scale;
      var r = p.r * scale * (p.z < 450 ? 1.45 : 1);
      if (y > height + 20 || x < -100 || x > width + 100) {
        particles[i] = particle(false);
        return;
      }
      var alpha = Math.min(0.95, 0.5 + scale * 0.5) * (y > height * 0.88 ? 0.7 : 1);
      ctx.globalAlpha = alpha;
      if (p.z < 500) {
        ctx.drawImage(sprite, x - r * 3, y - r * 3, r * 6, r * 6);
      } else {
        ctx.fillStyle = '#edf6ff';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    raf = 0;
    if (paused || !visible || document.hidden) return;
    var dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;
    elapsed += dt;
    var ease = 1 - Math.exp(-dt * 5);
    eased.x += (mouse.x - eased.x) * ease;
    eased.y += (mouse.y - eased.y) * ease;
    progress += (targetProgress - progress) * ease;
    var entry = 1 - Math.pow(1 - clamp((now - entryTime) / 2200, 0, 1), 3);
    var introScale = (1 - entry) * 0.055;
    var scale = 1.035 + introScale + progress * 0.13;
    var drift = Math.sin(elapsed * 0.22) * 1.6;
    art.style.transform =
      'translate3d(' +
      (-eased.x * 8 + drift) +
      'px,' +
      (progress * 22 - eased.y * 5) +
      'px,0) scale(' +
      scale +
      ')';
    if (lightCanvas) {
      lightCanvas.style.transform = art.style.transform;
      drawShopLights();
    }
    crystals.style.transform =
      'translate3d(' +
      -eased.x * 26 +
      'px,' +
      (progress * 65 - eased.y * 15) +
      'px,0) scale(' +
      (1.045 + progress * 0.24) +
      ')';
    if (woods && desktop.matches) {
      // Foreground branches move aside to reveal the original MARC scene.
      var opening = Math.pow(clamp(progress / 0.92, 0, 1), 0.85);
      woods.style.setProperty('--forest-near-x', opening * width * 0.46 + 'px');
      woods.style.setProperty('--forest-middle-x', opening * width * 0.34 + 'px');
      woods.style.setProperty('--forest-far-x', opening * width * 0.24 + 'px');
      woods.style.setProperty('--forest-scale', String(1 + opening * 0.12));
    }
    copy.style.transform =
      'translate3d(' +
      eased.x * 3 +
      'px,' +
      (-progress * 95 + (1 - entry) * 18) +
      'px,0) scale(' +
      (1 - progress * 0.055) +
      ')';
    copy.style.opacity = String(1 - clamp((progress - 0.15) / 0.75, 0, 1) * 0.9);
    seal.style.opacity = String(1 - progress);
    scrollHint.style.opacity = String(1 - progress);
    drawSnow(dt, progress * 210);
    raf = requestAnimationFrame(frame);
  }
  function stopFrame() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastTime = 0;
  }
  function startFrame() {
    if (!raf && !paused && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function setPaused(value) {
    paused = value;
    stopFrame();
    hero.classList.toggle('motion-paused', paused);
    // Preserve the current snow and scenery when paused, without a visual jump.
    if (!paused) {
      entryTime = performance.now() - 2200;
      startFrame();
    }
  }
  hero.classList.add('motion-ready');
  document.body.appendChild(toggle);
  toggle.hidden = false;
  resize();
  setPaused(paused);
  sceneImage.addEventListener('load', function () {
    buildShopLights();
    drawShopLights();
  });
  entryTime = performance.now();
  document.addEventListener('snow-motion-change', function (event) {
    setPaused(event.detail.paused);
  });
  hero.addEventListener(
    'pointermove',
    function (event) {
      if (!pointerFine.matches || paused) return;
      var r = hero.getBoundingClientRect();
      mouse.x = clamp(((event.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      mouse.y = clamp(((event.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    },
    { passive: true }
  );
  hero.addEventListener('pointerleave', function () {
    mouse.x = mouse.y = 0;
  });
  window.addEventListener('scroll', readScroll, { passive: true });
  var resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
  window.addEventListener('resize', readScroll, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) startFrame();
      else stopFrame();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopFrame();
    else startFrame();
  });

  window.addEventListener('pagehide', stopFrame);
  window.addEventListener('pageshow', startFrame);
})();
