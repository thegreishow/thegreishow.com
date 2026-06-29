/*
  Unified Media Engine Layer
  The Grei Show - Visual Media OS Core
*/

window.MediaEngine = (function () {

  const state = {
    videos: [
      { title: "No Drama", id: "ZsoVettmghI", type: "release" },
      { title: "Video 2", id: "aGXBlYq3EbY", type: "release" },
      { title: "Video 3", id: "Ibd1_8niIhg", type: "release" },
      { title: "Video 4", id: "xTqZHV_37Lo", type: "release" },
      { title: "Video 5", id: "jinbfL-dW7s", type: "release" },
      { title: "Video 6", id: "8HcD4kv-oAI", type: "release" },
      { title: "Video 7", id: "dGydgjCmkb4", type: "release" }
    ],

    documentaries: [
      { title: "Behind The Grei Show", id: "iRzHXezaJ_E", type: "doc" }
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