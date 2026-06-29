/* THE GREI SHOW - MOTION SYSTEM CORE */

// Smooth page entrance transition
function pageEnter() {
  document.body.classList.add('page-enter');
  requestAnimationFrame(() => {
    document.body.classList.add('page-ready');
  });
}

// Scroll reveal system
function revealOnScroll() {
  const elements = document.querySelectorAll('[data-reveal]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, {
    threshold: 0.15
  });

  elements.forEach(el => observer.observe(el));
}

// Parallax micro-motion
function parallaxEffect() {
  const items = document.querySelectorAll('[data-parallax]');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    items.forEach(item => {
      const speed = item.dataset.parallax || 0.2;
      item.style.transform = `translateY(${scrollY * speed}px)`;
    });
  });
}

// Hover depth system
function hoverDepth() {
  const cards = document.querySelectorAll('.card, button, a');

  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px) scale(1.01)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// Init motion system
window.addEventListener('DOMContentLoaded', () => {
  pageEnter();
  revealOnScroll();
  parallaxEffect();
  hoverDepth();
});