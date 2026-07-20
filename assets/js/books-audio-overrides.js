(function () {
  const audioByChapter = {
    '01': 'assets/audio/books/the-astral-thread/v1/chapter-01-the-quiet-strength-within.mp3',
    '02': 'assets/audio/books/the-astral-thread/v1/chapter-02-a-prelude-to-serenity.mp3',
    '03': 'assets/audio/books/the-astral-thread/v1/chapter-03-the-symphony-of-becoming.mp3',
    '04': 'assets/audio/books/the-astral-thread/v1/chapter-04-the-symphony-of-dreams.mp3',
    '05': 'assets/audio/books/the-astral-thread/v1/chapter-05-the-astral-thread.mp3',
    '06': 'assets/audio/books/the-astral-thread/v1/chapter-06-beneath-the-breadfruit-tree.mp3',
    '07': 'assets/audio/books/the-astral-thread/v1/chapter-07-the-garden-of-forgotten-names.mp3',
    '08': 'assets/audio/books/the-astral-thread/v1/chapter-08-veil-of-mirrors.mp3',
    '09': 'assets/audio/books/the-astral-thread/v1/chapter-09-a-garden-of-two-worlds.mp3',
    '10': 'assets/audio/books/the-astral-thread/v1/chapter-10-the-man-with-72-faces.mp3',
    '11': 'assets/audio/books/the-astral-thread/v1/chapter-11-garbs-made-of-stars.mp3',
    '12': 'assets/audio/books/the-astral-thread/v1/chapter-12-dreamweavers.mp3',
    '13': 'assets/audio/books/the-astral-thread/v1/chapter-13-theres-nothing-to-believe-in.mp3',
    '14': 'assets/audio/books/the-astral-thread/v1/chapter-14-gods-favorite-demon.mp3',
    '15': 'assets/audio/books/the-astral-thread/v1/chapter-15-what-is-devilmans-grim.mp3',
    '16': 'assets/audio/books/the-astral-thread/v1/chapter-16-hellmans-hell-game.mp3',
    '17': 'assets/audio/books/the-astral-thread/v1/chapter-17-hellman-is-in-love-with-an-angel.mp3',
    '18': 'assets/audio/books/the-astral-thread/v1/chapter-18-the-eternal-note.mp3',
    '19': 'assets/audio/books/the-astral-thread/v1/chapter-19-the-silent-whistle.mp3',
    '20': 'assets/audio/books/the-astral-thread/v1/chapter-20-i-woke-up-in-a-superposition.mp3'
  };

  const chapters = Array.isArray(window.astralThreadChapters) ? window.astralThreadChapters : [];
  chapters.forEach(chapter => {
    chapter.previewAudio = '';
    chapter.fullAudio = audioByChapter[chapter.number] || '';
  });
})();
