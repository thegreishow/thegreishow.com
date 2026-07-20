const chapters = Array.isArray(window.astralThreadChapters) ? window.astralThreadChapters : [];
let activeChapter = 0;

const reader = document.querySelector('.reader-card');
const chapterKicker = document.getElementById('chapter-kicker');
const chapterTitle = document.getElementById('chapter-title');
const chapterVisual = document.getElementById('chapter-visual');
const chapterArtworkWrap = document.querySelector('.chapter-artwork');
const chapterArtwork = document.getElementById('chapter-artwork');
const audioBlock = document.querySelector('.audio-block');
const chapterAudio = document.getElementById('chapter-audio');
const chapterFullAudio = document.getElementById('chapter-full-audio');
const chapterText = document.getElementById('chapter-text');
const chapterCount = document.getElementById('chapter-count');
const prevButton = document.getElementById('prev-chapter');
const nextButton = document.getElementById('next-chapter');
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

function renderParagraphs(paragraphs = []) {
  const nodes = paragraphs.map(paragraph => {
    const node = document.createElement('p');
    node.textContent = paragraph;
    return node;
  });

  chapterText.replaceChildren(...nodes);
}

function renderAudio(chapter) {
  const audioSource = chapter.fullAudio;

  audioBlock.hidden = !audioSource;
  chapterAudio.hidden = !audioSource;
  chapterFullAudio.hidden = !audioSource;

  if (audioSource) {
    chapterAudio.src = audioSource;
    chapterAudio.load();
    chapterFullAudio.href = audioSource;
    chapterFullAudio.setAttribute('aria-label', `Open the full narration for ${chapter.title}`);
  } else {
    chapterAudio.pause();
    chapterAudio.removeAttribute('src');
    chapterAudio.load();
    chapterFullAudio.removeAttribute('href');
    chapterFullAudio.removeAttribute('aria-label');
  }
}

function renderArtwork(chapter) {
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

  chapterAudio.pause();
  activeChapter = nextChapter;
  reader.classList.remove('turning');
  void reader.offsetWidth;
  reader.classList.add('turning');
  renderChapter();
}

prevButton.addEventListener('click', () => turnPage(-1));
nextButton.addEventListener('click', () => turnPage(1));
document.addEventListener('keydown', event => {
  if (
    event.target instanceof Element &&
    event.target.closest('a, button, input, select, textarea, audio, [contenteditable]')
  ) return;
  if (event.key === 'ArrowLeft') turnPage(-1);
  if (event.key === 'ArrowRight') turnPage(1);
});

renderChapter();
