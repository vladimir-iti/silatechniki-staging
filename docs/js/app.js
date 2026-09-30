/* Весь клиентский код сайта. Без библиотек. */
document.documentElement.classList.add('js');

/* --- шапка: сжатие при прокрутке + мобильная панель --- */
(function () {
  const header = document.querySelector('[data-header]');
  const bar = document.querySelector('[data-mobilebar]');

  // Без rAF-троттлинга намеренно: два вызова classList.toggle стоят дешевле,
  // чем риск залипшего флага, если кадр анимации не придёт (свёрнутая вкладка).
  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-small', y > 80);
    if (bar) bar.classList.toggle('is-in', y > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onScroll);
  onScroll();
})();

/* --- меню --- */
(function () {
  const btn = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (!btn || !menu) return;

  function set(open) {
    btn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      const first = menu.querySelector('a, button');
      if (first) first.focus();
    } else if (document.activeElement && menu.contains(document.activeElement)) {
      btn.focus();
    }
  }
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.tagName === 'A') set(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { set(false); return; }
    // Пока меню открыто, Tab не должен уводить фокус на страницу под ним
    if (e.key !== 'Tab' || menu.hidden) return;
    const items = menu.querySelectorAll('a, button');
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();

/* --- появление секций --- */
(function () {
  const items = document.querySelectorAll('.reveal');
  if (!items.length || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
})();

/* --- маска телефона --- */
(function () {
  function format(digits) {
    var d = digits;
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (d && !d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 5) out += ') ' + d.slice(4, 7);
    if (d.length >= 8) out += '-' + d.slice(7, 9);
    if (d.length >= 10) out += '-' + d.slice(9, 11);
    return out;
  }

  document.querySelectorAll('input[type="tel"]').forEach(function (input) {
    input.addEventListener('input', function () {
      // Считаем цифры слева от курсора — по ним восстановим позицию после
      // переформатирования. Иначе курсор улетает в конец и править середину
      // номера нельзя.
      var caret = input.selectionStart;
      var digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;

      input.value = format(input.value.replace(/\D/g, ''));

      var seen = 0;
      var pos = input.value.length;
      for (var i = 0; i < input.value.length; i++) {
        if (/\d/.test(input.value[i])) {
          seen++;
          if (seen === digitsBefore) { pos = i + 1; break; }
        }
      }
      if (digitsBefore === 0) pos = input.value.length;
      try { input.setSelectionRange(pos, pos); } catch (_) {}
    });
  });
})();

/* --- отправка заявки --- */
(function () {
  // Те же правила, что и на сервере: расхождение даёт «не удалось отправить»
  // там, где человеку нужно показать конкретное поле.
  var RULES = {
    name:    function (v) { return v.trim().length >= 2 && v.trim().length <= 80; },
    phone:   function (v) { return v.replace(/\D/g, '').length === 11; },
    place:   function (v) { return v.trim().length >= 2 && v.trim().length <= 200; },
    consent: null, // проверяется отдельно: это флажок
  };

  function fieldOf(el) { return el.closest('.field'); }

  function check(el) {
    if (el.type === 'checkbox') return el.checked;
    var rule = RULES[el.name];
    return rule ? rule(el.value) : el.value.trim() !== '';
  }

  function mark(el) {
    var f = fieldOf(el);
    if (!f) return check(el);
    var ok = check(el);
    f.classList.toggle('is-bad', !ok);
    return ok;
  }

  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    var started = Date.now();
    var fields = form.querySelectorAll('[name="name"],[name="phone"],[name="place"],[name="consent"]');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const err = form.querySelector('[data-error]');

      // Проверка на стороне клиента: показываем конкретное поле,
      // а не общее «не удалось отправить» после отказа сервера.
      var bad = null;
      fields.forEach(function (el) { if (!mark(el) && !bad) bad = el; });
      if (bad) {
        if (err) err.textContent = '';
        bad.focus();
        return;
      }

      const data = new FormData(form);
      data.append('elapsed', String(Date.now() - started));

      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Отправляем…'; }
      if (err) err.textContent = '';

      try {
        const res = await fetch(form.action, { method: 'POST', body: data });
        if (!res.ok) throw new Error('bad response');
        document.dispatchEvent(new CustomEvent('lead:sent'));
        const done = form.parentElement.querySelector('[data-lead-done]');
        if (done) { form.hidden = true; done.hidden = false; done.focus(); }
      } catch (_) {
        if (err) err.textContent = 'Не удалось отправить. Позвоните нам — ответим сразу.';
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      }
    });

    fields.forEach(function (el) {
      var ev = el.type === 'checkbox' ? 'change' : 'blur';
      el.addEventListener(ev, function () {
        // Пустое поле, которого ещё не касались, краснеть не должно
        if (el.type !== 'checkbox' && el.value === '') return;
        mark(el);
      });
      el.addEventListener('input', function () { fieldOf(el)?.classList.remove('is-bad'); });
    });
  });
})();

/* --- видео с объектов --- */
(function () {
  document.querySelectorAll('[data-video-play]').forEach(function (btn) {
    const frame = btn.closest('.vid__frame');
    const video = frame && frame.querySelector('[data-video]');
    if (!video) return;

    // В разметке controls стоят, чтобы ролик оставался играбельным без JS.
    // Здесь их снимаем: на постере они рисуются поверх нашей кнопки, и
    // получается два элемента управления сразу. Вернём при воспроизведении.
    video.removeAttribute('controls');

    btn.addEventListener('click', function () {
      btn.hidden = true;
      video.setAttribute('controls', '');
      // Ролик грузится только сейчас: до клика у него preload="none"
      video.play().catch(function () {
        // Не дали воспроизвести — возвращаем кнопку, родные controls на месте
        btn.hidden = false;
      });
      video.focus({ preventScroll: true });
    });

    // Накладка возвращается только после конца ролика: video.load() заодно
    // возвращает постер. На паузе её не показываем — она перекрывала бы
    // родную панель управления и мешала перематывать.
    video.addEventListener('ended', function () {
      video.load();                      // возвращает постер
      video.removeAttribute('controls'); // и чистый кадр под кнопкой
      btn.hidden = false;
    });
    video.addEventListener('play', function () { btn.hidden = true; });
  });
})();

/* --- фильтр статей --- */
(function () {
  const root = document.querySelector('[data-filter]');
  if (!root) return;
  const cards = document.querySelectorAll('[data-group]');
  const counter = document.querySelector('[data-filter-count]');

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-group-btn]');
    if (!btn) return;
    const g = btn.dataset.groupBtn;
    root.querySelectorAll('[data-group-btn]').forEach((b) => {
      b.classList.toggle('is-on', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    let n = 0;
    cards.forEach((c) => {
      const show = g === 'all' || c.dataset.group === g;
      c.hidden = !show;
      if (show) n++;
    });
    if (counter) counter.textContent = String(n);
  });
})();
