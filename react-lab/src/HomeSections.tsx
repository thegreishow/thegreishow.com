import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import BlurText from '@/components/BlurText';
import { siteUrl } from '@/config';
import { useModalDialog } from '@/hooks/useModalDialog';
import { offers, platforms, portals, services, songstats } from '@/site-content';
import { track } from '@/services/analytics';
import { submitNewsletter } from '@/services/newsletter';

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
};

function SectionHeading({ kicker, title, body, id }: { kicker: string; title: string; body: string; id: string }) {
  return (
    <div className="section-heading">
      <p className="section-kicker">{kicker}</p>
      <h2 id={id}>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <p className="hero-kicker">Jamaican artist · Producer · World-builder</p>
        <h1 id="home-title" className="hero-title">
          <span>Enter</span>
          <BlurText text="The Grei Show" delay={reduceMotion ? 0 : 75} animateBy="words" direction="bottom" stepDuration={reduceMotion ? 0 : 0.38} />
        </h1>
        <p className="hero-lead">Music you can feel. Stories you can enter. Original worlds you can watch, read, play, and help bring to life.</p>
        <div className="hero-actions">
          <a className="home-button primary" href="https://snd.click/qnbs" target="_blank" rel="noreferrer" onClick={() => track('listen', { placement: 'hero', release: 'No Drama' })}>Hear No Drama</a>
          <a className="home-button" href={siteUrl('/connect.html?interest=live-performance')} onClick={() => track('hero_booking')}>Request a booking</a>
          <a className="home-button internal" href="#explore" onClick={() => track('explore', { placement: 'hero' })}>Explore the universe</a>
        </div>
        <ul className="hero-proof" aria-label="Creative disciplines"><li>Recording artist</li><li>Producer</li><li>Author</li><li>Creative director</li></ul>
      </div>
      <div className="hero-art" aria-label="Featured releases">
        <span className="play-stamp">Now playing<br />No Drama</span>
        <motion.figure className="art-card album" initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: 2.5 }} transition={{ duration: 0.7, delay: 0.18 }} whileHover={reduceMotion ? undefined : { y: -8, rotate: 1 }}>
          <img src={siteUrl('/assets/img/no-drama.webp')} alt="No Drama single cover by The Grei Show" />
          <figcaption>Featured release · No Drama</figcaption>
        </motion.figure>
        <motion.figure className="art-card book" initial={reduceMotion ? false : { opacity: 0, x: 22, rotate: 3 }} animate={{ opacity: 1, x: 0, rotate: 8 }} transition={{ duration: 0.7, delay: 0.34 }} whileHover={reduceMotion ? undefined : { y: -7, rotate: 5 }}>
          <img src={siteUrl('/assets/images/books/astral-thread-cover.jpg')} alt="The Astral Thread book cover" />
          <figcaption>Book 01</figcaption>
        </motion.figure>
      </div>
    </section>
  );
}

export function SignalStrip() {
  return <div className="signal-strip" aria-label="The Grei Show universe"><span>Sound</span><span>Story</span><span>Visuals</span><span>Interactive</span></div>;
}

export function ExploreSection() {
  const reduceMotion = useReducedMotion();
  return (
    <section id="explore" className="home-section" aria-labelledby="explore-title">
      <SectionHeading kicker="Choose your portal" title="One universe. Many ways in." body="Start with the signal that pulls you closest. Every release connects to a wider world of sound, story, and experimentation." id="explore-title" />
      <div className="portal-grid">
        {portals.map((portal, index) => (
          <motion.a className="portal-card" href={portal.href} key={portal.title} initial={reduceMotion ? false : reveal.hidden} whileInView={reveal.visible} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.48, delay: index * 0.07 }} onClick={() => track(portal.tracking, { title: portal.title })}>
            <img src={portal.image} alt={`${portal.title} entry`} loading="lazy" />
            <span className="portal-card__body"><span className="card-kicker">{portal.kicker}</span><h3>{portal.title}</h3><span className="portal-link">{portal.action}</span></span>
          </motion.a>
        ))}
      </div>
    </section>
  );
}

