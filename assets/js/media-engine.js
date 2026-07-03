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
      { title: "Squad People", id: "XlvZEauADkw", type: "release", artist: "The Grei Show,Kione Zaire,Blvk Hero" },
      { title: "Upscale [Vizualizer]", id: "AHolxZ4Nq0", type: "release", artist: "The Grei Show" },
      { title: "Because I Miss You Too [Part II]", id: "FhXsTlSdsUo", type: "release", artist: "The Grei Show" },
      { title: "Shutter Speed", id: "a1aJxmAypho", type: "release", artist: "The Grei Show" },
      { title: "Soul Stealer [Visualizer]", id: "FhXsTlSdsUo", type: "release", artist: "The Grei Show" },
      { title: "Because I Miss You Too [Part II]", id: "FhXsTlSdsUo", type: "release", artist: "The Grei Show" }  
    ],

    documentaries: [
      { title: "Exploring Local Dispensaries In Kingston With The Legandary Bay-C", id: "iRzHXezaJ_E", type: "doc" }
    ],

    liveSessions: [
      { title: "Studio Session 1", id: null, type: "live" }
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
