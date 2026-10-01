/* Весь клиентский код сайта. Без библиотек. */
document.documentElement.classList.add('js');

/* --- шапка: сжатие при прокрутке + мобильная панель --- */
(function () {
  const header = document.querySelector('[data-header]');
  const bar = document.querySelector('[data-mobilebar]');

  // Без rAF-троттлинга намеренно: два вызова classList.toggle стоят дешевле,
  // чем риск залипшего флага, если кадр анимации не придёт (свёрнутая вкладка).
  // Верхняя полоса шапки: уезжает при прокрутке вниз, возвращается при прокрутке вверх.
  // Возвращаем только после заметного движения вверх (UP px): когда полоса прячется,
  // шапка становится ниже, браузер сам отматывает прокрутку на эти пиксели — это
  // не должно считаться прокруткой вверх, иначе полоса начнёт мигать.
  const UP = 60;
  let lastY = window.scrollY, turnY = lastY;
  function onScroll() {
    const y = window.scrollY;
    // Сжимаем после 100px, разжимаем только у самого верха — без «дребезга» на пороге
    if (header) {
      if (y > 100) header.classList.add('is-small');
      else if (y < 20) header.classList.remove('is-small');
    }
    if (header) {
      if (y <= 80) header.classList.remove('is-down');
      else if (y > lastY) { header.classList.add('is-down'); turnY = y; }
      else if (turnY - y > UP) header.classList.remove('is-down');
      lastY = y;
    }
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

  // «+7 » стоит в поле сразу: человек вводит только номер без кода страны
  var PREFIX = '+7 ';
  function digitsOf(v) {
    var s = String(v);
    if (s.slice(0, 2) === '+7') {
      var rest = s.slice(2).replace(/\D/g, '');
      // вставили номер целиком (8 905… или 7 905…) поверх «+7» — код не дублируем
      if (rest.length === 11 && /^[78]/.test(rest)) rest = rest.slice(1);
      return '7' + rest;
    }
    return s.replace(/\D/g, '');
  }

  document.querySelectorAll('input[type="tel"]').forEach(function (input) {
    if (!input.value) input.value = PREFIX;
    // после form.reset() (повторное открытие окна заявки) возвращаем «+7 »
    if (input.form) input.form.addEventListener('reset', function () {
      setTimeout(function () { input.value = PREFIX; }, 0);
    });
    // курсор не должен вставать внутрь «+7»
    input.addEventListener('focus', function () {
      setTimeout(function () {
        if (input.selectionStart < PREFIX.length) input.setSelectionRange(input.value.length, input.value.length);
      }, 0);
    });
    input.addEventListener('input', function () {
      // Считаем цифры слева от курсора — по ним восстановим позицию после
      // переформатирования. Иначе курсор улетает в конец и править середину
      // номера нельзя.
      var caret = input.selectionStart;
      var digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;

      var dg = digitsOf(input.value);
      input.value = dg.length <= 1 ? PREFIX : format(dg);

      var seen = 0;
      var pos = input.value.length;
      for (var i = 0; i < input.value.length; i++) {
        if (/\d/.test(input.value[i])) {
          seen++;
          if (seen === digitsBefore) { pos = i + 1; break; }
        }
      }
      if (digitsBefore <= 1) pos = input.value.length;
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
        if (el.type !== 'checkbox' && (el.value === '' || (el.type === 'tel' && el.value.replace(/\D/g, '').length <= 1))) return;
        mark(el);
      });
      el.addEventListener('input', function () { fieldOf(el)?.classList.remove('is-bad'); });
    });
  });
})();

/* --- заявка во всплывающем окне ---
   Любая ссылка на #zayavka открывает окно с формой вместо прокрутки к форме.
   Без JS или без <dialog> ссылка работает как обычный якорь. */
