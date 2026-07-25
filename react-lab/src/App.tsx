import { motion, useReducedMotion } from 'motion/react';
import BlurText from '@/components/BlurText';

type Portal = {
  kicker: string;
  title: string;
  description: string;
  href: string;
  image: string;
  action: string;
};

const portals: Portal[] = [
  {
    kicker: 'Listen',
    title: 'Audio Universe',
    description: 'Releases, collaborations, production credits and the signal behind the sound.',
    href: '/music.html',
    image: 'https://thegreishow.com/assets/img/no-drama.webp',
    action: 'Enter the music'
  },
  {
    kicker: 'Read',
    title: 'The Astral Thread',
    description: 'Stories, books and connected worlds from The Infinite Story-verse.',
    href: '/books.html',
    image: 'https://thegreishow.com/assets/images/books/astral-thread-cover.jpg',
    action: 'Open the story'
  },
  {
    kicker: 'Play',
    title: 'Grei Arcade',
    description: 'Original interactive experiments, Jamaican worlds and games built from the ground up.',
    href: '/arcade.html',
    image: 'https://thegreishow.com/assets/img/home-bg.webp',
    action: 'Start a game'
  }
];

function App() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <a className="wordmark" href="/" aria-label="The Grei Show home">
          THE GREI SHOW
        </a>
        <nav aria-label="Primary navigation">
          <a href="/music.html">Music</a>
          <a href="/visuals.html">Visuals</a>
          <a href="/arcade.html">Arcade</a>
          <a href="/connect.html">Connect</a>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Jamaican artist · producer · world-builder</p>
            <h1 id="hero-title" className="sr-only">
              Enter The Grei Show
            </h1>
            <BlurText
              text="ENTER THE GREI SHOW"
              delay={reduceMotion ? 0 : 90}
              animateBy="words"
              direction="bottom"
              className="display-title"
              stepDuration={reduceMotion ? 0 : 0.42}
            />
            <p className="hero-lead">
              Music you can feel. Stories you can enter. Original worlds you can watch,
              read and play.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="https://snd.click/qnbs">
                Choose a Platform
              </a>
              <a className="button button-quiet" href="/arcade.html">
                Enter the Arcade
              </a>
            </div>

            <div className="signal-line" aria-label="Creative disciplines">
              <span>Sound</span>
              <span>Story</span>
              <span>Visuals</span>
              <span>Interactive</span>
            </div>
          </div>

          <motion.a
            className="feature-art"
            href="/music.html"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            whileHover={reduceMotion ? undefined : { y: -6 }}
          >
            <img
              src="https://thegreishow.com/assets/img/no-drama.webp"
              alt="No Drama single cover by The Grei Show"
            />
            <span className="feature-label">
              <small>Now playing</small>
              <strong>No Drama</strong>
            </span>
          </motion.a>
        </section>

        <section className="portal-section" aria-labelledby="portal-title">
          <div className="section-heading">
            <p className="eyebrow">Choose your portal</p>
            <h2 id="portal-title">One universe. Many ways in.</h2>
          </div>

          <div className="portal-grid">
            {portals.map((portal, index) => (
              <motion.a
                className="portal-card"
                href={portal.href}
                key={portal.title}
                initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                whileHover={reduceMotion ? undefined : { y: -7 }}
              >
                <img src={portal.image} alt="" />
                <span className="portal-shade" aria-hidden="true" />
                <span className="portal-content">
                  <small>{portal.kicker}</small>
                  <strong>{portal.title}</strong>
                  <span>{portal.description}</span>
                  <em>{portal.action} →</em>
                </span>
              </motion.a>
            ))}
          </div>
        </section>

        <section className="lab-note" aria-labelledby="lab-title">
          <p className="eyebrow">Prototype 01</p>
          <h2 id="lab-title">React underneath. The Grei Show on top.</h2>
          <p>
            This lab preserves the current website while we test motion, portal cards,
            responsive behavior and future Unity WebGL presentation.
          </p>
        </section>
      </main>

      <footer>
        <span>© 2026 The Grei Show</span>
        <a href="/">Return to the live site</a>
      </footer>
    </div>
  );
}

export default App;
