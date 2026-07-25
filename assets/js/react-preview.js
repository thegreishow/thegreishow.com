import React, { useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import { motion, useReducedMotion } from 'https://esm.sh/motion@12.23.12/react?deps=react@19.2.0,react-dom@19.2.0';

const h = React.createElement;

const portals = [
  {
    kicker: 'Listen',
    title: 'Audio Universe',
    description: 'Releases, collaborations, production credits and the signal behind the sound.',
    href: '/music.html',
    image: '/assets/img/no-drama.webp',
    action: 'Enter the music'
  },
  {
    kicker: 'Read',
    title: 'The Astral Thread',
    description: 'Stories, books and connected worlds from The Infinite Story-verse.',
    href: '/books.html',
    image: '/assets/images/books/astral-thread-cover.jpg',
    action: 'Open the story'
  },
  {
    kicker: 'Play',
    title: 'Grei Arcade',
    description: 'Original interactive experiments, Jamaican worlds and games built from the ground up.',
    href: '/arcade.html',
    image: '/assets/img/home-bg.webp',
    action: 'Start a game'
  }
];

const games = [
  {
    id: 'dreamweaver-oracle',
    title: 'Dreamweaver',
    description: 'Collect story fragments, survive corrupted memories, and shape a different dream every run.',
    version: '1.0',
    thumbnail: '/arcade/assets/thumbnails/dreamweaver-oracle.svg',
    tags: ['story', 'action', 'astral']
  },
  {
    id: 'signal-runner',
    title: 'Signal Runner',
    description: 'Catch clean signals, dodge static, and keep the transmission alive.',
    version: '0.1',
    thumbnail: '/arcade/assets/thumbnails/signal-runner.svg',
    tags: ['reflex', 'music', 'prototype']
  },
  {
    id: 'jamaica-run',
    title: 'Rasta Runner',
    description: 'Race across eight Jamaican stages, collect Grei coins, build combos, and survive the island road.',
    version: '1.2',
    thumbnail: '/arcade/assets/thumbnails/rasta-runner.svg',
    tags: ['runner', 'Jamaica', 'featured']
  }
];

function buildKeyframes(from, steps) {
  const keys = new Set([
    ...Object.keys(from),
    ...steps.flatMap((step) => Object.keys(step))
  ]);
  const keyframes = {};
  keys.forEach((key) => {
    keyframes[key] = [from[key], ...steps.map((step) => step[key])];
  });
  return keyframes;
}

function BlurText({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  stepDuration = 0.35
}) {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () => direction === 'top'
      ? { filter: 'blur(10px)', opacity: 0, y: -50 }
      : { filter: 'blur(10px)', opacity: 0, y: 50 },
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: 'blur(5px)',
        opacity: 0.5,
        y: direction === 'top' ? 5 : -5
      },
      { filter: 'blur(0px)', opacity: 1, y: 0 }
    ],
    [direction]
  );

  const stepCount = defaultTo.length + 1;
  const times = Array.from(
    { length: stepCount },
    (_, index) => stepCount === 1 ? 0 : index / (stepCount - 1)
  );

  return h(
    'p',
    { ref, className: `blur-text ${className}` },
    ...elements.map((segment, index) => h(
      motion.span,
      {
        key: `${segment}-${index}`,
        initial: defaultFrom,
        animate: inView ? buildKeyframes(defaultFrom, defaultTo) : defaultFrom,
        transition: {
          duration: stepDuration * (stepCount - 1),
          times,
          delay: (index * delay) / 1000,
          ease: (value) => value
        },
        style: {
          display: 'inline-block',
          willChange: 'transform, filter, opacity'
        }
      },
      segment,
      animateBy === 'words' && index < elements.length - 1 ? '\u00A0' : null
    ))
  );
}

function PortalCard({ portal, index, reduceMotion }) {
  return h(
    motion.a,
    {
      className: `portal-card portal-card-${index + 1}`,
      href: portal.href,
      initial: reduceMotion ? false : { opacity: 0, y: 34 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.18 },
      transition: { duration: 0.62, delay: index * 0.1 },
      whileHover: reduceMotion ? undefined : { y: -8 }
    },
    h('img', { src: portal.image, alt: '', loading: 'lazy' }),
    h('span', { className: 'portal-shade', 'aria-hidden': 'true' }),
    h('span', { className: 'portal-order' }, `0${index + 1}`),
    h(
      'span',
      { className: 'portal-content' },
      h('small', null, portal.kicker),
      h('strong', null, portal.title),
      h('span', null, portal.description),
      h('em', null, `${portal.action} →`)
    )
  );
}

