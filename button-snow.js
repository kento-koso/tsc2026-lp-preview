/* Button particles: timers exist only while visible and motion is enabled. */
(function () {
  'use strict';
  const selector =
    '.btn:not(:disabled):not(.is-disabled), .hd__cta, .fundlink, .ask summary, .copylist button, .banners a';
  const buttons = Array.from(document.querySelectorAll(selector));
  const visible = new Set();
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let idleTimer = null,
    hoverTimer = null,
    hovered = null;
  function enabled() {
    return !document.hidden && !window.SnowMotion.paused;
  }
  function spark(button, large) {
    if (!enabled() || !visible.has(button)) return;
    const particle = document.createElement('i');
    particle.className = 'grain';
    particle.setAttribute('aria-hidden', 'true');
    particle.style.left = Math.random() * button.offsetWidth + 'px';
    particle.style.setProperty('--s', (1 + Math.random() * (large ? 2 : 1.4)).toFixed(2) + 'px');
    particle.style.setProperty('--d', ((large ? 1.6 : 2.6) + Math.random() * 1.6).toFixed(2) + 's');
    particle.style.setProperty('--x', ((Math.random() - 0.5) * 18).toFixed(0) + 'px');
    particle.style.setProperty('--h', button.offsetHeight + 8 + 'px');
    particle.style.setProperty('--o', (0.55 + Math.random() * 0.45).toFixed(2));
    button.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove(), { once: true });
  }
  function sync() {
    clearInterval(idleTimer);
    clearInterval(hoverTimer);
    idleTimer = hoverTimer = null;
    if (!enabled()) {
      document.querySelectorAll('.grain').forEach((particle) => particle.remove());
      return;
    }
    if (visible.size)
      idleTimer = setInterval(() => {
        visible.forEach((button) => {
          if (Math.random() < 0.8) spark(button, false);
        });
      }, 260);
    if (hovered && visible.has(hovered))
      hoverTimer = setInterval(() => {
        spark(hovered, true);
        spark(hovered, true);
      }, 70);
  }
  buttons.forEach((button) => {
    if (getComputedStyle(button).position === 'static') button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.addEventListener('mouseenter', () => {
      if (!finePointer.matches) return;
      hovered = button;
      for (let i = 0; i < 8; i++) spark(button, true);
      sync();
    });
    button.addEventListener('mouseleave', () => {
      hovered = null;
      sync();
    });
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) =>
      entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)
    );
    sync();
  });
  buttons.forEach((button) => observer.observe(button));
  document.addEventListener('snow-motion-change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => {
    clearInterval(idleTimer);
    clearInterval(hoverTimer);
  });
  addEventListener('pageshow', sync);
})();
