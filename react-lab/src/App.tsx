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

type Game = {
  id: string;
  title: string;
  description: string;
  version: string;
  thumbnail: string;
  tags: string[];
};

const productionOrigin = 'https://thegreishow.com';

const portals: Portal[] = [
  {
    kicker: 'Listen',
    title: 'Audio Universe',
    description: 'Releases, collaborations, production credits and the signal behind the sound.',
    href: `${productionOrigin}/music.html`,
    image: `${productionOrigin}/assets/img/no-drama.webp`,
    action: 'Enter the music'
  },
  {
    kicker: 'Read',
    title: 'The Astral Thread',
    description: 'Stories, books and connected worlds from The Infinite Story-verse.',
    href: `${productionOrigin}/books.html`,
    image: `${productionOrigin}/assets/images/books/astral-thread-cover.jpg`,
    action: 'Open the story'
  },
  {
    kicker: 'Play',
    title: 'Grei Arcade',
    description: 'Original interactive experiments, Jamaican worlds and games built from the ground up.',
    href: `${productionOrigin}/arcade.html`,
    image: `${productionOrigin}/assets/img/home-bg.webp`,
    action: 'Start a game'
  }
];

const games: Game[] = [
  {
    id: 'dreamweaver-oracle',
    title: 'Dreamweaver',
    description: 'Collect story fragments, survive corrupted memories, and shape a different dream every run.',
    version: '1.0',
    thumbnail: `${productionOrigin}/arcade/assets/thumbnails/dreamweaver-oracle.svg`,
    tags: ['story', 'action', 'astral']
  },
  {
    id: 'signal-runner',
    title: 'Signal Runner',
    description: 'Catch clean signals, dodge static, and keep the transmission alive.',
    version: '0.1',
    thumbnail: `${productionOrigin}/arcade/assets/thumbnails/signal-runner.svg`,
    tags: ['reflex', 'music', 'prototype']
  },
  {
    id: 'jamaica-run',
    title: 'Rasta Runner',
    description: 'Race across eight Jamaican stages, collect Grei coins, build combos, and survive the island road.',
    version: '1.2',
    thumbnail: `${productionOrigin}/arcade/assets/thumbnails/rasta-runner.svg`,
    tags: ['runner', 'Jamaica', 'featured']
  }
];

function App() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <a className="wordmark" href={productionOrigin} aria-label="The Grei Show home">
          THE GREI SHOW
        </a>
        <nav aria-label="Primary navigation">
          <a href={`${productionOrigin}/music.html`}>Music</a>
          <a href={`${productionOrigin}/visuals.html`}>Visuals</a>
          <a href="#arcade">Arcade</a>
          <a href={`${productionOrigin}/connect.html`}>Connect</a>
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
              <a
                className="button button-primary"
                href="https://snd.click/qnbs"
                target="_blank"
                rel="noreferrer"
              >
                Choose a Platform
              </a>
              <a className="button button-quiet" href="#arcade">
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
            href={`${productionOrigin}/music.html`}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            whileHover={reduceMotion ? undefined : { y: -6 }}
          >
            <img
              src={`${productionOrigin}/assets/img/no-drama.webp`}
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
                <img src={portal.image} alt="" loading="lazy" />
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

        <section id="arcade" className="arcade-showcase" aria-labelledby="arcade-title">
          <div className="section-heading">
            <p className="eyebrow">Playable worlds</p>
            <h2 id="arcade-title">The arcade is becoming a universe of its own.</h2>
          </div>

          <div className="arcade-grid">
            {games.map((game, index) => (
              <motion.a
                className="game-card"
                href={`${productionOrigin}/arcade/game.html?id=${encodeURIComponent(game.id)}`}
                key={game.id}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.16 }}
                transition={{ duration: 0.5, delay: index * 0.07 }}
                whileHover={reduceMotion ? undefined : { y: -6 }}
              >
                <span className="game-image">
                  <img src={game.thumbnail} alt={`${game.title} game thumbnail`} loading="lazy" />
                  <span className="game-badge">Native · v{game.version}</span>
                </span>
                <span className="game-copy">
                  <small>The Grei Show Arcade</small>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  <span className="game-tags" aria-label={`${game.title} tags`}>
                    {game.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </span>
                  <span className="game-link">Play now →</span>
                </span>
              </motion.a>
            ))}
          </div>
        </section>

        <section className="lab-note" aria-labelledby="lab-title">
          <p className="eyebrow">Prototype 02</p>
          <h2 id="lab-title">React underneath. The Grei Show on top.</h2>
          <p>
            This lab preserves the current website while we test motion, portal cards,
            responsive behavior and future Unity WebGL presentation.
          </p>
        </section>
      </main>

      <footer>
        <span>© 2026 The Grei Show</span>
        <a href={productionOrigin}>Return to the live site</a>
      </footer>
    </div>
  );
}

export default App;
