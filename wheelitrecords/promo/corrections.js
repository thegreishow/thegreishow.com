(function(){
  const releases = window.WHEEL_IT_RELEASES;
  if (!releases || !releases['dinero-code']) return;
  const release = releases['dinero-code'];
  release.artist = 'WiggWard & Poseck Jr.';
  release.artistProfiles = [
    {
      name: 'WiggWard',
      subtitle: 'Jamaica',
      bio: 'WiggWard is a Jamaican dancehall recording artist whose musical identity is distinct from his better-known dance persona, Bop Dymond. His work centres contemporary dancehall delivery, street narratives and energetic performance.'
    },
    {
      name: 'Poseck Jr.',
      subtitle: 'Spain',
      bio: 'Poseck Jr. is a Spanish urban recording artist working across Latin and contemporary crossover music. His appearance on “Dinero Code” gives the single a clear Jamaica–Spain identity.'
    }
  ];
  release.description = 'WiggWard and Poseck Jr. join forces on “Dinero Code,” a focused modern-dancehall record built around ambition, momentum and survival-minded confidence.';
  release.credits = [['Primary Artists','WiggWard & Poseck Jr.'],['Record Label','Wheel It! Records']];
})();