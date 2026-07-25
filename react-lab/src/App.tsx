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
      <div className="grain" aria-hidden="true" />

      <header className="topbar">
        <a className="wordmark" href={productionOrigin} aria-label="The Grei Show home">
          <span className="wordmark-mark">G</span>
          <span>THE GREI SHOW</span>
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
            <div className="hero-meta" aria-label="Transmission details">
              <span>Kingston, Jamaica</span>
              <span>Transmission 001</span>
              <span>Signal active</span>
            </div>

            <p className="eyebrow">Artist · producer · author · world-builder</p>
            <h1 id="hero-title" className="sr-only">
              Enter The Grei Show
            </h1>
            <BlurText
              text="ENTER"
              delay={reduceMotion ? 0 : 95}
              animateBy="letters"
              direction="bottom"
              className="display-title display-title-enter"
              stepDuration={reduceMotion ? 0 : 0.42}
            />
            <motion.p
              className="display-title display-title-name"
              initial={reduceMotion ? false : { opacity: 0, x: -26 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, delay: 0.52 }}
            >
              THE GREI SHOW
            </motion.p>

            <div className="hero-manifesto">
              <span className="hero-index">01</span>
              <p className="hero-lead">
                Music you can feel. Stories you can enter. Original worlds you can watch,
                read and play.
              </p>
            </div>

            <div className="hero-actions">
              <a
                className="button button-primary"
                href="https://snd.click/qnbs"
                target="_blank"
                rel="noreferrer"
              >
                Hear No Drama
              </a>
              <a className="button button-quiet" href="#portals">
                Enter the universe
              </a>
            </div>
          </div>

          <div className="art-stage" aria-label="Featured Grei Show releases">
            <div className="vinyl-disc" aria-hidden="true">
              <span />
            </div>

            <motion.a
              className="art-card art-card-back"
              href={`${productionOrigin}/books.html`}
              initial={reduceMotion ? false : { opacity: 0, rotate: -3, x: 36 }}
              animate={{ opacity: 1, rotate: 6, x: 0 }}
              transition={{ duration: 0.8, delay: 0.42 }}
              whileHover={reduceMotion ? undefined : { rotate: 2, y: -8 }}
            >
              <img
                src={`${productionOrigin}/assets/images/books/astral-thread-cover.jpg`}
                alt="The Astral Thread book cover"
              />
              <span>Story 01</span>
            </motion.a>

            <motion.a
              className="feature-art"
              href={`${productionOrigin}/music.html`}
              initial={reduceMotion ? false : { opacity: 0, y: 28, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ duration: 0.85, delay: 0.24 }}
              whileHover={reduceMotion ? undefined : { y: -9, rotate: 0 }}
            >
              <img
                src={`${productionOrigin}/assets/img/no-drama.webp`}
                alt="No Drama single cover by The Grei Show"
              />
              <span className="feature-label">
                <small>New transmission</small>
                <strong>No Drama</strong>
                <em>Listen everywhere ↗</em>
              </span>
            </motion.a>

            <div className="release-stamp" aria-hidden="true">
              <strong>NO DRAMA</strong>
              <span>NEW SIGNAL · 2026</span>
            </div>
            <span className="art-counter">01 / 02</span>
          </div>
        </section>

        <div className="signal-marquee" aria-label="The Grei Show creative disciplines">
          <div>
            <span>Music</span><i>✦</i><span>Books</span><i>✦</i><span>Games</span><i>✦</i>
            <span>Film</span><i>✦</i><span>Photography</span><i>✦</i><span>Live</span><i>✦</i>
            <span>Music</span><i>✦</i><span>Books</span><i>✦</i><span>Games</span><i>✦</i>
          </div>
        </div>

        <section id="portals" className="portal-section" aria-labelledby="portal-title">
          <div className="section-heading section-heading-numbered">
            <span className="section-number">02</span>
            <p className="eyebrow">Choose your portal</p>
            <h2 id="portal-title">One universe.<br />Many ways in.</h2>
          </div>

          <div className="portal-grid portal-grid-editorial">
            {portals.map((portal, index) => (
              <motion.a
                className={`portal-card portal-card-${index + 1}`}
                href={portal.href}
                key={portal.title}
                initial={reduceMotion ? false : { opacity: 0, y: 34 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{ duration: 0.62, delay: index * 0.1 }}
                whileHover={reduceMotion ? undefined : { y: -8 }}
              >
                <img src={portal.image} alt="" loading="lazy" />
                <span className="portal-shade" aria-hidden="true" />
                <span className="portal-order">0{index + 1}</span>
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
          <div className="section-heading section-heading-numbered">
            <span className="section-number">03</span>
            <p className="eyebrow">Playable worlds</p>
            <h2 id="arcade-title">Three games.<br />One growing mythology.</h2>
          </div>

          <div className="arcade-grid arcade-grid-editorial">
            {games.map((game, index) => (
              <motion.a
                className={`game-card game-card-${index + 1}`}
                href={`${productionOrigin}/arcade/game.html?id=${encodeURIComponent(game.id)}`}
                key={game.id}
                initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.16 }}
                transition={{ duration: 0.56, delay: index * 0.09 }}
                whileHover={reduceMotion ? undefined : { y: -7 }}
              >
                <span className="game-image">
                  <img src={game.thumbnail} alt={`${game.title} game thumbnail`} loading="lazy" />
                  <span className="game-badge">Native · v{game.version}</span>
                  <span className="game-number">0{index + 1}</span>
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
                  <span className="game-link">Insert coin →</span>
                </span>
              </motion.a>
            ))}
          </div>
        </section>

        <section className="lab-note statement-v3" aria-labelledby="lab-title">
          <span className="section-number">04</span>
          <p className="eyebrow">The signal continues</p>
          <h2 id="lab-title">Not a portfolio.<br />A world in progress.</h2>
          <p>
            Records become stories. Stories become games. Every door leads deeper into the same universe.
          </p>
          <a className="statement-link" href={`${productionOrigin}/connect.html`}>Build something together ↗</a>
        </section>
      </main>

      <footer>
        <span>© 2026 The Grei Show · Kingston, Jamaica</span>
        <a href={productionOrigin}>Return to the live site</a>
      </footer>
    </div>
  );
}

export default App;
