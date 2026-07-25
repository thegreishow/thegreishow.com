import {
  ExploreSection,
  HeroSection,
  NewsletterSection,
  ServicesSection,
  SignalStrip,
  SupportSection
} from '@/HomeSections';
import { productionOrigin } from '@/site-content';

function App() {
  return (
    <div className="home-page react-home">
      <header className="react-topbar">
        <a className="react-wordmark" href={productionOrigin}>THE GREI SHOW</a>
        <nav aria-label="Primary navigation">
          <a href={`${productionOrigin}/music.html`}>Music</a>
          <a href={`${productionOrigin}/books.html`}>Books</a>
          <a href={`${productionOrigin}/arcade.html`}>Arcade</a>
          <a href={`${productionOrigin}/connect.html`}>Connect</a>
        </nav>
      </header>

      <main className="home">
        <HeroSection />
        <SignalStrip />
        <ExploreSection />
        <SupportSection />
        <ServicesSection />
        <NewsletterSection />
      </main>

      <footer className="react-footer">
        <span>© 2026 The Grei Show</span>
        <span>React enhancement preview · live architecture preserved</span>
      </footer>
    </div>
  );
}

export default App;
