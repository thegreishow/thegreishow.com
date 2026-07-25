import React, { useState } from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import { motion, useReducedMotion } from 'https://esm.sh/motion@12.23.12/react?deps=react@19.2.0,react-dom@19.2.0';

const h = React.createElement;
const portals = [
  ['Listen', 'Audio Universe', 'music.html', 'assets/img/no-drama.webp', 'Enter the music'],
  ['Read & listen', 'The Astral Thread', 'books.html', 'assets/images/books/astral-thread-cover.jpg', 'Open the book'],
  ['Play', 'Grei Arcade', 'arcade.html', 'arcade/assets/thumbnails/signal-runner.svg', 'Start a game']
];
const offers = [
  ['01 · Read', 'Official ebook', 'Own The Astral Thread', 'A reflective collection built for late-night reading, listening, and visual exploration.', 'Buy the ebook', 'https://www.amazon.com/dp/B0F7RQ3463'],
  ['02 · Listen', 'Direct support + stats', 'Back the music', 'Stream across every major platform or support the catalogue directly through Bandcamp.', 'Choose your platform', 'https://snd.click/qnbs'],
  ['03 · Book', 'Performances & services', 'Bring the experience to you', 'Request a performance, DJ set, studio session, photo or video service, creative talent, or a private Kingston experience.', 'Check availability & book', 'connect.html?interest=live-performance']
];
const services = [
  ['01', 'Music production', 'Original production, collaboration, development, and release support.'],
  ['02', 'Creative direction', 'A clear visual and narrative system around the work.'],
  ['03', 'Sync & partnerships', 'Music, media, performance, press, and aligned brand conversations.']
];

function Heading({ kicker, title, body, id }) {
  return h('div', { className: 'section-heading' },
    h('p', { className: 'section-kicker' }, kicker),
    h('h2', { id }, title),
    h('p', null, body)
  );
}

