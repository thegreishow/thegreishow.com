(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  function buildTitle() {
    const title = document.getElementById('home-title');
    if (!title || title.dataset.greiReactorReady === 'true') return;

    const rawTitle = title.textContent.replace(/\s+/g, ' ').trim() || 'The Grei Show';
    title.dataset.greiReactorReady = 'true';
    title.classList.add('grei-title-reactor');
    title.setAttribute('aria-label', rawTitle);
    title.textContent = '';

    const stage = document.createElement('span');
    stage.className = 'grei-reactor-stage';
    stage.setAttribute('aria-hidden', 'true');

    let letterIndex = 0;
    rawTitle.split(/\s+/).forEach((word, wordIndex) => {
      const wordNode = document.createElement('span');
      wordNode.className = 'grei-reactor-word';
      wordNode.dataset.word = word.toUpperCase();
      wordNode.style.setProperty('--word-delay', `${90 + wordIndex * 120}ms`);
      wordNode.addEventListener('animationend', event => {
        if (event.target === wordNode && event.animationName === 'grei-word-open') {
          wordNode.classList.add('is-open');
        }
      });

      Array.from(word.toUpperCase()).forEach(character => {
        const glyph = document.createElement('span');
        glyph.className = 'grei-reactor-glyph';
        glyph.dataset.char = character;
        glyph.style.setProperty('--letter-delay', `${140 + letterIndex * 48}ms`);
        glyph.style.setProperty('--glyph-index', letterIndex);
        glyph.style.setProperty('--reaction', '0');
        glyph.textContent = character;

        const prism = document.createElement('b');
        prism.className = 'grei-reactor-prism';
        prism.setAttribute('aria-hidden', 'true');
        prism.textContent = character;

        const shine = document.createElement('em');
        shine.className = 'grei-reactor-shine';
        shine.setAttribute('aria-hidden', 'true');
        shine.textContent = character;
        glyph.append(prism, shine);
        wordNode.appendChild(glyph);
        letterIndex += 1;
      });

      stage.appendChild(wordNode);
    });

    title.appendChild(stage);
    if (reduceMotion) return;

    const particleCanvas = document.createElement('canvas');
    particleCanvas.className = 'grei-reactor-particles';
    particleCanvas.setAttribute('aria-hidden', 'true');
    title.prepend(particleCanvas);
    const particleContext = particleCanvas.getContext('2d', { alpha: true });
    const glyphs = Array.from(stage.querySelectorAll('.grei-reactor-glyph'));
    let stageBounds = null;
    let glyphCenters = [];
    let pendingEvent = null;
    let frame = 0;
    let particleFrame = 0;
    let particles = [];
    let lastParticleX = -100;
    let lastParticleY = -100;
    let particleRatio = 1;
    const particlePadding = 34;

    const resizeParticles = () => {
      if (!particleContext) return;
      const bounds = title.getBoundingClientRect();
      particleRatio = Math.min(devicePixelRatio || 1, 1.4);
      particleCanvas.width = Math.round((bounds.width + particlePadding * 2) * particleRatio);
      particleCanvas.height = Math.round((bounds.height + particlePadding * 2) * particleRatio);
      particleContext.setTransform(particleRatio, 0, 0, particleRatio, 0, 0);
    };

    const drawParticles = () => {
      if (!particleContext) return;
      particleContext.clearRect(0, 0, particleCanvas.width / particleRatio, particleCanvas.height / particleRatio);
      particleContext.globalCompositeOperation = 'screen';
      particles = particles.filter(particle => particle.life > .02);
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= .975;
        particle.vy *= .975;
        particle.life *= .935;
        particleContext.save();
        particleContext.translate(particle.x, particle.y);
        particleContext.rotate(particle.spin += particle.spinSpeed);
        particleContext.fillStyle = `rgba(${particle.color},${particle.life})`;
        particleContext.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        particleContext.restore();
      });
      particleFrame = particles.length ? requestAnimationFrame(drawParticles) : 0;
    };

    const startParticles = () => {
      if (!particleFrame && particles.length) particleFrame = requestAnimationFrame(drawParticles);
    };

    const spawnTrail = event => {
      if (!particleContext || !stageBounds) return;
      const distance = Math.hypot(event.clientX - lastParticleX, event.clientY - lastParticleY);
      if (distance < 13) return;
      lastParticleX = event.clientX;
      lastParticleY = event.clientY;
      const localX = event.clientX - stageBounds.left + particlePadding;
      const localY = event.clientY - stageBounds.top + particlePadding;
      const colors = ['216,255,99', '83,208,255', '164,111,255'];
      const amount = Math.min(3, Math.max(1, Math.round(distance / 38)));
      for (let index = 0; index < amount; index += 1) {
        particles.push({
          x: localX + (Math.random() - .5) * 12,
          y: localY + (Math.random() - .5) * 9,
          vx: (Math.random() - .5) * 1.1,
          vy: -.25 - Math.random() * .75,
          size: 1.4 + Math.random() * 3.2,
          spin: Math.random() * Math.PI,
          spinSpeed: (Math.random() - .5) * .2,
          life: .45 + Math.random() * .45,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
      if (particles.length > 72) particles = particles.slice(-72);
      startParticles();
    };

    const spawnBurst = event => {
      if (!particleContext || !stageBounds) return;
      const localX = event.clientX - stageBounds.left + particlePadding;
      const localY = event.clientY - stageBounds.top + particlePadding;
      for (let index = 0; index < 22; index += 1) {
        const angle = (Math.PI * 2 * index) / 22 + Math.random() * .18;
        const force = .7 + Math.random() * 2.1;
        particles.push({
          x: localX,
          y: localY,
          vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force,
          size: 1.8 + Math.random() * 3.6,
          spin: angle,
          spinSpeed: (Math.random() - .5) * .28,
          life: .58 + Math.random() * .38,
          color: index % 3 === 0 ? '216,255,99' : index % 3 === 1 ? '83,208,255' : '164,111,255'
        });
      }
      startParticles();
    };

    const measure = () => {
      stageBounds = stage.getBoundingClientRect();
      resizeParticles();
      glyphCenters = glyphs.map(glyph => {
        const bounds = glyph.getBoundingClientRect();
        return bounds.left + bounds.width / 2;
      });
    };

    const renderReaction = () => {
      frame = 0;
      if (!pendingEvent || !stageBounds) return;
      const event = pendingEvent;
      const x = Math.max(0, Math.min(1, (event.clientX - stageBounds.left) / stageBounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - stageBounds.top) / stageBounds.height));
      const radius = Math.max(120, stageBounds.width * .24);

      title.style.setProperty('--tilt-y', `${(x - .5) * 8}deg`);
      title.style.setProperty('--tilt-x', `${(.5 - y) * 5}deg`);
      title.style.setProperty('--light-x', `${x * 100}%`);
      title.style.setProperty('--light-y', `${y * 100}%`);
      title.style.setProperty('--echo-x', `${(x - .5) * -8}px`);
      title.style.setProperty('--echo-y', `${(y - .5) * -5}px`);

      glyphs.forEach((glyph, index) => {
        const reaction = Math.max(0, 1 - Math.abs(event.clientX - glyphCenters[index]) / radius);
        glyph.style.setProperty('--reaction', reaction.toFixed(3));
      });
    };

    if (finePointer) {
      title.addEventListener('pointerenter', measure, { passive: true });
      title.addEventListener('pointermove', event => {
        pendingEvent = event;
        spawnTrail(event);
        if (!frame) frame = requestAnimationFrame(renderReaction);
      }, { passive: true });

      title.addEventListener('pointerleave', () => {
        pendingEvent = null;
        title.style.setProperty('--tilt-x', '0deg');
        title.style.setProperty('--tilt-y', '0deg');
        title.style.setProperty('--light-x', '32%');
        title.style.setProperty('--light-y', '48%');
        title.style.setProperty('--echo-x', '0px');
        title.style.setProperty('--echo-y', '0px');
        glyphs.forEach(glyph => glyph.style.setProperty('--reaction', '0'));
      }, { passive: true });
    }

    title.addEventListener('pointerdown', event => {
      spawnBurst(event);
      title.classList.remove('is-struck');
      requestAnimationFrame(() => title.classList.add('is-struck'));
    });
    title.addEventListener('animationend', event => {
      if (event.animationName === 'grei-impact') title.classList.remove('is-struck');
    });
    addEventListener('resize', measure, { passive: true });
    measure();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildTitle, { once: true });
  } else {
    buildTitle();
  }

  document.addEventListener('cms:ready', () => {
    const title = document.getElementById('home-title');
    if (title && !title.querySelector('.grei-reactor-stage')) {
      delete title.dataset.greiReactorReady;
      buildTitle();
    }
  }, { once: true });
})();
