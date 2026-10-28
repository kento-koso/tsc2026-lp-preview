/* Native modal: keeps focus inside, supports Escape, and restores the opening card. */
(function () {
  var dialog = document.getElementById('people-dialog');
  if (!dialog) return;
  var opener;
  var backdropPressed = false;
  var photo = dialog.querySelector('.people-dialog-photo');
  document.querySelectorAll('.people-open').forEach(function (button) {
    button.addEventListener('click', function () {
      var card = button.closest('.people-card');
      opener = button;
      document.getElementById('people-dialog-name').textContent =
        card.querySelector('h3').textContent;
      document.getElementById('people-dialog-role').textContent =
        card.querySelector('.people-caption p').textContent;
      document.getElementById('people-dialog-number').textContent =
        card.querySelector('.people-number').textContent;
      photo.replaceChildren(card.querySelector('.people-portrait').cloneNode(true));
      dialog.showModal();
      window.SnowMotion.setSuspended('people', true);
      dialog.scrollTop = 0;
      document.documentElement.classList.add('people-modal-open');
    });
  });
  dialog.querySelector('.people-dialog-close').addEventListener('click', function () {
    dialog.close();
  });
  function outside(event) {
    var bounds = dialog.getBoundingClientRect();
    return (
      event.target === dialog &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    );
  }
  dialog.addEventListener('pointerdown', function (event) {
    backdropPressed = outside(event);
  });
  dialog.addEventListener('click', function (event) {
    if (backdropPressed && outside(event)) dialog.close();
    backdropPressed = false;
  });
  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('people-modal-open');
    window.SnowMotion.setSuspended('people', false);
    backdropPressed = false;
    if (opener) opener.focus({ preventScroll: true });
  });
})();
