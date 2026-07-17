const chapters = Array.isArray(window.astralThreadChapters) ? window.astralThreadChapters : [];
let activeChapter = 0;
let readerInitialized = false;

const reader = document.querySelector('.reader-card');
const selectedBook = document.getElementById('astral-thread');
const library = document.getElementById('library');
const openBookButton = document.getElementById('open-astral-thread');
const backToLibraryButton = document.getElementById('back-to-library');
const continueToReaderLink = document.querySelector('a[href="#reader"]');
const chapterKicker = document.getElementById('chapter-kicker');
const chapterTitle = document.getElementById('chapter-title');
const chapterVisual = document.getElementById('chapter-visual');
const chapterArtworkWrap = document.querySelector('.chapter-artwork');
const chapterArtwork = document.getElementById('chapter-artwork');
const audioBlock = document.querySelector('.audio-block');
const chapterAudio = document.getElementById('chapter-audio');
const chapterFullAudio = document.getElementById('chapter-full-audio');
const chapterReadTitle = document.getElementById('chapter-read-title');
const chapterText = document.getElementById('chapter-text');
const chapterCount = document.getElementById('chapter-count');
const prevButton = document.getElementById('prev-chapter');
const nextButton = document.getElementById('next-chapter');
let activeAudioSource = '';
const chapterNumberWords = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
  'Twenty'
];

function chapterLabel(chapter) {
  const number = Number(chapter.number);
  const word = chapterNumberWords[number];
  return word ? `Chapter ${word}` : `Chapter ${number}`;
}

function renderParagraphs(paragraphs) {
  const nodes = paragraphs.map(paragraph => {
    const node = document.createElement('p');
    node.textContent = paragraph;
    return node;
  });

  chapterText.replaceChildren(...nodes);
}

function renderAudio(chapter) {
  const hasPreview = Boolean(chapter.previewAudio);
  const hasFullAudio = Boolean(chapter.fullAudio);
  const audioSource = chapter.fullAudio || chapter.previewAudio;

  audioBlock.hidden = !audioSource;
  chapterAudio.hidden = !audioSource;
  chapterFullAudio.hidden = !hasFullAudio;

  if (audioSource) {
    activeAudioSource = audioSource;
    chapterAudio.dataset.fallbackAudio = hasFullAudio && hasPreview ? chapter.previewAudio : '';
    chapterAudio.src = audioSource;
    chapterAudio.load();
  } else {
    activeAudioSource = '';
    chapterAudio.dataset.fallbackAudio = '';
    chapterAudio.pause();
    chapterAudio.removeAttribute('src');
    chapterAudio.load();
  }

  if (hasFullAudio) {
    chapterFullAudio.href = chapter.fullAudio;
  } else {
    chapterFullAudio.removeAttribute('href');
  }
}

chapterAudio.addEventListener('error', () => {
  const fallbackAudio = chapterAudio.dataset.fallbackAudio;
  if (!fallbackAudio || activeAudioSource === fallbackAudio) return;

  activeAudioSource = fallbackAudio;
  chapterAudio.dataset.fallbackAudio = '';
  chapterAudio.src = fallbackAudio;
  chapterAudio.load();
});

function renderArtwork(chapter) {
  if (!chapterArtworkWrap || !chapterArtwork) return;

  const artwork = chapter.artwork;
  chapterArtworkWrap.hidden = !artwork;

  if (artwork) {
    chapterArtwork.src = artwork;
    chapterArtwork.alt = chapter.artworkAlt || `${chapter.title} artwork`;
  } else {
    chapterArtwork.removeAttribute('src');
    chapterArtwork.alt = '';
  }
}

function renderChapter() {
  if (!chapters.length) {
    chapterKicker.textContent = 'The Astral Thread';
    chapterTitle.textContent = 'Coming Soon';
    chapterVisual.textContent = '';
    renderArtwork({});
    chapterReadTitle.textContent = '';
    chapterText.replaceChildren();
    chapterCount.textContent = '0 / 0';
    prevButton.disabled = true;
    nextButton.disabled = true;
    audioBlock.hidden = true;
    return;
  }

  const chapter = chapters[activeChapter];
  const label = chapterLabel(chapter);
  chapterKicker.textContent = `${label} / The Astral Thread`;
  chapterTitle.textContent = chapter.title;
  chapterVisual.textContent = chapter.visual;
  renderArtwork(chapter);
  chapterReadTitle.textContent = `${label}. ${chapter.title}`;
  renderParagraphs(chapter.paragraphs);
  renderAudio(chapter);
  chapterCount.textContent = `${activeChapter + 1} / ${chapters.length}`;
  prevButton.disabled = activeChapter === 0;
  nextButton.disabled = activeChapter === chapters.length - 1;
  chapterText.scrollTop = 0;
}

