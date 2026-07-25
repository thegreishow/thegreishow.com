export type LinkTarget = '_blank' | '_self';

export type TrackedLink = {
  label: string;
  href: string;
  event: string;
  eventLabel: string;
  target?: LinkTarget;
};

export type Portal = {
  kicker: string;
  title: string;
  href: string;
  image: string;
  action: string;
  event: string;
};

export type Offer = {
  number: string;
  kicker: string;
  title: string;
  body: string;
  action: string;
  href?: string;
  primary: boolean;
  actionType: 'link' | 'platform-modal';
};

export type Service = readonly [number: string, title: string, body: string];

export type StreamingPlatform = {
  name: string;
  href: string;
};

export type Stat = {
  value: string;
  label: string;
  href: string;
};

export type HomeSectionId =
  | 'hero'
  | 'signal'
  | 'explore'
  | 'support'
  | 'services'
  | 'newsletter';
