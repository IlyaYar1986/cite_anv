/* ════════════════════════════════════════════════════
   ANV-Ai — main.js
   Handles: nav, tabs, GSAP animations, counters,
            donut chart, form, sticky CTA, video hero
════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────
   CONFIG
──────────────────────────────────────────────── */
const FORM_WEBHOOK_URL = '';
const ANV_LEADS_EMAIL = 'mrtoooook@gmail.com';
const ANV_LEAD_EMAIL_SUBJECT = 'ЗАЯВКА ANV';

const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ────────────────────────────────────────────────
   SCROLL BUS — единый scroll-listener на всю страницу.
   Подписчики через subscribeScroll(fn); вызывается
   через requestAnimationFrame с дедупликацией кадра.
──────────────────────────────────────────────── */
const scrollSubs = new Set();
let scrollTicking = false;

function flushScroll() {
  scrollTicking = false;
  const y = window.scrollY;
  scrollSubs.forEach(fn => {
    try { fn(y); } catch (e) { /* no-op */ }
  });
}

function onScrollGlobal() {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(flushScroll);
  }
}

function subscribeScroll(fn) {
  scrollSubs.add(fn);
  fn(window.scrollY);
  return () => scrollSubs.delete(fn);
}

window.addEventListener('scroll', onScrollGlobal, { passive: true });

/* ────────────────────────────────────────────────
   VIDEO SCROLL HERO
   Видео привязано к позиции скролла.
   Рисуем кадр ТОЛЬКО при scroll/seek и пока hero виден,
   а не в непрерывном RAF-цикле — экономит CPU/GPU.
──────────────────────────────────────────────── */
function initScrollVideoHero() {
  const canvas = document.getElementById('vhero-canvas');
  if (!canvas) return;

  const ctx   = canvas.getContext('2d', { alpha: false });
  const track = document.querySelector('.vhero__track');
  // Ограничиваем DPR, чтобы не убивать GPU на 3x Retina
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);

  // Скрытый video-элемент для seek-а
  const video = document.createElement('video');
  video.src         = 'Desk_transformation_chaos_202604110018.mp4';
  video.muted       = true;
  video.playsInline = true;
  video.preload     = 'auto';
  video.style.display = 'none';
  document.body.appendChild(video);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
  }
  resize();

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      resize();
      cacheTrackH();
      drawCover();
    });
  }, { passive: true });

  function drawCover() {
    if (video.readyState < 2) return;
    const vw = video.videoWidth,  vh = video.videoHeight;
    const cw = canvas.width,      ch = canvas.height;
    if (!vw || !vh) return;
    const scale = Math.max(cw / vw, ch / vh);
    const w = vw * scale, h = vh * scale;
    ctx.drawImage(video, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  // Элементы фаз и UI
  const p1   = document.getElementById('vp1');
  const p2   = document.getElementById('vp2');
  const p3   = document.getElementById('vp3');
  const hint = document.getElementById('vhero-hint');
  const bar  = document.getElementById('vhero-bar');

  // Кэш trackH — пересчитываем только на resize
  let trackH = 0;
  function cacheTrackH() {
    trackH = (track ? track.offsetHeight : 0) - window.innerHeight;
    if (trackH < 1) trackH = 1;
  }
  cacheTrackH();

  // Видимость hero — драйвим rAF только когда секция на экране
  let heroVisible = true;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(track || canvas);
  }

  // Кэш предыдущих значений, чтобы не трогать DOM/декодер впустую
  let lastSeek = -1;
  let lastPhase = -1; // 0 | 1 | 2
  let lastHintHidden = null;
  let lastBarW = -1;

  function setPhase(n) {
    if (lastPhase === n) return;
    lastPhase = n;
    if (p1) p1.classList.toggle('active', n === 0);
    if (p2) p2.classList.toggle('active', n === 1);
    if (p3) p3.classList.toggle('active', n === 2);
  }

  function update(y) {
    if (!track) return;
    if (!heroVisible && y > trackH) return; // не тратим ресурсы ниже hero

    const prog = y < 0 ? 0 : (y > trackH ? 1 : y / trackH);

    // Перемотка видео — только если изменение заметное (~30 fps grid)
    if (video.duration) {
      const seek = prog * video.duration;
      if (Math.abs(seek - lastSeek) > 0.033) {
        lastSeek = seek;
        video.currentTime = seek;
      }
    }

    // Фазы текста
    const phase = prog < 0.28 ? 0 : (prog < 0.66 && prog >= 0.38 ? 1 : (prog >= 0.74 ? 2 : -1));
    setPhase(phase);

    // Scroll hint
    const hide = prog >= 0.04;
    if (hint && hide !== lastHintHidden) {
      lastHintHidden = hide;
      hint.classList.toggle('vhero__hint--hidden', hide);
    }

    // Прогресс-бар
    if (bar) {
      const w = Math.round(prog * 1000) / 10; // 0.1%
      if (w !== lastBarW) {
        lastBarW = w;
        bar.style.width = w + '%';
      }
    }
  }

  // Рисуем кадр после seek
  video.addEventListener('seeked', drawCover);
  video.addEventListener('loadeddata', () => {
    drawCover();
    update(window.scrollY);
  });

  subscribeScroll(update);

  // Пересчёт при resize шрифтов/контента
  window.addEventListener('load', () => {
    cacheTrackH();
    update(window.scrollY);
  }, { once: true });
}

