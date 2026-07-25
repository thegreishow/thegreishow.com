import type { HomeSectionId } from '@/types/site';

export const homeSectionOrder = [
  'hero',
  'signal',
  'explore',
  'support',
  'services',
  'newsletter'
] as const satisfies readonly HomeSectionId[];

export const liveParityContract = {
  phrases: [
    'Music you can feel. Stories you can enter.',
    'One universe. Many ways in.',
    'Support independent creation.',
    'From first spark to finished world.',
    'Get the next transmission.'
  ],
  routes: [
    'music.html',
    'books.html',
    'arcade.html',
    'connect.html?interest=live-performance',
    'connect.html?interest=production',
    'wheel-it-records.html'
  ],
  assets: [
    'assets/img/no-drama.webp',
    'assets/images/books/astral-thread-cover.jpg',
    'arcade/assets/thumbnails/signal-runner.svg'
  ],
  statistics: ['13.9M', '7.5K', '1.53M']
} as const;
