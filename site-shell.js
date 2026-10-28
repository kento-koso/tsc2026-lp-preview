/* Shared full-screen navigation. Keep background content inert while open. */
(function () {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  const header = document.getElementById('hd');
  if (!toggle || !nav || !header) return;
  let open = false;
  let background = [];
  nav.querySelectorAll('a').forEach((link) => {
    const target = new URL(link.href);
    if (!target.hash && target.pathname === location.pathname)
      link.setAttribute('aria-current', 'page');
  });
  function setOpen(value, restoreFocus = false) {
    if (open === value) return;
    open = value;
    // Stop an in-flight anchor scroll before locking the background.
    if (open) window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' });
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    window.SnowMotion.setSuspended('menu', open);
    document.documentElement.classList.toggle('menu-open', open);
    if (open) {
      background = Array.from(document.body.children)
        .filter((element) => element !== header && !['SCRIPT', 'STYLE'].includes(element.tagName))
        .map((element) => ({ element, inert: element.inert }));
      background.forEach(({ element }) => {
        element.inert = true;
      });
      nav.scrollTop = 0;
      toggle.focus({ preventScroll: true });
    } else {
      background.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      background = [];
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  }
  toggle.addEventListener('click', () => setOpen(!open, true));
  header.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
      return;
    }
    if (event.key === 'Tab') {
      const controls = Array.from(
        header.querySelectorAll('a[href], button:not([disabled])')
      ).filter((element) => element.getClientRects().length);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  // Do not restore a locked document from the back-forward cache.
  addEventListener('pagehide', () => setOpen(false));
})();
