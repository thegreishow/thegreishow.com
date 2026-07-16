(() => {
  const chapters = Array.isArray(window.astralThreadChapters) ? window.astralThreadChapters : [];
  const defaultArtwork = {
    artwork: 'assets/images/books/astral-thread-cover.jpg',
    artworkAlt: 'A moonlit figure reaching toward a luminous thread of stars above a cliff.'
  };
  const artworkByChapter = {
    '01': {
      artwork: 'assets/images/books/astral-thread-chapter-01.jpg',
      artworkAlt: 'A resting figure beside a moonlit window with a warm tree-like glow of quiet strength at the heart.'
    },
    '02': {
      artwork: 'assets/images/books/astral-thread-chapter-02.jpg',
      artworkAlt: 'A calm figure breathing a luminous ribbon into a rose and indigo twilight sky from a quiet terrace.'
    },
    '03': {
      artwork: 'assets/images/books/astral-thread-chapter-03.jpg',
      artworkAlt: 'A figure painting with light as music and constellations rise into a luminous celestial canvas.'
    },
    '04': {
      artwork: 'assets/images/books/astral-thread-chapter-04.jpg',
      artworkAlt: 'A dreamweaver in an enchanted forest weaving glowing dream tapestries beneath the moon.'
    },
    '06': {
      artwork: 'assets/images/books/astral-thread-chapter-06.jpg',
      artworkAlt: 'Malia sitting beneath a breadfruit tree above a sunlit island village and sea.'
    }
  };

  chapters.forEach(chapter => {
    Object.assign(chapter, defaultArtwork, artworkByChapter[chapter.number]);
  });
})();
