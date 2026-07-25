import React, { useEffect, useRef, useState } from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import { AnimatePresence, motion, useReducedMotion } from 'https://esm.sh/motion@12.23.12/react?deps=react@19.2.0,react-dom@19.2.0';

const h = React.createElement;
const siteUrl = path => new URL(path, window.location.origin).toString();
const track = (event, payload = {}) => window.dispatchEvent(new CustomEvent('grei:analytics', { detail: { event, payload } }));

const navigation = [
  ['Music', siteUrl('/music.html')], ['Books', siteUrl('/books.html')], ['Arcade', siteUrl('/arcade.html')], ['Connect', siteUrl('/connect.html')]
];
const portals = [
  { kicker: 'Listen', title: 'Audio Universe', href: siteUrl('/music.html'), image: siteUrl('/assets/img/no-drama.webp'), action: 'Enter the music', event: 'explore_music' },
  { kicker: 'Read & listen', title: 'The Astral Thread', href: siteUrl('/books.html'), image: siteUrl('/assets/images/books/astral-thread-cover.jpg'), action: 'Open the book', event: 'explore_books' },
  { kicker: 'Play', title: 'Grei Arcade', href: siteUrl('/arcade.html'), image: siteUrl('/arcade/assets/thumbnails/signal-runner.svg'), action: 'Start a game', event: 'explore_arcade' }
];
const platforms = [
  ['Spotify', 'https://open.spotify.com/artist/78LUuzis8k8cGRCalx751k'],
  ['Apple Music', 'https://music.apple.com/jm/artist/the-grei-show/885841733'],
  ['YouTube', 'https://youtube.com/@thegreishxw'],
  ['Bandcamp', 'https://thegreishow.bandcamp.com']
];
const offers = [
  { number: '01 · Read', kicker: 'Official ebook', title: 'Own The Astral Thread', body: 'A reflective collection built for late-night reading, listening, and visual exploration.', action: 'Buy the ebook', href: 'https://www.amazon.com/dp/B0F7RQ3463', primary: true, actionType: 'link' },
  { number: '02 · Listen', kicker: 'Direct support + stats', title: 'Back the music', body: 'Stream across every major platform or support the catalogue directly through Bandcamp.', action: 'Choose your platform', primary: true, actionType: 'platform-modal' },
  { number: '03 · Book', kicker: 'Performances & services', title: 'Bring the experience to you', body: 'Request a performance, DJ set, studio session, photo or video service, creative talent, or a private Kingston experience.', action: 'Check availability & book', href: siteUrl('/connect.html?interest=live-performance'), primary: false, actionType: 'link' }
];
const services = [
  ['01', 'Music production', 'Original production, collaboration, development, and release support.'],
  ['02', 'Creative direction', 'A clear visual and narrative system around the work.'],
  ['03', 'Sync & partnerships', 'Music, media, performance, press, and aligned brand conversations.']
];

function Heading({ kicker, title, body, id }) {
  return h('div', { className: 'section-heading' }, h('p', { className: 'section-kicker' }, kicker), h('h2', { id }, title), h('p', null, body));
}

function PlatformModal({ open, onClose }) {
  const cardRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const nodes = [...cardRef.current.querySelectorAll('a[href],button:not([disabled])')];
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = oldOverflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  return h(AnimatePresence, null, open && h(motion.div, {
    className: 'stream-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'platform-title',
    initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 },
    onMouseDown: event => event.target === event.currentTarget && onClose()
  }, h(motion.div, { ref: cardRef, className: 'modal-card', initial: { opacity: 0, y: 18, scale: .98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 10, scale: .98 } },
    h('div', { className: 'modal-top' }, h('div', null, h('p', { className: 'section-kicker' }, 'Listen your way'), h('h2', { id: 'platform-title' }, 'Choose a platform'), h('p', null, 'Select your preferred streaming service.')), h('button', { ref: closeRef, className: 'modal-close', type: 'button', 'aria-label': 'Close platform chooser', onClick: onClose }, '×')),
    h('div', { className: 'modal-platforms' }, ...platforms.map(([name, href]) => h('a', { key: name, href, target: '_blank', rel: 'noreferrer', onClick: () => track('platform_select', { platform: name }) }, h('span', null, name), h('span', null, '↗'))))
  )));
}

