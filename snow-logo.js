/* The hero retains its accessible heading and layout. A single decorative copy
   follows the scroll, independently of the snow animation and its pause state. */
(function () {
  'use strict';
  var hero = document.querySelector('.kv--official');
  var source = document.querySelector('.kv__official-logo');
  var header = document.getElementById('hd');
  var slot = header && header.querySelector('.brand-official');
  if (!hero || !source || !slot) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var logo = source.cloneNode(false);
  logo.className = 'travelling-logo';
  logo.alt = '';
  logo.setAttribute('aria-hidden', 'true');
  document.body.appendChild(logo);
  document.body.classList.add('logo-motion');
  var startTop = 0,
    startWidth = 1,
    endTop = 0,
    endWidth = 1;
  var distance = 1,
    stageTop = 0,
    raf = 0;

  function measure() {
    var original = source.getBoundingClientRect();
    var stage = hero.getBoundingClientRect();
    var target = slot.getBoundingClientRect();
    startTop = original.top - stage.top;
    startWidth = original.width;
    endTop = target.top;
    endWidth = target.width;
    var journey = hero.closest('.hero-journey') || hero;
    stageTop = journey.getBoundingClientRect().top + window.scrollY;
    distance = Math.min(480, Math.max(280, window.innerHeight * 0.5));
    logo.style.width = startWidth + 'px';
    logo.style.marginLeft = -startWidth / 2 + 'px';
    render();
  }
  function render() {
    raf = 0;
    var p = Math.min(1, Math.max(0, (window.scrollY - stageTop) / distance));
    // With reduced motion, change between the two endpoints without a flight.
    if (reduce.matches) p = p > 0.15 ? 1 : 0;
    var eased = p * p * (3 - 2 * p);
    hero.style.setProperty('--hero-copy-opacity', String(Math.max(0, 1 - p * 5)));
    var y = startTop + (endTop - startTop) * eased;
    var scale = 1 + (endWidth / startWidth - 1) * eased;
    logo.style.transform = 'translate3d(0,' + y + 'px,0) scale(' + scale + ')';
    var reveal = Math.max(0, (eased - 0.65) / 0.35);
    header.style.setProperty('--header-reveal', String(reveal));
    document.body.style.setProperty('--masthead-progress', String(reveal));
  }
  function schedule() {
    if (!raf) raf = requestAnimationFrame(render);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', measure);
  reduce.addEventListener('change', measure);
  source.addEventListener('load', measure);
  new ResizeObserver(measure).observe(source);
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
})();
