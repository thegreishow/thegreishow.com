(() => {
  const chapters = Array.isArray(window.astralThreadChapters) ? window.astralThreadChapters : [];
  const defaultArtwork = {
    artwork: 'assets/images/books/astral-thread-cover.jpg',
    artworkAlt: 'A moonlit figure reaching toward a luminous thread of stars above a cliff.'
  };
  const artworkByChapter = {
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
