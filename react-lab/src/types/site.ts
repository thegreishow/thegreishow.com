export type NavigationItem = readonly [label: string, href: string];
export type StreamingPlatform = readonly [name: string, href: string];
export type Statistic = readonly [value: string, label: string];

export type Portal = {
  kicker: string;
  title: string;
  href: string;
  image: string;
  action: string;
  tracking: string;
};

export type Offer = {
  number: string;
  kicker: string;
  title: string;
  body: string;
  action: string;
  href: string;
  primary: boolean;
  tracking: string;
  actionType: 'link' | 'platform-modal';
};

export type Service = readonly [number: string, title: string, body: string];

export type HomeSectionId =
  | 'hero'
  | 'signal'
  | 'explore'
  | 'support'
  | 'services'
  | 'newsletter';
