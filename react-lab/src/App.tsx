import { useCallback, useState } from 'react';
import {
  ExploreSection,
  HeroSection,
  NewsletterSection,
  PlatformModal,
  ServicesSection,
  SignalStrip,
  SupportSection
} from '@/HomeSections';
import { navigation, productionOrigin } from '@/site-content';
import { track } from '@/services/analytics';

function App() {
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const closePlatforms = useCallback(() => setPlatformsOpen(false), []);

  return (
    <div className="home-page react-home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="react-topbar">
        <a className="react-wordmark" href={productionOrigin} onClick={() => track('navigation', { destination: 'home' })}>THE GREI SHOW</a>
        <nav aria-label="Primary navigation">
          {navigation.map(([label, href]) => <a key={label} href={href} onClick={() => track('navigation', { destination: label.toLowerCase() })}>{label}</a>)}
        </nav>
      </header>

      <main id="main-content" className="home">
        <HeroSection />
        <SignalStrip />
        <ExploreSection />
        <SupportSection onChoosePlatform={() => setPlatformsOpen(true)} />
        <ServicesSection />
        <NewsletterSection />
      </main>

      <footer className="react-footer">
        <span>© 2026 The Grei Show</span>
        <span>React enhancement preview · live architecture preserved</span>
      </footer>

      <PlatformModal open={platformsOpen} onClose={closePlatforms} />
    </div>
  );
}

export default App;
