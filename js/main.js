/* ════════════════════════════════════════════════════
   ANV-Ai — main.js
   Handles: particles, nav, tabs, GSAP animations,
            counter, donut chart, form, sticky CTA
════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────
   CONFIG
──────────────────────────────────────────────── */
/** Если задан — JSON POST сюда (CRM / свой backend). Иначе заявки идут на почту через FormSubmit. */
const FORM_WEBHOOK_URL = '';

/** Почта для заявок (FormSubmit). При первой отправке проверьте inbox — может понадобиться активация формы. */
const ANV_LEADS_EMAIL = 'mrtoooook@gmail.com';
const ANV_LEAD_EMAIL_SUBJECT = 'ЗАЯВКА ANV';

/* ────────────────────────────────────────────────
   VIDEO SCROLL HERO
   Видео привязано к позиции скролла.
   canvas#vhero-canvas получает каждый кадр через
   video.currentTime = progress * duration.
──────────────────────────────────────────────── */
function initScrollVideoHero() {
  const canvas = document.getElementById('vhero-canvas');
  if (!canvas) return;

  const ctx   = canvas.getContext('2d');
  const track = document.querySelector('.vhero__track');
  const dpr   = window.devicePixelRatio || 1;

  // Скрытый video-элемент для seek-а
  const video = document.createElement('video');
  video.src        = 'Desk_transformation_chaos_202604110018.mp4';
  video.muted      = true;
  video.playsInline= true;
  video.preload    = 'auto';
  video.style.display = 'none';
  document.body.appendChild(video);

  // Canvas с Retina-поддержкой
  function resize() {
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Cover-fit: видео заполняет весь canvas без деформации
  function drawCover() {
    if (video.readyState < 2) return;
    const vw = video.videoWidth,  vh = video.videoHeight;
    const cw = canvas.width,      ch = canvas.height;
    const scale = Math.max(cw / vw, ch / vh);
    const w = vw * scale, h = vh * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(video, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  // Непрерывный RAF-цикл отрисовки
  (function loop() { drawCover(); requestAnimationFrame(loop); })();

  // Элементы фаз и UI
  const p1   = document.getElementById('vp1');
  const p2   = document.getElementById('vp2');
  const p3   = document.getElementById('vp3');
  const hint = document.getElementById('vhero-hint');
  const bar  = document.getElementById('vhero-bar');

  let ticking = false;

  function update() {
    ticking = false;
    if (!track) return;

    const trackH = track.offsetHeight - window.innerHeight;
    const prog   = Math.max(0, Math.min(1, window.scrollY / trackH));

    // Перемотка видео
    if (video.duration) video.currentTime = prog * video.duration;

    // Фазы текста
    if (p1) p1.classList.toggle('active', prog < 0.28);
    if (p2) p2.classList.toggle('active', prog >= 0.38 && prog < 0.66);
    if (p3) p3.classList.toggle('active', prog >= 0.74);

    // Scroll hint исчезает после первого скролла
    if (hint) hint.style.opacity = prog < 0.04 ? '1' : '0';

    // Прогресс-бар
    if (bar) bar.style.width = (prog * 100) + '%';
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  video.addEventListener('loadeddata', update);
  update();
}

/* ────────────────────────────────────────────────
   PARTICLE CANVAS (legacy — kept for reference)
──────────────────────────────────────────────── */
function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, animId;

  const CONFIG = {
    count: window.innerWidth < 768 ? 60 : 120,
    maxDist: 140,
    speed: 0.35,
    radius: 1.8,
    colors: ['rgba(96,165,250,', 'rgba(124,58,237,', 'rgba(37,99,235,'],
  };

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function Particle() {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.vx = (Math.random() - 0.5) * CONFIG.speed;
    this.vy = (Math.random() - 0.5) * CONFIG.speed;
    this.r  = Math.random() * CONFIG.radius + 0.8;
    this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    this.alpha = Math.random() * 0.5 + 0.2;
  }

  function init() {
    resize();
    particles = Array.from({ length: CONFIG.count }, () => new Particle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Update positions
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.maxDist) {
          const opacity = (1 - dist / CONFIG.maxDist) * 0.18;
          ctx.strokeStyle = `rgba(96,165,250,${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw dots
    particles.forEach(p => {
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    animId = requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas.parentElement);
  window.addEventListener('resize', resize, { passive: true });

  // Pause when hidden to save battery
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else draw();
  });

  init();
  draw();
}

/* ────────────────────────────────────────────────
   NAVIGATION
──────────────────────────────────────────────── */
function initNav() {
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('nav-burger');
  const links  = document.getElementById('nav-links');
  if (!nav) return;

  // Scrolled class
  const onScroll = () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 40);

    // Sticky mobile CTA
    const stickyCta = document.getElementById('sticky-cta');
    if (stickyCta) {
      // Sticky CTA появляется после прохождения ~60% видео-трека
      const track = document.querySelector('.vhero__track');
      const threshold = track ? track.offsetHeight * 0.6 : 400;
      stickyCta.classList.toggle('visible', window.scrollY > threshold);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Burger menu
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = burger.classList.toggle('open');
      links.classList.toggle('nav--open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    links.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        links.classList.remove('nav--open');
        document.body.style.overflow = '';
      });
    });
  }
}

/* ────────────────────────────────────────────────
   TABS
──────────────────────────────────────────────── */
function initTabs() {
  const btns   = document.querySelectorAll('.tabs__btn');
  const panels = document.querySelectorAll('.tabs__panel');
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      btns.forEach(b => b.classList.toggle('tabs__btn--active', b === btn));
      panels.forEach(p => {
        const match = p.id === `tab-${target}`;
        p.classList.toggle('tabs__panel--active', match);
        p.hidden = !match;
      });

      // Some elements inside tabs use ScrollTrigger. Refresh after DOM visibility changes.
      if (typeof ScrollTrigger !== 'undefined') {
        requestAnimationFrame(() => ScrollTrigger.refresh());
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
        // Ease out cubic
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
   SVG uses stroke-dasharray to reveal segments.
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
      // Animate stroke-dasharray from "0 C" to "target gap"
      seg.style.transition = 'stroke-dasharray 1.6s cubic-bezier(0.16,1,0.3,1)';
      // Use requestAnimationFrame to ensure transition fires
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
    // Fallback: just show everything if GSAP fails to load
    document.querySelectorAll('[data-anim]').forEach(el => {
      el.style.opacity = 1;
      el.style.transform = 'none';
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
  // Avoid double-animating elements that already have dedicated animations below.
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
      clearProps: 'transform,opacity',
    });
  });

  // NOTE: Avoid animating grids as a group.
  // In some browser/scroll states this can leave one of the cards stuck at opacity: 0.
  // Cards still have their own hover effects, and the rest of the page keeps scroll animations.

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
    });
  }

  // Metric cards inside tabs — re-trigger on tab switch handled separately
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

  // Real-time field validation
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

    // Validate required fields
    ['f-name', 'f-contact', 'f-role'].forEach(id => {
      const el = document.getElementById(id);
      if (!el?.value.trim()) {
        el.classList.add('input--error');
        showError(`err-${el.name}`, 'Пожалуйста, заполните это поле');
        valid = false;
      }
    });

    const privacy = document.getElementById('f-privacy');
    if (!privacy?.checked) {
      showError('err-privacy', 'Необходимо ваше согласие');
      valid = false;
    } else {
      clearError('err-privacy');
    }

    if (!valid) return;

    // Submit
    submit.classList.add('loading');
    submit.disabled = true;

    const data = {
      name:    document.getElementById('f-name').value.trim(),
      contact: document.getElementById('f-contact').value.trim(),
      role:    document.getElementById('f-role').value.trim(),
      company: document.getElementById('f-company').value.trim(),
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

      // Show success only after server accepted the request
      form.querySelectorAll('.form__field, .form__checkbox, .form__submit').forEach(el => {
        el.style.display = 'none';
      });
      success.hidden = false;
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
function initAnchors() {
  const NAV_H = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - NAV_H - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ────────────────────────────────────────────────
   INIT — wait for DOM + GSAP load
──────────────────────────────────────────────── */
function init() {
  initScrollVideoHero();
  initNav();
  initTabs();
  initCounters();
  initDonut();
  initForm();
  initAnchors();
  // GSAP loaded deferred — wait a tick
  setTimeout(initGSAP, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
