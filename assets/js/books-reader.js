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

prevButton.addEventListener('click', () => turnPage(-1));
nextButton.addEventListener('click', () => turnPage(1));
document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') turnPage(-1);
  if (event.key === 'ArrowRight') turnPage(1);
});

renderChapter();