/* ────────────────────────────────────────────────
   NAVIGATION
──────────────────────────────────────────────── */
function initNav() {
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('nav-burger');
  const links  = document.getElementById('nav-links');
  if (!nav) return;

  const stickyCta = document.getElementById('sticky-cta');
  const track     = document.querySelector('.vhero__track');

  let stickyThreshold = 400;
  function cacheThreshold() {
    stickyThreshold = track ? track.offsetHeight * 0.6 : 400;
  }
  cacheThreshold();
  window.addEventListener('resize', cacheThreshold, { passive: true });

  let scrolled = false;
  let stickyVisible = false;

  subscribeScroll(y => {
    const nowScrolled = y > 40;
    if (nowScrolled !== scrolled) {
      scrolled = nowScrolled;
      nav.classList.toggle('nav--scrolled', scrolled);
    }
    if (stickyCta) {
      const nowVisible = y > stickyThreshold;
      if (nowVisible !== stickyVisible) {
        stickyVisible = nowVisible;
        stickyCta.classList.toggle('visible', stickyVisible);
        stickyCta.setAttribute('aria-hidden', String(!stickyVisible));
      }
    }
  });

  // Burger menu
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = burger.classList.toggle('open');
      links.classList.toggle('nav--open', open);
      nav.classList.toggle('nav--menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    links.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        links.classList.remove('nav--open');
        nav.classList.remove('nav--menu-open');
        document.body.style.overflow = '';
      });
    });
  }
}