function App() {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState('');
  const reveal = reduceMotion ? false : { opacity: 0, y: 22 };

  return h(React.Fragment, null,
    h('header', { className: 'preview-header' },
      h('a', { className: 'wordmark', href: '/' }, 'THE GREI SHOW'),
      h('nav', { 'aria-label': 'Primary navigation' },
        h('a', { href: 'music.html' }, 'Music'),
        h('a', { href: 'books.html' }, 'Books'),
        h('a', { href: 'arcade.html' }, 'Arcade'),
        h('a', { href: 'connect.html' }, 'Connect')
      )
    ),
    h('main', { className: 'home' },
      h('section', { className: 'hero', 'aria-labelledby': 'home-title' },
        h('div', { className: 'hero-copy' },
          h('p', { className: 'hero-kicker' }, 'Jamaican artist · Producer · World-builder'),
          h('h1', { id: 'home-title', className: 'hero-title' },
            h('span', null, 'Enter'),
            h(motion.span, {
              className: 'react-title-word',
              initial: reduceMotion ? false : { opacity: 0, y: 28, filter: 'blur(8px)' },
              animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
              transition: { duration: .7 }
            }, 'The Grei Show')
          ),
          h('p', { className: 'hero-lead' }, 'Music you can feel. Stories you can enter. Original worlds you can watch, read, play, and help bring to life.'),
          h('div', { className: 'hero-actions' },
            h('a', { className: 'home-button primary', href: 'https://snd.click/qnbs', target: '_blank', rel: 'noopener' }, 'Hear No Drama'),
            h('a', { className: 'home-button', href: 'connect.html?interest=live-performance' }, 'Request a booking'),
            h('a', { className: 'home-button internal', href: '#explore' }, 'Explore the universe')
          ),
          h('ul', { className: 'hero-proof' },
            h('li', null, 'Recording artist'), h('li', null, 'Producer'), h('li', null, 'Author'), h('li', null, 'Creative director')
          )
        ),
        h('div', { className: 'hero-art', 'aria-label': 'Featured releases' },
          h('span', { className: 'play-stamp' }, 'Now playing', h('br'), 'No Drama'),
          h(motion.figure, {
            className: 'art-card album', initial: reveal, animate: { opacity: 1, y: 0, rotate: 2.5 }, transition: { duration: .7, delay: .15 }
          }, h('img', { src: 'assets/img/no-drama.webp', alt: 'No Drama single cover' }), h('figcaption', null, 'Featured release · No Drama')),
          h(motion.figure, {
            className: 'art-card book', initial: reveal, animate: { opacity: 1, y: 0, rotate: 8 }, transition: { duration: .7, delay: .3 }
          }, h('img', { src: 'assets/images/books/astral-thread-cover.jpg', alt: 'The Astral Thread book cover' }), h('figcaption', null, 'Book 01'))
        )
      ),
      h('div', { className: 'signal-strip' }, h('span', null, 'Sound'), h('span', null, 'Story'), h('span', null, 'Visuals'), h('span', null, 'Interactive')),
      h('section', { id: 'explore', className: 'home-section', 'aria-labelledby': 'explore-title' },
        h(Heading, { kicker: 'Choose your portal', title: 'One universe. Many ways in.', body: 'Start with the signal that pulls you closest. Every release connects to a wider world of sound, story, and experimentation.', id: 'explore-title' }),
        h('div', { className: 'portal-grid' }, ...portals.map((portal, index) => h(motion.a, {
          className: 'portal-card', href: portal[2], key: portal[1], initial: reveal, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: .45, delay: index * .06 }
        }, h('img', { src: portal[3], alt: `${portal[1]} entry`, loading: 'lazy' }), h('span', { className: 'portal-card__body' }, h('span', { className: 'card-kicker' }, portal[0]), h('h3', null, portal[1]), h('span', { className: 'portal-link' }, portal[4])))))
      ),
      h('section', { className: 'home-section offers-section', 'aria-labelledby': 'support-title' },
        h(Heading, { kicker: 'Keep the signal moving', title: 'Support independent creation.', body: 'Every book, stream, direct purchase, and creative project helps fund the next record, story, visual, and playable experiment.', id: 'support-title' }),
        h('div', { className: 'offer-grid' }, ...offers.map((offer, index) => h(motion.article, {
          className: 'offer-card', key: offer[0], initial: reveal, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: .42, delay: index * .06 }
        }, h('span', { className: 'offer-number' }, offer[0]), h('div', null,
          h('p', { className: 'card-kicker' }, offer[1]), h('h3', null, offer[2]), h('p', null, offer[3]),
          index === 1 ? h('div', { className: 'songstats-row' },
            h('span', null, h('strong', null, '13.9M'), h('small', null, 'Streams')),
            h('span', null, h('strong', null, '7.5K'), h('small', null, 'Followers')),
            h('span', null, h('strong', null, '1.53M'), h('small', null, 'Playlist reach'))
          ) : null,
          h('a', { className: `home-button${index < 2 ? ' primary' : ''}`, href: offer[5], target: offer[5].startsWith('http') ? '_blank' : undefined, rel: offer[5].startsWith('http') ? 'noopener' : undefined }, offer[4])
        ))))
      ),
      h('section', { className: 'home-section', 'aria-labelledby': 'work-title' },
        h('div', { className: 'service-panel' },
          h('div', { className: 'service-copy' }, h('p', { className: 'section-kicker' }, 'Wheel It! Records'), h('h2', { id: 'work-title' }, 'From first spark to finished world.'), h('p', null, 'Bring an idea, a song, or an unfinished vision. The Grei Show can help shape the sound, story, direction, and release experience around it.'), h('div', { className: 'service-actions' }, h('a', { className: 'home-button primary', href: 'connect.html?interest=production' }, 'Start a project'), h('a', { className: 'home-button', href: 'wheel-it-records.html' }, 'See Wheel It! Records'))),
          h('ol', { className: 'service-list' }, ...services.map(service => h('li', { key: service[0] }, h('span', null, service[0]), h('div', null, h('strong', null, service[1]), h('small', null, service[2])))))
        )
      ),
      h('section', { className: 'home-section list-section', 'aria-labelledby': 'list-title' },
        h('div', { className: 'list-panel' }, h('div', { className: 'list-copy' },
          h('p', { className: 'section-kicker' }, 'Stay close to the signal'), h('h2', { id: 'list-title' }, 'Get the next transmission.'), h('p', null, 'Join for early access to new chapters, exclusive tracks, visual drops and arcade unlocks. We respect your inbox.'),
          h('form', { className: 'preview-newsletter', onSubmit: event => { event.preventDefault(); setStatus('Preview mode: the live mailing-list connection remains unchanged.'); } },
            h('div', { className: 'preview-form-row' }, h('div', { className: 'preview-field' }, h('label', { htmlFor: 'first-name' }, 'First name'), h('input', { id: 'first-name', placeholder: 'Your first name' })), h('div', { className: 'preview-field' }, h('label', { htmlFor: 'email' }, 'Email *'), h('input', { id: 'email', type: 'email', required: true, placeholder: 'you@domain.com' }))),
            h('div', { className: 'preview-form-actions' }, h('button', { className: 'home-button primary', type: 'submit' }, 'Join the list'), h('div', { className: 'preview-status', 'aria-live': 'polite' }, status))
          )
        ))
      )
    ),
    h('footer', { className: 'preview-footer' }, h('span', null, '© 2026 The Grei Show'), h('span', null, 'React enhancement preview · live architecture preserved'))
  );
}

const root = document.getElementById('react-preview-root');
if (!root) throw new Error('React preview root was not found.');
createRoot(root).render(h(App));