export function PlatformModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dialogRef, initialFocusRef } = useModalDialog(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="stream-modal open" role="dialog" aria-modal="true" aria-labelledby="platform-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
          <motion.div ref={dialogRef} className="modal-card" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
            <div className="modal-top"><div><p className="section-kicker">Listen your way</p><h2 id="platform-title">Choose a platform</h2><p>Select your preferred streaming service.</p></div><button ref={initialFocusRef} className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button></div>
            <div className="modal-platforms">{platforms.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noreferrer" onClick={() => track('platform_select', { platform: name })}><span>{name}</span><span>↗</span></a>)}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SupportSection({ onChoosePlatform }: { onChoosePlatform: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <section id="support" className="home-section offers-section" aria-labelledby="support-title">
      <SectionHeading kicker="Keep the signal moving" title="Support independent creation." body="Every book, stream, direct purchase, and creative project helps fund the next record, story, visual, and playable experiment." id="support-title" />
      <div className="offer-grid">
        {offers.map((offer, index) => (
          <motion.article className="offer-card" key={offer.number} initial={reduceMotion ? false : reveal.hidden} whileInView={reveal.visible} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.45, delay: index * 0.06 }}>
            <span className="offer-number">{offer.number}</span>
            <div><p className="card-kicker">{offer.kicker}</p><h3>{offer.title}</h3><p>{offer.body}</p>
              {offer.actionType === 'platform-modal' && <div className="songstats-row" aria-label="Current Songstats snapshot">{songstats.map(([value, label]) => <a key={label} href="https://songstats.com/artist/i34uwf2q/the-grei-show" target="_blank" rel="noreferrer"><span className="stat-value">{value}</span><span className="stat-label">{label}</span></a>)}</div>}
              {offer.actionType === 'platform-modal' ? <button className="home-button primary" type="button" onClick={() => { track(offer.tracking); onChoosePlatform(); }}>{offer.action}</button> : <a className={`home-button${offer.primary ? ' primary' : ''}`} href={offer.href} target={offer.href.startsWith('http') ? '_blank' : undefined} rel={offer.href.startsWith('http') ? 'noreferrer' : undefined} onClick={() => track(offer.tracking)}>{offer.action}</a>}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export function ServicesSection() {
  return (
    <section className="home-section" aria-labelledby="work-title"><div className="service-panel"><div className="service-copy"><p className="section-kicker">Wheel It! Records</p><h2 id="work-title">From first spark to finished world.</h2><p>Bring an idea, a song, or an unfinished vision. The Grei Show can help shape the sound, story, direction, and release experience around it.</p><div className="service-actions"><a className="home-button primary" href={siteUrl('/connect.html?interest=production')} onClick={() => track('start_project')}>Start a project</a><a className="home-button" href={siteUrl('/wheel-it-records.html')} onClick={() => track('view_records')}>See Wheel It! Records</a></div></div><ol className="service-list">{services.map(([number, title, body]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><small>{body}</small></div></li>)}</ol></div></section>
  );
}

export function NewsletterSection() {
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    setSubmitting(true);
    setStatus('Joining…');
    try {
      const result = await submitNewsletter({ firstName: String(data.get('first_name') || ''), email: String(data.get('email') || ''), country: String(data.get('country') || ''), consent: data.get('consent') === 'on' });
      setStatus(result.message);
      track('newsletter_signup', { preview: result.message.startsWith('Preview mode') });
      if (!result.message.startsWith('Preview mode')) form.reset();
    } catch (error) {
      console.error(error);
      setStatus('The signal did not go through. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section className="home-section list-section" aria-labelledby="list-title"><div className="list-panel"><div className="list-copy"><p className="section-kicker">Stay close to the signal</p><h2 id="list-title">Get the next transmission.</h2><p>Join for early access to new chapters, exclusive tracks, visual drops and arcade unlocks. We respect your inbox.</p><form className="newsletter-form" onSubmit={submit} noValidate><div className="form-row"><div className="form-field"><label htmlFor="first-name">First name</label><input id="first-name" name="first_name" placeholder="Your first name" autoComplete="given-name" /></div><div className="form-field"><label htmlFor="email">Email *</label><input id="email" name="email" type="email" placeholder="you@domain.com" required autoComplete="email" /></div></div><div className="form-row"><div className="form-field"><label htmlFor="country">Country / Region</label><input id="country" name="country" placeholder="Jamaica or anywhere" autoComplete="country-name" /></div></div><label className="consent-label"><input type="checkbox" name="consent" defaultChecked /><span>I’d like occasional updates about releases and projects. You can unsubscribe anytime.</span></label><div className="form-actions"><button className="home-button primary" type="submit" disabled={submitting}>{submitting ? 'Joining…' : 'Join the list'}</button><div className="form-status" aria-live="polite">{status}</div></div></form></div></div></section>
  );
}
