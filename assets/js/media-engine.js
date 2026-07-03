/*
  Unified Media Engine Layer
  The Grei Show - Visual Media OS Core
*/

window.MediaEngine = (function () {

  const state = {
    videos: [
      { title: "Puff Puff Pass [Remix]", id: "ZsoVettmghI", type: "release", artist: "The Grei Show, Bay-C" },
      { title: "Puff Puff Pass", id: "aGXBlYq3EbY", type: "release", artist: "The Grei Show" },
      { title: "Choppa Talk", id: "Ibd1_8niIhg", type: "release", artist: "The Grei Show" },
      { title: "Loosen Up", id: "xTqZHV_37Lo", type: "release", artist: "The Grei Show, Swnkah" },
      { title: "The Vibe", id: "jinbfL-dW7s", type: "release", artist: "The Grei Show, Big Sugar, Canned Beets" },
      { title: "Joy", id: "8HcD4kv-oAI", type: "release", artist: "The Grei Show" },
      { title: "Blind Without Shades", id: "dGydgjCmkb4", type: "release", artist: "The Grei Show" },
      { title: "Over The Horizon", id: "aRsYBWBUZWo", type: "release", artist: "The Grei Show" },
      { title: "Looking For Something", id: "hmZP_xA8R2g", type: "release", artist: "The Grei Show" },
      { title: "The Flame", id: "ONeDgOgU0EA", type: "release", artist: "The Grei Show" },
      { title: "Numb", id: "e5j3K8X9dp4", type: "release", artist: "The Grei Show" },
      { title: "Rage!", id: "B0SSbbLDbMw", type: "release", artist: "The Grei Show" },
      { title: "Full Moon", id: "bXB2sF02eQI", type: "release", artist: "The Grei Show" },
      { title: "Squad People", id: "XlvZEauADkw", type: "release", artist: "The Grei Show, Kione Zaire, Blvk Hero" },
      { title: "Upscale", id: "_AHolxZ4Nq0", type: "release", artist: "The Grei Show" },
      { title: "Because I Miss You Too [Part II]", id: "FhXsTlSdsUo", type: "release", artist: "The Grei Show" },
      { title: "Shutter Speed", id: "a1aJxmAypho", type: "release", artist: "The Grei Show" },
      { title: "Soul Stealer", id: "VFDRN575k68", type: "release", artist: "The Grei Show" } 
    ],

    documentaries: [
      { title: "A DEADLY Intro", id: "LQJH5apx5lg", type: "doc" },
      { title: "Exclusive Interview With Daindra Harrison", id: "XDhLpxWwp5Y", type: "Interview" },
      { title: "In Search Of Lost Files | Protoje", id: "pnuf_wMKt-A", type: "doc" },
      { title: "How To Use A Steam Chalice", id: "OW8iHph6x_E", type: "doc" },
      { title: "Exploring Local Dispensaries In Kingston With The Legandary Bay-C", id: "iRzHXezaJ_E", type: "doc" }
    ],

    liveSessions: [
      { title: "Loosen Up | Nikki Z & Mr. Lexx", id: "1H8YqU0ajKI", type: "T.V." },
      { title: "BoomBox Fridays | Sugar Minott Studio ", id: "l5-Ei1FjmD0", type: "Stage" },
      { title: "Puff Puff Pass | Dubwise & Soulection", id: "6oIOOzyiISU", type: "Sound System" },
      { title: "Freestyle | Riddim All Night Long", id: "37uLIlT8AhQ", type: "Sound System" },
      { title: "Rub-a-Dub Tuesdays | Singer J & Ricky Trooper", id: "9kWiyU82HDA", type: "Sound System" },
      { title: "Sankofa Sessions", id: "B-dIu2pG0lc", type: "Dj Set" },
      { title: "Indie Dance | Stone's Throw Bar", id: "2aYYhbL8_bU", type: "Live Band" },
      { title: "Full Moon | Dub School", id: "X5uIzcmdMnc", type: "Sound System" },
      { title: "Another Price To Pay | SR Studios", id: "L7_O0Hk-eME", type: "Rehearsal Session" },
      { title: "Puff Puff Pass | Dub School", id: "g9_MCzgW6zo", type: "Live Band" }
    ]
  };

  function getAll(type) {
    if (!type) return state;
    return state[type] || [];
  }

  function add(type, item) {
    if (!state[type]) state[type] = [];
    state[type].push(item);
  }

  function remove(type, id) {
    if (!state[type]) return;
    state[type] = state[type].filter(i => i.id !== id);
  }

  function find(type, id) {
    if (!state[type]) return null;
    return state[type].find(i => i.id === id);
  }

  function filter(type, predicate) {
    if (!state[type]) return [];
    return state[type].filter(predicate);
  }

  return {
    getAll,
    add,
    remove,
    find,
    filter,
    state
  };

})();
