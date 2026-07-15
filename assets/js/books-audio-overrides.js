(function () {
  const audioByChapter = {
    '07': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/60f0ecee-3c8d-4d03-abf6-ab4ebaf2ec8c.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=1dcf96788d814090b09d147e50ae0320'
    },
    '08': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/85069be1-959b-41aa-934c-bc9789fa5b12.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=aae2538c31df43d4adaa32e67700e3f3'
    },
    '09': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/b5e76014-eb4c-439e-8c66-73aa44ae4686.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=9320c549732347dda8635d7c19edf986'
    },
    '10': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/a06cf58b-a4ef-40dc-9807-2feecd3747b8.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=3e94c88686574c3db7a70ba38d33b44e'
    },
    '11': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/c880c6a6-117f-45b8-ad06-fa48e3f1f80e.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=c9a358c798924309a50d4679cd5ca08d'
    },
    '12': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/278049e9-e943-480d-b043-1e7b5d562c2c.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=d57dcb92e3484014a2da8666f47b9142'
    },
    '13': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/53dd6622-58f9-4f8e-92bc-5ad9148255d6.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=dcf6e2e3b6ad46bf9dc167bede1c6798'
    },
    '14': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/fe5ceac0-95bf-48c4-be21-8b74645f0aef.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=2554988ecc1c4da7be44204d052f3b6d'
    },
    '15': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/861f8c58-8c79-429b-aaff-fbdda938e817.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=273339f71ac74db6ba2f83dc8730299d'
    },
    '16': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/2299c232-843a-4a37-b6a8-314a6e575db3.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=55e539bb99a34af4b82ece0676da0a12'
    },
    '17': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/62d8fca1-e3b6-4f91-8021-3335f9f99329.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=efc62cb4e10c45068cba44afcffe7466'
    },
    '18': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/e0ff15ce-e85e-4e69-8eb5-a0bdeeb740b0.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=8a667f9a0877498ca7a853b9b90f7375'
    },
    '19': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/73a5650a-790a-415f-91fb-deabfae13906.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=35b180239e074963bf15584b79748567'
    },
    '20': {
      previewAudio: 'https://storage.googleapis.com/adm--audio-playback--7d--public/mcp-preview/8f2c2564-469f-4b83-ad61-33b773c47233.mp3',
      fullAudio: 'https://www.aidocmaker.com/g0/audio?name=64ca995d77754ced853801ea02542d31'
    }
  };

  const chapters = Array.isArray(window.astralThreadChapters) ? window.astralThreadChapters : [];
  chapters.forEach(chapter => {
    const audio = audioByChapter[chapter.number];
    if (audio) Object.assign(chapter, audio);
  });
})();