function GameCard({ game, index, reduceMotion }) {
  return h(
    motion.a,
    {
      className: `game-card game-card-${index + 1}`,
      href: `/arcade/game.html?id=${encodeURIComponent(game.id)}`,
      initial: reduceMotion ? false : { opacity: 0, y: 28 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.16 },
      transition: { duration: 0.56, delay: index * 0.09 },
      whileHover: reduceMotion ? undefined : { y: -7 }
    },
    h(
      'span',
      { className: 'game-image' },
      h('img', { src: game.thumbnail, alt: `${game.title} game thumbnail`, loading: 'lazy' }),
      h('span', { className: 'game-badge' }, `Native · v${game.version}`),
      h('span', { className: 'game-number' }, `0${index + 1}`)
    ),
    h(
      'span',
      { className: 'game-copy' },
      h('small', null, 'The Grei Show Arcade'),
      h('h3', null, game.title),
      h('p', null, game.description),
      h(
        'span',
        { className: 'game-tags', 'aria-label': `${game.title} tags` },
        ...game.tags.map((tag) => h('span', { key: tag }, tag))
      ),
      h('span', { className: 'game-link' }, 'Insert coin →')
    )
  );
}

function App() {
  const reduceMotion = useReducedMotion();

  return h(
    'div',
    { className: 'preview-shell' },
    h('div', { className: 'ambient ambient-one', 'aria-hidden': 'true' }),
    h('div', { className: 'ambient ambient-two', 'aria-hidden': 'true' }),
    h('div', { className: 'grain', 'aria-hidden': 'true' }),

    h(
      'header',
      { className: 'preview-bar' },
      h(
        'a',
        { className: 'wordmark', href: '/', 'aria-label': 'The Grei Show home' },
        h('span', { className: 'wordmark-mark' }, 'G'),
        h('span', null, 'THE GREI SHOW')
      ),
      h(
        'nav',
        { className: 'preview-nav', 'aria-label': 'Preview navigation' },
        h('a', { href: '#portals' }, 'Worlds'),
        h('a', { href: '#arcade' }, 'Arcade'),
        h('a', { href: '/connect.html' }, 'Connect'),
        h('a', { className: 'preview-pill', href: '/', title: 'Return to the current live homepage' }, 'React Preview')
      )
    ),

    h(
      'main',
      { className: 'preview-main' },
      h(
        'section',
        { className: 'hero', 'aria-labelledby': 'preview-title' },
        h(
          'div',
          { className: 'hero-copy' },
          h(
            'div',
            { className: 'hero-meta', 'aria-label': 'Transmission details' },
            h('span', null, 'Kingston, Jamaica'),
            h('span', null, 'Transmission 001'),
            h('span', null, 'Signal active')
          ),
          h('p', { className: 'eyebrow' }, 'Artist · producer · author · world-builder'),
          h('h1', { id: 'preview-title', className: 'sr-only' }, 'Enter The Grei Show'),
          h(BlurText, {
            text: 'ENTER',
            delay: reduceMotion ? 0 : 95,
            animateBy: 'letters',
            direction: 'bottom',
            className: 'display-title display-title-enter',
            stepDuration: reduceMotion ? 0 : 0.42
          }),
          h(
            motion.p,
            {
              className: 'display-title display-title-name',
              initial: reduceMotion ? false : { opacity: 0, x: -26 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.75, delay: 0.52 }
            },
            'THE GREI SHOW'
          ),
          h(
            'div',
            { className: 'hero-manifesto' },
            h('span', { className: 'hero-index' }, '01'),
            h('p', { className: 'hero-lead' }, 'Music you can feel. Stories you can enter. Original worlds you can watch, read and play.')
          ),
          h(
            'div',
            { className: 'hero-actions' },
            h('a', { className: 'action-button primary', href: 'https://snd.click/qnbs', target: '_blank', rel: 'noopener' }, 'Hear No Drama'),
            h('a', { className: 'action-button secondary', href: '#portals' }, 'Enter the universe')
          )
        ),
        h(
          'div',
          { className: 'art-stage', 'aria-label': 'Featured Grei Show releases' },
          h('div', { className: 'vinyl-disc', 'aria-hidden': 'true' }, h('span')),
          h(
            motion.a,
            {
              className: 'art-card art-card-back',
              href: '/books.html',
              initial: reduceMotion ? false : { opacity: 0, rotate: -3, x: 36 },
              animate: { opacity: 1, rotate: 6, x: 0 },
              transition: { duration: 0.8, delay: 0.42 },
              whileHover: reduceMotion ? undefined : { rotate: 2, y: -8 }
            },
            h('img', { src: '/assets/images/books/astral-thread-cover.jpg', alt: 'The Astral Thread book cover' }),
            h('span', null, 'Story 01')
          ),
          h(
            motion.a,
            {
              className: 'feature-art',
              href: '/music.html',
              initial: reduceMotion ? false : { opacity: 0, y: 28, rotate: 2 },
              animate: { opacity: 1, y: 0, rotate: -2 },
              transition: { duration: 0.85, delay: 0.24 },
              whileHover: reduceMotion ? undefined : { y: -9, rotate: 0 }
            },
            h('img', { src: '/assets/img/no-drama.webp', alt: 'No Drama single cover by The Grei Show' }),
            h(
              'span',
              { className: 'feature-label' },
              h('small', null, 'New transmission'),
              h('strong', null, 'No Drama'),
              h('em', null, 'Listen everywhere ↗')
            )
          ),
          h(
            'div',
            { className: 'release-stamp', 'aria-hidden': 'true' },
            h('strong', null, 'NO DRAMA'),
            h('span', null, 'NEW SIGNAL · 2026')
          ),
          h('span', { className: 'art-counter' }, '01 / 02')
        )
      ),

      h(
        'div',
        { className: 'signal-marquee', 'aria-label': 'The Grei Show creative disciplines' },
        h(
          'div',
          null,
          ...['Music','✦','Books','✦','Games','✦','Film','✦','Photography','✦','Live','✦','Music','✦','Books','✦','Games','✦'].map((item, index) =>
            item === '✦'
              ? h('i', { key: `${item}-${index}` }, item)
              : h('span', { key: `${item}-${index}` }, item)
          )
        )
      ),

      h(
        'section',
        { id: 'portals', className: 'section-block', 'aria-labelledby': 'portals-title' },
        h(
          'div',
          { className: 'section-heading section-heading-numbered' },
          h('span', { className: 'section-number' }, '02'),
          h('p', { className: 'eyebrow' }, 'Choose your portal'),
          h('h2', { id: 'portals-title' }, 'One universe.', h('br'), 'Many ways in.')
        ),
        h(
          'div',
          { className: 'portal-grid portal-grid-editorial' },
          ...portals.map((portal, index) => h(PortalCard, { key: portal.title, portal, index, reduceMotion }))
        )
      ),

      h(
        'section',
        { id: 'arcade', className: 'section-block', 'aria-labelledby': 'arcade-preview-title' },
        h(
          'div',
          { className: 'section-heading section-heading-numbered' },
          h('span', { className: 'section-number' }, '03'),
          h('p', { className: 'eyebrow' }, 'Playable worlds'),
          h('h2', { id: 'arcade-preview-title' }, 'Three games.', h('br'), 'One growing mythology.')
        ),
        h(
          'div',
          { className: 'arcade-grid arcade-grid-editorial' },
          ...games.map((game, index) => h(GameCard, { key: game.id, game, index, reduceMotion }))
        )
      ),

      h(
        'section',
        { className: 'statement statement-v3', 'aria-labelledby': 'statement-title' },
        h('span', { className: 'section-number' }, '04'),
        h('p', { className: 'eyebrow' }, 'The signal continues'),
        h('h2', { id: 'statement-title' }, 'Not a portfolio.', h('br'), 'A world in progress.'),
        h('p', null, 'Records become stories. Stories become games. Every door leads deeper into the same universe.'),
        h('a', { className: 'statement-link', href: '/connect.html' }, 'Build something together ↗')
      )
    ),

    h(
      'footer',
      { className: 'preview-footer' },
      h('span', null, '© 2026 The Grei Show · Kingston, Jamaica'),
      h('a', { href: '/' }, 'Return to the current site')
    )
  );
}

const root = document.getElementById('react-preview-root');
if (!root) throw new Error('React preview root was not found.');
createRoot(root).render(h(React.StrictMode, null, h(App)));
