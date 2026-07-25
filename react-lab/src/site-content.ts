export const productionOrigin = 'https://thegreishow.com';

export const portals = [
  {
    kicker: 'Listen',
    title: 'Audio Universe',
    href: `${productionOrigin}/music.html`,
    image: `${productionOrigin}/assets/img/no-drama.webp`,
    action: 'Enter the music'
  },
  {
    kicker: 'Read & listen',
    title: 'The Astral Thread',
    href: `${productionOrigin}/books.html`,
    image: `${productionOrigin}/assets/images/books/astral-thread-cover.jpg`,
    action: 'Open the book'
  },
  {
    kicker: 'Play',
    title: 'Grei Arcade',
    href: `${productionOrigin}/arcade.html`,
    image: `${productionOrigin}/arcade/assets/thumbnails/signal-runner.svg`,
    action: 'Start a game'
  }
] as const;

export const offers = [
  {
    number: '01 · Read',
    kicker: 'Official ebook',
    title: 'Own The Astral Thread',
    body: 'A reflective collection built for late-night reading, listening, and visual exploration.',
    action: 'Buy the ebook',
    href: 'https://www.amazon.com/dp/B0F7RQ3463',
    primary: true
  },
  {
    number: '02 · Listen',
    kicker: 'Direct support + stats',
    title: 'Back the music',
    body: 'Stream across every major platform or support the catalogue directly through Bandcamp.',
    action: 'Choose your platform',
    href: 'https://snd.click/qnbs',
    primary: true
  },
  {
    number: '03 · Book',
    kicker: 'Performances & services',
    title: 'Bring the experience to you',
    body: 'Request a performance, DJ set, studio session, photo or video service, creative talent, or a private Kingston experience.',
    action: 'Check availability & book',
    href: `${productionOrigin}/connect.html?interest=live-performance`,
    primary: false
  }
] as const;

export const services = [
  ['01', 'Music production', 'Original production, collaboration, development, and release support.'],
  ['02', 'Creative direction', 'A clear visual and narrative system around the work.'],
  ['03', 'Sync & partnerships', 'Music, media, performance, press, and aligned brand conversations.']
] as const;
