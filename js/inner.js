/* ════════════════════════════════════════════════════
   ANV-Ai — Inner pages JS
   Только бургер-меню и закрытие по клику по ссылке
════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function initInnerNav() {
    var nav    = document.getElementById('nav');
    var burger = document.getElementById('nav-burger');
    var links  = document.getElementById('nav-links');
    if (!burger || !links) return;

    burger.addEventListener('click', function () {
      var open = burger.classList.toggle('open');
      links.classList.toggle('nav--open', open);
      if (nav) nav.classList.toggle('nav--menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    links.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        links.classList.remove('nav--open');
        if (nav) nav.classList.remove('nav--menu-open');
        document.body.style.overflow = '';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInnerNav);
  } else {
    initInnerNav();
  }
})();
