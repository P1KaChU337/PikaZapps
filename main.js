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
  window.matchMedia('(min-width: 821px)').addEventListener('change', () => setMenu(false));

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
  // карточки внутри <li> — stagger считаем по <li>
  $$('.contacts > li > .reveal').forEach((el, i) => { el.style.transitionDelay = `${i * 60}ms`; });

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
     Typewriter — псевдо-IDE в hero
     ================================================================= */
  const IDE_CODE = `// NW Team Bot: Discord ↔ Telegram
import { Client, GatewayIntentBits } from 'discord.js';
import { Telegraf } from 'telegraf';

const discord = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});
const tg = new Telegraf(process.env.TG_TOKEN);

discord.on('guildMemberAdd', async (member) => {
  await member.roles.add(config.clanRole);
  await member.send(\`Привет, \${member.user.username}! Добро пожаловать в ༺NW༻\`);
  log('join', member.id);
});

discord.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  await tg.telegram.sendMessage(CHAT_ID, \`[DC] \${msg.author.username}: \${msg.content}\`);
});

discord.login(process.env.DISCORD_TOKEN);
tg.launch(); // 🚀 bridge online`;

  /** Мини-токенайзер JS → [[class, text], ...] */
  function tokenize(src) {
    const re = /(\/\/[^\n]*)|(`(?:\\.|[^`])*`|'(?:\\.|[^'\n])*'|"(?:\\.|[^"\n])*")|\b(import|from|const|let|new|async|await|if|return|for|of)\b|\b(\d+)\b|([A-Za-z_$][\w$]*)|([{}()[\];,.:=<>+\-*/!?])/g;
    const out = [];
    let lastIdx = 0, m, prevDot = false;
    while ((m = re.exec(src))) {
      if (m.index > lastIdx) out.push(['', src.slice(lastIdx, m.index)]);
      let cls = '';
      if (m[1]) cls = 't-com';
      else if (m[2]) cls = 't-str';
      else if (m[3]) cls = 't-kw';
      else if (m[4]) cls = 't-num';
      else if (m[5]) {
        const next = src.slice(re.lastIndex).match(/^\s*\(/);
        cls = next ? 't-fn' : prevDot ? 't-prop' : '';
      } else if (m[6]) cls = 't-pun';
      out.push([cls, m[0]]);
      prevDot = m[0] === '.';
      lastIdx = re.lastIndex;
    }
    if (lastIdx < src.length) out.push(['', src.slice(lastIdx)]);
    return out;
  }

  /** Печатает массив токенов в контейнер. Возвращает функцию отмены. */
  function typeTokens(target, tokens, { speed = 26, onLine, onDone } = {}) {
    let ti = 0, ci = 0, span = null, timer = 0, cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (document.hidden) { timer = setTimeout(tick, 400); return; }
      if (ti >= tokens.length) { if (onDone) onDone(); return; }
      const [cls, text] = tokens[ti];
      if (!span) {
        span = document.createElement('span');
        if (cls) span.className = cls;
        target.appendChild(span);
      }
      const ch = text[ci++];
      span.textContent += ch;
      if (ch === '\n' && onLine) onLine();
      if (ci >= text.length) { ti++; ci = 0; span = null; }
      const delay = ch === '\n' ? speed * 6 : ch === ' ' ? speed * 0.5 : speed * (0.5 + Math.random());
      timer = setTimeout(tick, delay);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }

  (() => {
    const code = $('#ide-code');
    const gutter = $('#ide-gutter');
    const body = $('.ide__body');
    const tokens = tokenize(IDE_CODE);
    let lines = 1;
    const setGutter = () => {
      gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
      body.scrollTop = body.scrollHeight;
    };

    const renderAll = () => {
      code.textContent = '';
      tokens.forEach(([cls, text]) => {
        const s = document.createElement('span');
        if (cls) s.className = cls;
        s.textContent = text;
        code.appendChild(s);
      });
      lines = IDE_CODE.split('\n').length;
      setGutter();
    };

    if (reducedMotion()) { renderAll(); return; }
    lines = 1;
    setGutter();
    // небольшая пауза, чтобы глаз сначала увидел заголовок
    setTimeout(() => typeTokens(code, tokens, { speed: 24, onLine: () => { lines++; setGutter(); } }), 600);
  })();

  /* =================================================================
     Терминал «лог запуска» — печатается, когда блок попадает в экран
     ================================================================= */
  (() => {
    const term = $('#term');
    if (!term) return;
    const uptime = 337 + (new Date().getDate() % 30);
    // [класс, текст]; строки с '$ ' печатаются посимвольно
    const LINES = [
      ['p', 'u0_a337@old-phone:~$ ', 'cmd', 'neofetch --off | head -3'],
      ['dim', 'OS: Ubuntu 25 (proot) on Termux / Android'],
      ['dim', `Host: старый смартфон · Uptime: ${uptime} days`],
      ['p', 'u0_a337@old-phone:~$ ', 'cmd', 'cd ~/pikazapps && node main.js &'],
      ['ok', '[pikazapps] serving ~/pikazapps → http://localhost:8080'],
      ['p', 'u0_a337@old-phone:~$ ', 'cmd', 'clo publish http 8080'],
      ['info', '[cloudpub] tunnel up → https://pikazapps.cloudpub.ru'],
      ['warn', '[check] белый IP: не найден · хостинг: не нужен'],
      ['ok', '[status] сайт онлайн ✦ батарея держится'],
    ];

    const add = (cls, text) => {
      const s = document.createElement('span');
      if (cls) s.className = cls;
      s.textContent = text;
      term.appendChild(s);
      return s;
    };

    const renderAll = () => {
      term.textContent = '';
      LINES.forEach((l) => {
        add(l[0], l[1]);
        if (l[3]) add('', l[3]);
        add('', '\n');
      });
      add('p', 'u0_a337@old-phone:~$ ');
      add('caret', '');
    };

    const play = () => {
      if (reducedMotion()) { renderAll(); return; }
      term.textContent = '';
      let i = 0;
      const next = () => {
        if (i >= LINES.length) {
          add('p', 'u0_a337@old-phone:~$ ');
          add('caret', '');
          return;
        }
        const l = LINES[i++];
        if (l[3]) {
          add(l[0], l[1]);
          typeTokens(term, [['', l[3]], ['', '\n']], { speed: 38, onDone: () => setTimeout(next, 350) });
        } else {
          add(l[0], l[1] + '\n');
          setTimeout(next, 260);
        }
      };
      next();
    };

    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { obs.disconnect(); play(); }
    }, { threshold: 0.35 });
    obs.observe(term);
  })();
}
