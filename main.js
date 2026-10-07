/* =====================================================================
   PikaZapps — main.js
   Файл работает в двух режимах:
   • в браузере  — эффекты и интерактив страницы;
   • в Node.js   — `node main.js` поднимает статический сервер без зависимостей
                   (удобно для Termux + CloudPub). PORT=8080 HOST=0.0.0.0 по умолчанию.
   ===================================================================== */

if (typeof window === 'undefined') {
  /* ===================== NODE: статический сервер ===================== */
  const http = require('http');
  const fs = require('fs');
  const path = require('path');

  const ROOT = __dirname;
  const PORT = Number(process.env.PORT) || 8080;
  const HOST = process.env.HOST || '0.0.0.0';
  const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
  };

  const send = (res, code, text) => {
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
  };

  http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');

    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return send(res, 400, 'Bad Request');
    }
    if (urlPath.endsWith('/')) urlPath += 'index.html';

    // не отдаём скрытые файлы (.git и т.п.) и не выходим за пределы папки сайта
    if (urlPath.split('/').some((seg) => seg.startsWith('.'))) return send(res, 404, 'Not Found');
    const file = path.join(ROOT, path.normalize(urlPath));
    if (!file.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');

    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) return send(res, 404, 'Not Found');
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }).listen(PORT, HOST, () => {
    console.log(`[pikazapps] serving ${ROOT} → http://localhost:${PORT}`);
  });
} else {
  /* ===================== BROWSER ===================== */
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches;

  /* ---------- Год в футере ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Бургер-меню ---------- */
  const burger = $('.burger');
  const nav = $('#nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 861px)').addEventListener('change', () => setMenu(false));

  /* ---------- Подсветка активного пункта меню ---------- */
  const navLinks = $$('.nav__link');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((a) => {
        const active = a.getAttribute('href') === `#${id}`;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionObserver.observe(s));

  /* ---------- Появление при скролле ---------- */
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // лёгкий stagger для соседних элементов одного списка
      const siblings = el.parentElement ? $$(':scope > .reveal', el.parentElement) : [];
      const idx = Math.max(0, siblings.indexOf(el));
      el.style.transitionDelay = `${Math.min(idx, 6) * 60}ms`;
      el.classList.add('is-visible');
      el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
      obs.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  /* ---------- Фильтр проектов ---------- */
  const filterBtns = $$('.filter__btn');
  const projects = $$('.project');
  const emptyMsg = $('.projects__empty');
  filterBtns.forEach((btn) => {
    const f = btn.dataset.filter;
    const count = f === 'all' ? projects.length : projects.filter((p) => p.dataset.status === f).length;
    $('.filter__count', btn).textContent = count;
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      let shown = 0;
      projects.forEach((p) => {
        const match = f === 'all' || p.dataset.status === f;
        p.classList.toggle('is-hidden', !match);
        if (match) { p.classList.add('is-visible'); shown++; }
      });
      emptyMsg.hidden = shown > 0;
    });
  });

  /* ---------- Кнопка «Наверх» ---------- */
  const toTop = $('.to-top');
  let ticking = false;
  const onScroll = () => {
    toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    $('.header__logo').focus({ preventScroll: true });
  });

  /* =================================================================
     Matrix rain (canvas)
     ================================================================= */
  (() => {
    const canvas = $('#matrix');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const GLYPHS = KATAKANA + '0101010101' + '{}()[]<>=+-*/;$#&|';
    const WORDS = ['const', 'await', 'async', '=>', 'npm i', 'return', 'node', 'lua', 'bot.on', '</>', 'sudo', 'ping', 'ws://', '0x1F', 'git push', 'emit()', 'require', 'termux'];
    const COLORS = ['#7c3aed', '#8b5cf6', '#a855f7', '#9333ea', '#c026d3'];
    const HEAD = '#f0abfc';
    const BG = '#07050f';
    const FPS = 22;

    let w = 0, h = 0, size = 16, cols = [], raf = 0, last = 0;

    const pick = (s) => s[(Math.random() * s.length) | 0];
    const newCol = (spread) => ({
      y: spread ? -Math.random() * (h / size) * 1.2 : -Math.random() * 20,
      row: -1,
      speed: 0.35 + Math.random() * 0.65,
      word: Math.random() < 0.18 ? pick(WORDS) : null,
      wi: 0,
      color: pick(COLORS),
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // адаптивное количество колонок: на маленьких экранах колонки реже
      size = w < 480 ? 18 : w < 1200 ? 17 : w < 2200 ? 18 : 22;
      const n = Math.ceil(w / size);
      cols = Array.from({ length: n }, (_, i) => cols[i] || newCol(true));
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${size - 2}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'top';
    }

    function step() {
      ctx.fillStyle = 'rgba(7, 5, 15, 0.14)';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        c.y += c.speed;
        const row = Math.floor(c.y);
        if (row === c.row) continue;
        c.row = row;
        if (row < 0) continue;

        let ch;
        if (c.word) {
          ch = c.word[c.wi++];
          if (c.wi >= c.word.length) c.word = null;
        } else {
          ch = pick(GLYPHS);
          if (Math.random() < 0.006) { c.word = pick(WORDS); c.wi = 0; }
        }
        ctx.fillStyle = Math.random() < 0.12 ? HEAD : c.color;
        ctx.fillText(ch, i * size, row * size);

        if (row * size > h && Math.random() > 0.97) cols[i] = newCol(false);
      }
    }

    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (t - last < 1000 / FPS) return;
      last = t;
      step();
    }

    const start = () => {
      cancelAnimationFrame(raf);
      if (reducedMotion()) {
        // статичный кадр без анимации
        for (let k = 0; k < 90; k++) step();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); start(); }, 150);
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    motionQuery.addEventListener('change', start);

    resize();
    start();
  })();

  /* =================================================================
     Hero: печатающиеся сменяющиеся «роли» под ником
     ================================================================= */
  (() => {
    const el = $('#role');
    if (!el) return;
    const ROLES = [
      'пишу ботов для Discord и Telegram',
      'автоматизирую рутину',
      'хостю сайты на старом телефоне',
      'скриптую OpenComputers на Lua',
      'склеиваю API в одну систему',
    ];
    if (reducedMotion()) return; // остаётся первая фраза из HTML

    let i = 0, pos = ROLES[0].length, deleting = true, timer = 0;
    const tick = () => {
      if (document.hidden) { timer = setTimeout(tick, 500); return; }
      const word = ROLES[i];
      if (deleting) {
        pos--;
        el.textContent = word.slice(0, pos);
        if (pos === 0) { deleting = false; i = (i + 1) % ROLES.length; }
        timer = setTimeout(tick, 28);
      } else {
        const next = ROLES[i];
        pos++;
        el.textContent = next.slice(0, pos);
        if (pos === next.length) { deleting = true; timer = setTimeout(tick, 2600); return; }
        timer = setTimeout(tick, 45 + Math.random() * 50);
      }
    };
    timer = setTimeout(tick, 3200);
    motionQuery.addEventListener('change', () => {
      if (!reducedMotion()) return;
      clearTimeout(timer);
      el.textContent = ROLES[0];
    });
  })();

  /* ---------- Лёгкий параллакс фото-полос ---------- */
  (() => {
    const bands = $$('.band');
    if (!bands.length) return;
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    });
    bands.forEach((b) => io.observe(b));
    let queued = false;
    const update = () => {
      queued = false;
      if (reducedMotion()) return;
      const vh = window.innerHeight;
      visible.forEach((b) => {
        const r = b.getBoundingClientRect();
        // -1..1: положение центра полосы относительно центра экрана
        const k = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        b.style.setProperty('--py', `${(k * r.height * 0.1).toFixed(1)}px`);
      });
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  })();

  /* ---------- Часы в шапке ---------- */
  (() => {
    const clock = $('#clock');
    if (!clock) return;
    const fmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const update = () => { clock.textContent = fmt.format(new Date()); };
    update();
    setInterval(() => { if (!document.hidden) update(); }, 1000);
  })();
}