(function () {
  const dlg = document.querySelector('[data-lead-popup]');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const titleEl = dlg.querySelector('[data-lead-popup-title]');
  const source = dlg.querySelector('input[name="source"]');
  const form = dlg.querySelector('form[data-lead]');
  const done = dlg.querySelector('[data-lead-done]');
  const page = location.pathname.replace(/^\/+|\.html$/g, '') || 'glavnaya';
  let opener = null;

  function open(link) {
    opener = link;
    // После отправленной заявки окно снова показывает форму, а не «Заявка принята»
    if (done && !done.hidden && form) {
      done.hidden = true; form.hidden = false; form.reset();
      const btn = form.querySelector('[type="submit"]');
      if (btn && btn.dataset.label) { btn.disabled = false; btn.textContent = btn.dataset.label; }
    }
    titleEl.textContent = link.dataset.leadTitle || dlg.dataset.defaultTitle;
    // Источник заявки: с какой страницы и с какой кнопки пришёл человек
    source.value = 'popup-' + page + (link.dataset.leadSource ? '-' + link.dataset.leadSource : '');
    dlg.showModal();
    // Для аналитики: окно открыли (цель LEAD_POPUP в Метрике, см. Analytics.astro)
    document.dispatchEvent(new CustomEvent('lead:popup'));
    const first = dlg.querySelector('input:not([type=hidden]):not([tabindex="-1"])');
    if (first) first.focus();
  }

  document.addEventListener('click', function (e) {
    const link = e.target.closest && e.target.closest('a[href="#zayavka"]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    open(link);
  });

  dlg.querySelector('[data-lead-close]').addEventListener('click', function () { dlg.close(); });
  // Клик по затемнению вокруг окна закрывает его
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { if (opener) opener.focus({ preventScroll: true }); });
})();

/* --- цифры компании: докручиваются от нуля при появлении на экране ---
   В разметке сразу стоят итоговые значения: без JS, без IntersectionObserver
   и при «уменьшении движения» ничего не анимируем. */
(function () {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fmt = (v, d) => v.toFixed(d).replace('.', ',');

  function run(el) {
    const to = parseFloat(el.dataset.count);
    const d = parseInt(el.dataset.decimals || '0', 10);
    const dur = 1400;
    let t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      const k = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - k, 3);          // быстро в начале, мягко в конце
      el.textContent = fmt(to * eased, d);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      run(e.target);
    });
  }, { threshold: 0.6 });

  els.forEach(function (el) {
    const r = el.getBoundingClientRect();
    // То, что уже на экране при загрузке, не сбрасываем в ноль — сразу крутим
    if (r.top < window.innerHeight && r.bottom > 0) { run(el); return; }
    el.textContent = fmt(0, parseInt(el.dataset.decimals || '0', 10));
    io.observe(el);
  });
})();

/* --- картинки и схемы в статьях: увеличение поверх страницы ---
   Схема в статье — ссылка на свой файл. Без JS ссылка открывает файл как раньше,
   с JS — окно поверх статьи: закрывается крестиком, Esc, кликом по фону или по картинке. */
(function () {
  const prose = document.querySelector('.prose');
  if (!prose) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'lbx';
  dlg.innerHTML = '<button type="button" class="lbx__close" aria-label="Закрыть">×</button><img class="lbx__img" alt="">';
  document.body.appendChild(dlg);
  if (typeof dlg.showModal !== 'function') return;
  const img = dlg.querySelector('.lbx__img');

  function open(src, alt) {
    img.src = src; img.alt = alt || '';
    dlg.showModal();
  }
  // Фотографии без ссылки тоже можно увеличить
  prose.querySelectorAll('img').forEach(function (i) {
    if (!i.closest('a')) i.style.cursor = 'zoom-in';
  });
  prose.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const i = e.target.closest('img');
    if (!i) return;
    const a = i.closest('a');
    if (a && !/\.(svg|png|jpe?g|webp)$/i.test(a.getAttribute('href') || '')) return;
    e.preventDefault();
    open(a ? a.href : (i.currentSrc || i.src), i.alt);
  });
  dlg.addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', function () { img.removeAttribute('src'); });
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
