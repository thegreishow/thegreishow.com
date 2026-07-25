import { siteUrl } from '@/config';

export const productionOrigin = siteUrl('/');

export const navigation = [
  ['Music', siteUrl('/music.html')],
  ['Books', siteUrl('/books.html')],
  ['Arcade', siteUrl('/arcade.html')],
  ['Connect', siteUrl('/connect.html')]
] as const;

export const platforms = [
  ['Spotify', 'https://open.spotify.com/artist/78LUuzis8k8cGRCalx751k'],
  ['Apple Music', 'https://music.apple.com/jm/artist/the-grei-show/885841733'],
  ['YouTube', 'https://youtube.com/@thegreishxw'],
  ['Bandcamp', 'https://thegreishow.bandcamp.com']
] as const;

export const songstats = [
  ['13.9M', 'Streams'],
  ['7.5K', 'Followers'],
  ['1.53M', 'Playlist reach']
] as const;

export const portals = [
  {
    kicker: 'Listen',
    title: 'Audio Universe',
    href: siteUrl('/music.html'),
    image: siteUrl('/assets/img/no-drama.webp'),
    action: 'Enter the music',
    tracking: 'explore_music'
  },
  {
    kicker: 'Read & listen',
    title: 'The Astral Thread',
    href: siteUrl('/books.html'),
    image: siteUrl('/assets/images/books/astral-thread-cover.jpg'),
    action: 'Open the book',
    tracking: 'explore_books'
  },
  {
    kicker: 'Play',
    title: 'Grei Arcade',
    href: siteUrl('/arcade.html'),
    image: siteUrl('/arcade/assets/thumbnails/signal-runner.svg'),
    action: 'Start a game',
    tracking: 'explore_arcade'
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
    primary: true,
    tracking: 'buy_book'
  },
  {
    number: '02 · Listen',
    kicker: 'Direct support + stats',
    title: 'Back the music',
    body: 'Stream across every major platform or support the catalogue directly through Bandcamp.',
    action: 'Choose your platform',
    href: '#platforms',
    primary: true,
    tracking: 'choose_platform'
  },
  {
    number: '03 · Book',
    kicker: 'Performances & services',
    title: 'Bring the experience to you',
    body: 'Request a performance, DJ set, studio session, photo or video service, creative talent, or a private Kingston experience.',
    action: 'Check availability & book',
    href: siteUrl('/connect.html?interest=live-performance'),
    primary: false,
    tracking: 'support_booking'
  }
] as const;

export const services = [
  ['01', 'Music production', 'Original production, collaboration, development, and release support.'],
  ['02', 'Creative direction', 'A clear visual and narrative system around the work.'],
  ['03', 'Sync & partnerships', 'Music, media, performance, press, and aligned brand conversations.']
] as const;