/* ────────────────────────────────────────────────
   TABS
──────────────────────────────────────────────── */
function initTabs() {
  const btns   = Array.from(document.querySelectorAll('.tabs__btn'));
  const panels = Array.from(document.querySelectorAll('.tabs__panel'));
  if (!btns.length) return;

  function activate(btn, focus) {
    const target = btn.dataset.tab;
    btns.forEach(b => {
      const isActive = b === btn;
      b.classList.toggle('tabs__btn--active', isActive);
      b.setAttribute('aria-selected', String(isActive));
      b.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    panels.forEach(p => {
      const match = p.id === `tab-${target}`;
      p.classList.toggle('tabs__panel--active', match);
      p.hidden = !match;
    });
    if (focus) btn.focus();
    if (typeof ScrollTrigger !== 'undefined') {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }

  btns.forEach((btn, i) => {
    btn.addEventListener('click', () => activate(btn, false));
    btn.addEventListener('keydown', e => {
      let next = -1;
      if (e.key === 'ArrowRight') next = (i + 1) % btns.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = btns.length - 1;
      if (next >= 0) {
        e.preventDefault();
        activate(btns[next], true);
      }
    });
  });
}

/* ────────────────────────────────────────────────
   COUNTER (count-up on scroll)
──────────────────────────────────────────────── */
function initCounters() {
  const nums = document.querySelectorAll('.pain__num[data-target]');
  if (!nums.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      const el     = entry.target;
      const target = +el.dataset.target;
      const dur    = 1800;
      const start  = performance.now();

      function tick(now) {
        const t = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(ease * target);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.3 });

  nums.forEach(n => io.observe(n));
}

/* ────────────────────────────────────────────────
   DONUT CHART ANIMATION
──────────────────────────────────────────────── */
function initDonut() {
  const segs = document.querySelectorAll('.donut__seg');
  if (!segs.length) return;

  // circumference for r=76: 2 * π * 76 ≈ 477.52
  const C = 477.52;

  const io = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();

    segs.forEach(seg => {
      const target = parseFloat(seg.dataset.target);
      const gap    = C - target;
      seg.style.transition = 'stroke-dasharray 1.6s cubic-bezier(0.16,1,0.3,1)';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          seg.setAttribute('stroke-dasharray', `${target} ${gap}`);
        });
      });
    });
  }, { threshold: 0.4 });

  const chart = document.querySelector('.method__chart');
  if (chart) io.observe(chart);
}

