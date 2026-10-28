/* One motion preference for CSS, canvas effects and all page controls. */
(function () {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = preference.matches;
  const suspended = new Set();
  const buttons = Array.from(document.querySelectorAll('.motion-toggle, .fund-motion'));
  function sync() {
    const stopped = paused || suspended.size > 0;
    document.body.classList.toggle('all-motion-paused', stopped);
    for (const button of buttons) {
      const label = paused ? '動きを再生' : '動きを止める';
      button.setAttribute('aria-pressed', String(paused));
      button.setAttribute('aria-label', label);
      button.title = label;
      button.innerHTML = `<span aria-hidden="true">${paused ? '▷' : 'Ⅱ'}</span> ${label}`;
      button.hidden = false;
    }
    document.dispatchEvent(new CustomEvent('snow-motion-change', { detail: { paused: stopped } }));
  }
  function setPaused(value) {
    paused = Boolean(value);
    sync();
  }
  // Temporary occlusion must never overwrite the visitor's pause preference.
  function setSuspended(reason, value) {
    const wasSuspended = suspended.has(reason);
    if (wasSuspended === Boolean(value)) return;
    if (value) suspended.add(reason);
    else suspended.delete(reason);
    sync();
  }
  window.SnowMotion = Object.freeze({
    get paused() {
      return paused || suspended.size > 0;
    },
    setPaused,
    setSuspended
  });
  buttons.forEach((button) => button.addEventListener('click', () => setPaused(!paused)));
  preference.addEventListener('change', (event) => setPaused(event.matches));
  setPaused(paused);
})();
