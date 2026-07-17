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
    '05': {
      artwork: 'assets/images/books/astral-thread-chapter-05.jpg',
      artworkAlt: 'Elara reaching from a moonlit cliff toward a luminous astral thread that leads into the stars.'
    },
    '06': {
      artwork: 'assets/images/books/astral-thread-chapter-06.jpg',
      artworkAlt: 'Malia sitting beneath a breadfruit tree above a sunlit island village and sea.'
    },
    '07': {
      artwork: 'assets/images/books/astral-thread-chapter-07.jpg',
      artworkAlt: 'Mira beside a still fountain in a golden garden where forgotten names bloom like seeds.'
    },
    '08': {
      artwork: 'assets/images/books/astral-thread-chapter-08.jpg',
      artworkAlt: 'Arielle touching a tarnished mirror as her deeper self appears in fractured silver light.'
    },
    '09': {
      artwork: 'assets/images/books/astral-thread-chapter-09.jpg',
      artworkAlt: 'Selene and Prince Adrien facing each other across a garden between palace walls and village paths.'
    },
    '10': {
      artwork: 'assets/images/books/astral-thread-chapter-10.jpg',
      artworkAlt: 'A mysterious man surrounded by translucent masks that suggest many hidden selves.'
    },
    '11': {
      artwork: 'assets/images/books/astral-thread-chapter-11.jpg',
      artworkAlt: 'A figure wearing flowing robes woven from starlight in a celestial atelier.'
    },
    '12': {
      artwork: 'assets/images/books/astral-thread-chapter-12.jpg',
      artworkAlt: 'Grei and SYNTHIA reaching toward an astral thread in a fractured future city.'
    },
    '13': {
      artwork: 'assets/images/books/astral-thread-chapter-13.jpg',
      artworkAlt: 'A solitary figure walking through drifting fragments toward a pale open horizon.'
    },
    '14': {
      artwork: 'assets/images/books/astral-thread-chapter-14.jpg',
      artworkAlt: 'A conflicted shadow-being standing before a radiant celestial threshold.'
    },
    '15': {
      artwork: 'assets/images/books/astral-thread-chapter-15.jpg',
      artworkAlt: 'A misty crossroads where a cloaked legendary figure watches over a sealed dark relic.'
    }
  };

  chapters.forEach(chapter => {
    Object.assign(chapter, defaultArtwork, artworkByChapter[chapter.number]);
  });
})();