function App() {
  const reduceMotion = useReducedMotion();
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [formState, setFormState] = useState({ status: '', tone: '', submitting: false, invalid: false });
  const reveal = reduceMotion ? false : { opacity: 0, y: 22 };

  const submitNewsletter = event => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.email.value.trim();
    if (!email || !email.includes('@')) {
      setFormState({ status: 'Enter a valid email address.', tone: 'error', submitting: false, invalid: true });
      form.elements.email.focus();
      return;
    }
    setFormState({ status: 'Validating the preview submission…', tone: '', submitting: true, invalid: false });
    window.setTimeout(() => {
      setFormState({ status: 'Preview validated. The production mailing-list transport remains untouched.', tone: 'success', submitting: false, invalid: false });
      track('newsletter_preview_validated', { source: 'infrastructure-preview-2' });
    }, 550);
  };

  return h(React.Fragment, null,
    h('a', { className: 'skip-link', href: '#main-content' }, 'Skip to content'),
    h('header', { className: 'preview-header' },
      h('a', { className: 'wordmark', href: siteUrl('/'), onClick: () => track('navigation', { destination: 'home' }) }, 'THE GREI SHOW'),
      h('nav', { 'aria-label': 'Primary navigation' }, ...navigation.map(([label, href]) => h('a', { key: label, href, onClick: () => track('navigation', { destination: label.toLowerCase() }) }, label)))
    ),
    h('main', { id: 'main-content', className: 'home' },
      h('section', { className: 'hero', 'aria-labelledby': 'home-title' },
        h('div', { className: 'hero-copy' },
          h('p', { className: 'hero-kicker' }, 'Jamaican artist · Producer · World-builder'),
          h('h1', { id: 'home-title', className: 'hero-title' }, h('span', null, 'Enter'), h(motion.span, { className: 'react-title-word', initial: reduceMotion ? false : { opacity: 0, y: 28, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: .7 } }, 'The Grei Show')),
          h('p', { className: 'hero-lead' }, 'Music you can feel. Stories you can enter. Original worlds you can watch, read, play, and help bring to life.'),
          h('div', { className: 'hero-actions' }, h('a', { className: 'home-button primary', href: 'https://snd.click/qnbs', target: '_blank', rel: 'noreferrer', onClick: () => track('listen', { placement: 'hero' }) }, 'Hear No Drama'), h('a', { className: 'home-button', href: siteUrl('/connect.html?interest=live-performance') }, 'Request a booking'), h('a', { className: 'home-button internal', href: '#explore' }, 'Explore the universe')),
          h('ul', { className: 'hero-proof', 'aria-label': 'Creative disciplines' }, h('li', null, 'Recording artist'), h('li', null, 'Producer'), h('li', null, 'Author'), h('li', null, 'Creative director')),
          h('p', { className: 'infrastructure-meta' }, 'Preview 2 · parity-checked content · accessible modal · deployment-safe routes')
        ),
        h('div', { className: 'hero-art', 'aria-label': 'Featured releases' }, h('span', { className: 'play-stamp' }, 'Now playing', h('br'), 'No Drama'), h(motion.figure, { className: 'art-card album', initial: reveal, animate: { opacity: 1, y: 0, rotate: 2.5 }, transition: { duration: .7, delay: .15 } }, h('img', { src: siteUrl('/assets/img/no-drama.webp'), alt: 'No Drama single cover by The Grei Show' }), h('figcaption', null, 'Featured release · No Drama')), h(motion.figure, { className: 'art-card book', initial: reveal, animate: { opacity: 1, y: 0, rotate: 8 }, transition: { duration: .7, delay: .3 } }, h('img', { src: siteUrl('/assets/images/books/astral-thread-cover.jpg'), alt: 'The Astral Thread book cover' }), h('figcaption', null, 'Book 01')))
      ),
      h('div', { className: 'signal-strip', 'aria-label': 'The Grei Show universe' }, h('span', null, 'Sound'), h('span', null, 'Story'), h('span', null, 'Visuals'), h('span', null, 'Interactive')),
      h('section', { id: 'explore', className: 'home-section', 'aria-labelledby': 'explore-title' }, h(Heading, { kicker: 'Choose your portal', title: 'One universe. Many ways in.', body: 'Start with the signal that pulls you closest. Every release connects to a wider world of sound, story, and experimentation.', id: 'explore-title' }), h('div', { className: 'portal-grid' }, ...portals.map((portal, index) => h(motion.a, { className: 'portal-card', href: portal.href, key: portal.title, initial: reveal, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .18 }, transition: { duration: .45, delay: index * .06 }, onClick: () => track(portal.event, { title: portal.title }) }, h('img', { src: portal.image, alt: `${portal.title} entry`, loading: 'lazy' }), h('span', { className: 'portal-card__body' }, h('span', { className: 'card-kicker' }, portal.kicker), h('h3', null, portal.title), h('span', { className: 'portal-link' }, portal.action)))))) ,
      h('section', { id: 'support', className: 'home-section offers-section', 'aria-labelledby': 'support-title' }, h(Heading, { kicker: 'Keep the signal moving', title: 'Support independent creation.', body: 'Every book, stream, direct purchase, and creative project helps fund the next record, story, visual, and playable experiment.', id: 'support-title' }), h('div', { className: 'offer-grid' }, ...offers.map((offer, index) => h(motion.article, { className: 'offer-card', key: offer.number, initial: reveal, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .2 }, transition: { duration: .42, delay: index * .06 } }, h('span', { className: 'offer-number' }, offer.number), h('div', null, h('p', { className: 'card-kicker' }, offer.kicker), h('h3', null, offer.title), h('p', null, offer.body), index === 1 ? h('div', { className: 'songstats-row', 'aria-label': 'Current Songstats snapshot' }, h('span', null, h('strong', null, '13.9M'), h('small', null, 'Streams')), h('span', null, h('strong', null, '7.5K'), h('small', null, 'Followers')), h('span', null, h('strong', null, '1.53M'), h('small', null, 'Playlist reach'))) : null, offer.actionType === 'platform-modal' ? h('button', { className: 'home-button primary', type: 'button', onClick: () => { track('choose_platform'); setPlatformsOpen(true); } }, offer.action) : h('a', { className: `home-button${offer.primary ? ' primary' : ''}`, href: offer.href, target: offer.href.startsWith('http') ? '_blank' : undefined, rel: offer.href.startsWith('http') ? 'noreferrer' : undefined }, offer.action)))))) ,
      h('section', { className: 'home-section', 'aria-labelledby': 'work-title' }, h('div', { className: 'service-panel' }, h('div', { className: 'service-copy' }, h('p', { className: 'section-kicker' }, 'Wheel It! Records'), h('h2', { id: 'work-title' }, 'From first spark to finished world.'), h('p', null, 'Bring an idea, a song, or an unfinished vision. The Grei Show can help shape the sound, story, direction, and release experience around it.'), h('div', { className: 'service-actions' }, h('a', { className: 'home-button primary', href: siteUrl('/connect.html?interest=production') }, 'Start a project'), h('a', { className: 'home-button', href: siteUrl('/wheel-it-records.html') }, 'See Wheel It! Records'))), h('ol', { className: 'service-list' }, ...services.map(([number, title, body]) => h('li', { key: number }, h('span', null, number), h('div', null, h('strong', null, title), h('small', null, body))))))),
      h('section', { className: 'home-section list-section', 'aria-labelledby': 'list-title' }, h('div', { className: 'list-panel' }, h('div', { className: 'list-copy' }, h('p', { className: 'section-kicker' }, 'Stay close to the signal'), h('h2', { id: 'list-title' }, 'Get the next transmission.'), h('p', null, 'Join for early access to new chapters, exclusive tracks, visual drops and arcade unlocks. We respect your inbox.'), h('form', { className: 'preview-newsletter', onSubmit: submitNewsletter, noValidate: true }, h('div', { className: 'preview-form-row' }, h('div', { className: 'preview-field' }, h('label', { htmlFor: 'infra-first-name' }, 'First name'), h('input', { id: 'infra-first-name', name: 'first_name', placeholder: 'Your first name', autoComplete: 'given-name' })), h('div', { className: 'preview-field' }, h('label', { htmlFor: 'infra-email' }, 'Email *'), h('input', { id: 'infra-email', name: 'email', type: 'email', required: true, placeholder: 'you@domain.com', autoComplete: 'email', 'aria-invalid': formState.invalid ? 'true' : 'false' }))), h('div', { className: 'preview-form-actions' }, h('button', { className: 'home-button primary', type: 'submit', disabled: formState.submitting }, formState.submitting ? 'Validating…' : 'Join the list'), h('div', { className: 'preview-status', 'aria-live': 'polite', 'data-tone': formState.tone }, formState.status))))))
    ),
    h('footer', { className: 'preview-footer' }, h('span', null, '© 2026 The Grei Show'), h('span', null, 'Infrastructure Preview 2 · live architecture preserved')),
    h('div', { className: 'infrastructure-badge', 'aria-label': 'Infrastructure Preview 2' }, 'Infrastructure Preview 2'),
    h(PlatformModal, { open: platformsOpen, onClose: () => setPlatformsOpen(false) })
  );
}

const root = document.getElementById('react-infrastructure-root');
if (!root) throw new Error('Infrastructure preview root was not found.');
createRoot(root).render(h(App));
