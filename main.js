(function () {
  /* ---------------------------------------------------------
     1. ヘッダー：KVを過ぎた状態を共通スタイルへ渡す
     --------------------------------------------------------- */
  var hd = document.getElementById('hd');
  var kv = document.querySelector('.kv');
  function onScroll() {
    hd.classList.toggle(
      'is-solid',
      scrollY > (kv.closest('.hero-journey') || kv).offsetHeight - 60
    );
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     2. 予定に入れる：Googleカレンダー／iPhone・Mac（.ics）
        TODO：開場時間が決まったら、終日ではなく時間つきにする
     --------------------------------------------------------- */
  var event = window.SnowEvent;
  if (!event) return;
  var title = event.title + ' ' + event.year + '（' + event.venue + '）',
    loc = event.venue + ' ' + event.address,
    url = event.url;
  var g = document.getElementById('calGoogle');
  g.href =
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
    encodeURIComponent(title) +
    '&dates=' +
    event.calendarStart +
    '/' +
    event.calendarEnd +
    '&location=' +
    encodeURIComponent(loc) +
    '&details=' +
    encodeURIComponent(url);
  document.getElementById('calApple').href =
    'data:text/calendar;charset=utf-8,' +
    encodeURIComponent(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TSC2026//JA',
        'BEGIN:VEVENT',
        'UID:' + event.calendarUid,
        'DTSTAMP:' + event.calendarStamp,
        'DTSTART;VALUE=DATE:' + event.calendarStart,
        'DTEND;VALUE=DATE:' + event.calendarEnd,
        'SUMMARY:' + title,
        'LOCATION:' + loc,
        'URL:' + url,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n')
    );
  document.querySelectorAll('[data-calendar="google"]').forEach(function (link) {
    link.href = g.href;
  });
  document.querySelectorAll('[data-calendar="apple"]').forEach(function (link) {
    link.href = document.getElementById('calApple').href;
  });

  /* ---------------------------------------------------------
     3. 日時・場所・URL をコピー
     --------------------------------------------------------- */
  function copy(text, btn) {
    function done() {
      var t = btn.textContent;
      btn.textContent = 'コピーしました';
      btn.classList.add('is-done');
      setTimeout(function () {
        btn.textContent = t;
        btn.classList.remove('is-done');
      }, 1600);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {}
      ta.remove();
      btn.focus();
      if (ok) done();
      else {
        var label = btn.textContent;
        btn.textContent = 'コピーできませんでした';
        setTimeout(function () {
          btn.textContent = label;
        }, 2500);
      }
    }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
    b.addEventListener('click', function () {
      copy(document.getElementById(b.dataset.copy).textContent, b);
    });
  });

  /* ---------------------------------------------------------
     4. 家族や友だちに送る（スマホは共有シート、PCはまとめてコピー）
     --------------------------------------------------------- */
  var share = document.getElementById('share');
  share.addEventListener('click', function (e) {
    e.preventDefault();
    var text =
      event.title +
      ' ' +
      event.year +
      '\n' +
      event.dateJapanese +
      '\n' +
      event.venue +
      '（' +
      event.shortAddress +
      '）入場無料\n';
    if (navigator.share)
      navigator
        .share({ title: 'THE SNOW CHRISTMAS 2026', text: text, url: url })
        .catch(function () {});
    else copy(text + url, share);
  });
})();
