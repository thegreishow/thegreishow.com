// Portal Transition System v3.1
// Cinematic cross-page transition engine + music-to-promo routing

(function () {
  const overlay = document.createElement('div');
  overlay.className = 'portal-overlay';
  document.body.appendChild(overlay);

  let isTransitioning = false;

  function activateOverlay() {
    overlay.classList.add('active');
    overlay.classList.add('portal-enter');
  }

  function deactivateOverlay() {
    overlay.classList.remove('active');
  }

  function navigate(href) {
    if (isTransitioning) return;
    isTransitioning = true;
    document.body.classList.add('portal-out');
    activateOverlay();
    setTimeout(() => {
      window.location.href = href;
    }, 520);
  }

  const promoSlugs = {
    'dark-side': 'dark-side-of-the-moon',
    'nothing-believe': 'theres-nothing-to-believe-in',
    'psy-phi': 'psy-phi',
    '1122': '1122-ep',
    'pineapples': 'pineapples-and-hot-sauce',
    'ep2': 'ep-2',
    'any-one': 'any-one-a-dem',
    '24-days': '24-days',
    'love-alone': 'a-love-alone',
    'ppp-remix': 'puff-puff-pass-remix-bay-c',
    'choppa-talk': 'choppa-talk',
    'river-dreams': 'river-of-dreams',
    'rage': 'rage',
    'game-hearts': 'game-of-hearts',
    'puff-pass': 'puff-puff-pass',
    'flame': 'the-flame',
    'vibe': 'the-vibe',
    'interlude': '2020-interlude',
    'friends': 'friends',
    'joy': 'joy',
    'squad': 'squad-people',
    'blind': 'blind-without-shades',
    'full-moon': 'full-moon'
  };

  function promoUrlFor(element) {
    const key = element && element.dataset ? element.dataset.release : '';
    const slug = promoSlugs[key];
    return slug ? `/promo/?slug=${encodeURIComponent(slug)}` : '';
  }

  function prepareMusicPromoCards() {
    if (!document.querySelector('.music-wrap')) return;

    const featured = document.querySelector('.release-stage');
    if (featured) {
      featured.dataset.promoUrl = '/promo/?slug=no-drama';
      featured.classList.add('promo-clickable');
      featured.setAttribute('tabindex', '0');
      featured.setAttribute('role', 'link');
      featured.setAttribute('aria-label', 'Open No Drama official promo page');
    }

    document.querySelectorAll('[data-release]').forEach(card => {
      const url = promoUrlFor(card);
      if (!url) return;
      card.dataset.promoUrl = url;
      card.classList.add('promo-clickable');
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'link');
      const title = card.querySelector('h2,h3')?.textContent?.trim() || 'release';
      card.setAttribute('aria-label', `Open ${title} official promo page`);
    });
  }

  document.addEventListener('click', (e) => {
    const promoCard = e.target.closest('[data-promo-url]');
    if (promoCard && !e.target.closest('a,button,input,select,textarea')) {
      e.preventDefault();
      navigate(promoCard.dataset.promoUrl);
      return;
    }

    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#')) return;
    e.preventDefault();
    navigate(href);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const promoCard = e.target.closest('[data-promo-url]');
    if (!promoCard || e.target.closest('a,button,input,select,textarea')) return;
    e.preventDefault();
    navigate(promoCard.dataset.promoUrl);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepareMusicPromoCards, { once: true });
  } else {
    prepareMusicPromoCards();
  }

  window.addEventListener('load', () => {
    prepareMusicPromoCards();
    setTimeout(() => {
      overlay.classList.remove('active');
      document.body.classList.remove('portal-out');
    }, 280);
  });
})();