/* ────────────────────────────────────────────────
   GSAP SCROLL ANIMATIONS
──────────────────────────────────────────────── */
function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    document.querySelectorAll('[data-anim]').forEach(el => {
      el.style.opacity = 1;
      el.style.transform = 'none';
      el.style.willChange = 'auto';
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance
  const heroContent = document.querySelector('[data-anim="hero-content"]');
  if (heroContent) {
    gsap.from(heroContent.children, {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out',
      delay: 0.15,
    });
  }

  // Generic fade-up elements
  document.querySelectorAll(
    '[data-anim="fade-up"]:not(.pain__card):not(.service-card):not(.method__pillar)'
  ).forEach(el => {
    const delay = parseFloat(el.dataset.delay || 0);
    gsap.fromTo(el,
      { y: 32, opacity: 0 },
      {
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
        duration: 0.8,
        delay,
        ease: 'power3.out',
        immediateRender: false,
        clearProps: 'transform,opacity,willChange',
      });
  });

  // Method pillars
  const pillars = document.querySelectorAll('.method__pillar');
  if (pillars.length) {
    gsap.from(pillars, {
      scrollTrigger: { trigger: '.method__pillars', start: 'top 85%', once: true },
      x: 32,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power3.out',
      clearProps: 'transform,opacity,willChange',
    });
  }

  // Methodology chart
  const chartWrap = document.querySelector('.method__chart-wrap');
  if (chartWrap) {
    gsap.from(chartWrap, {
      scrollTrigger: { trigger: chartWrap, start: 'top 85%', once: true },
      scale: 0.9,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      clearProps: 'transform,opacity,willChange',
    });
  }

  // Guarantee items
  const guarantees = document.querySelectorAll('.contact__guarantee');
  if (guarantees.length) {
    gsap.from(guarantees, {
      scrollTrigger: { trigger: '.contact__guarantees', start: 'top 85%', once: true },
      x: -24,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power3.out',
      clearProps: 'transform,opacity,willChange',
    });
  }

  ScrollTrigger.refresh();
}

/* ────────────────────────────────────────────────
   FORM HANDLING
──────────────────────────────────────────────── */
function initForm() {
  const form    = document.getElementById('contact-form');
  const submit  = document.getElementById('form-submit');
  const success = document.getElementById('form-success');
  if (!form) return;

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
  }
  function clearError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('visible');
  }

  ['f-name', 'f-contact', 'f-role'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      if (!el.value.trim()) {
        el.classList.add('input--error');
        showError(`err-${el.name}`, 'Пожалуйста, заполните это поле');
      } else {
        el.classList.remove('input--error');
        clearError(`err-${el.name}`);
      }
    });
    el.addEventListener('input', () => {
      if (el.value.trim()) {
        el.classList.remove('input--error');
        clearError(`err-${el.name}`);
      }
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let valid = true;

    ['f-name', 'f-contact', 'f-role'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!el.value.trim()) {
        el.classList.add('input--error');
        showError(`err-${el.name}`, 'Пожалуйста, заполните это поле');
        valid = false;
      }
    });

    const privacy = document.getElementById('f-privacy');
    if (!privacy || !privacy.checked) {
      showError('err-privacy', 'Необходимо ваше согласие');
      valid = false;
    } else {
      clearError('err-privacy');
    }

    if (!valid) return;

    submit.classList.add('loading');
    submit.disabled = true;

    const nameEl    = document.getElementById('f-name');
    const contactEl = document.getElementById('f-contact');
    const roleEl    = document.getElementById('f-role');
    const companyEl = document.getElementById('f-company');

    const data = {
      name:    nameEl    ? nameEl.value.trim()    : '',
      contact: contactEl ? contactEl.value.trim() : '',
      role:    roleEl    ? roleEl.value.trim()    : '',
      company: companyEl ? companyEl.value.trim() : '',
      source:  'ANV-Ai Landing',
      time:    new Date().toISOString(),
    };

    try {
      let res;

      if (FORM_WEBHOOK_URL) {
        res = await fetch(FORM_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        const to = encodeURIComponent(ANV_LEADS_EMAIL.trim());
        res = await fetch(`https://formsubmit.co/ajax/${to}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            _subject: ANV_LEAD_EMAIL_SUBJECT,
            _template: 'table',
            name: data.name,
            contact: data.contact,
            role: data.role,
            company: data.company || '—',
            source: data.source,
            time: data.time,
          }),
        });
        const json = await res.json().catch(() => ({}));
        const bad =
          !res.ok ||
          json.success === false ||
          json.success === 'false';
        if (bad) {
          throw new Error(json.message || `HTTP ${res.status}`);
        }
      }

      form.querySelectorAll('.form__field, .form__checkbox, .form__submit').forEach(el => {
        el.style.display = 'none';
      });
      if (success) success.hidden = false;
      submit.classList.remove('loading');

    } catch (err) {
      console.error('Form submit error:', err);
      alert('Произошла ошибка. Пожалуйста, напишите нам напрямую в Telegram.');
      submit.classList.remove('loading');
      submit.disabled = false;
    }
  });
}

/* ────────────────────────────────────────────────
   SMOOTH ANCHOR SCROLL (accounts for fixed nav)
──────────────────────────────────────────────── */
function getNavOffset() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--nav-h');
  const n = parseInt(v, 10);
  return (Number.isFinite(n) ? n : 72) + 16;
}

function scrollToId(id, smooth) {
  const target = document.getElementById(id);
  if (!target) return false;
  const top = target.getBoundingClientRect().top + window.scrollY - getNavOffset();
  window.scrollTo({
    top: Math.max(0, top),
    behavior: smooth && !PREFERS_REDUCED_MOTION ? 'smooth' : 'auto',
  });
  return true;
}

function initAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      scrollToId(id, true);
      if (history.replaceState) history.replaceState(null, '', href);
    });
  });

  // Если пришли по /#some-id — доскроллим с учётом fixed-nav
  if (location.hash && location.hash.length > 1) {
    requestAnimationFrame(() => {
      scrollToId(location.hash.slice(1), false);
    });
  }
}

/* ────────────────────────────────────────────────
   INIT
──────────────────────────────────────────────── */
function init() {
  initScrollVideoHero();
  initNav();
  initTabs();
  initCounters();
  initDonut();
  initForm();
  initAnchors();

  // GSAP подключён с defer — к DOMContentLoaded уже готов.
  // Подстраховка через window.load для самых медленных соединений.
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    initGSAP();
  } else {
    window.addEventListener('load', initGSAP, { once: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