function turnPage(direction) {
  const nextChapter = activeChapter + direction;
  if (nextChapter < 0 || nextChapter >= chapters.length) return;
  activeChapter = nextChapter;
  reader.classList.remove('turning');
  void reader.offsetWidth;
  reader.classList.add('turning');
  renderChapter();
}

function isBookHash(hash = window.location.hash) {
  return hash === '#reader' || hash === '#astral-thread';
}

function bookUrl(targetId) {
  return `${window.location.pathname}${window.location.search}#${targetId}`;
}

function focusBookTarget(targetId, behavior = 'smooth') {
  const target = document.getElementById(targetId) || selectedBook;

  window.requestAnimationFrame(() => {
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior, block: 'start' });
  });
}

function updateBookHistory(targetId, mode) {
  const currentState = window.history.state || {};
  const state = {
    ...currentState,
    greiBook: 'the-astral-thread'
  };

  if (mode === 'push') {
    state.greiBookCatalogReturn = true;
    window.history.pushState(state, '', bookUrl(targetId));
    return;
  }

  window.history.replaceState(state, '', bookUrl(targetId));
}

function openBook({ trackSelection = false, targetId = 'astral-thread', historyMode = null, behavior = 'smooth' } = {}) {
  selectedBook.hidden = false;
  reader.hidden = false;
  openBookButton.setAttribute('aria-expanded', 'true');

  if (!readerInitialized) {
    renderChapter();
    readerInitialized = true;
  }

  if (historyMode) {
    const mode = historyMode === 'push' && !isBookHash() ? 'push' : 'replace';
    updateBookHistory(targetId, mode);
  }

  focusBookTarget(targetId, behavior);

  if (trackSelection) {
    window.greiTrack?.('grei_book_selected', { book: 'the-astral-thread' });
  }
}

function hideBook({ restoreFocus = true, scrollToLibrary = true } = {}) {
  chapterAudio.pause();
  reader.hidden = true;
  selectedBook.hidden = true;
  openBookButton.setAttribute('aria-expanded', 'false');

  if (scrollToLibrary) {
    library.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (restoreFocus) {
    openBookButton.focus({ preventScroll: true });
  }
}

function clearBookHash() {
  const state = { ...(window.history.state || {}) };
  delete state.greiBook;
  delete state.greiBookCatalogReturn;
  window.history.replaceState(state, '', `${window.location.pathname}${window.location.search}`);
}

function returnToLibrary() {
  hideBook();

  if (!isBookHash()) return;

  if (window.history.state?.greiBookCatalogReturn) {
    window.history.back();
    return;
  }

  clearBookHash();
}

function syncBookToHash() {
  const targetId = window.location.hash.slice(1);

  if (isBookHash()) {
    openBook({ targetId, behavior: 'auto' });
    return;
  }

  hideBook({ restoreFocus: false, scrollToLibrary: false });
}

prevButton.addEventListener('click', () => turnPage(-1));
nextButton.addEventListener('click', () => turnPage(1));
openBookButton.addEventListener('click', () => {
  openBook({ trackSelection: true, historyMode: 'push' });
});
continueToReaderLink.addEventListener('click', event => {
  event.preventDefault();
  openBook({ targetId: 'reader', historyMode: 'replace' });
});
backToLibraryButton.addEventListener('click', returnToLibrary);
document.addEventListener('keydown', event => {
  if (reader.hidden) return;
  if (event.key === 'ArrowLeft') turnPage(-1);
  if (event.key === 'ArrowRight') turnPage(1);
});
window.addEventListener('hashchange', syncBookToHash);

if (isBookHash()) {
  syncBookToHash();
}
