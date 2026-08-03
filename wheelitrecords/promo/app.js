const audio = document.querySelector("#audio");
let currentButton = null;
document.querySelectorAll("[data-audio]").forEach(btn => {
  btn.addEventListener("click", () => {
    const src = btn.dataset.audio;
    const title = btn.dataset.title;
    if (audio.src !== src) {
      audio.src = src;
      document.querySelector("#now-playing").textContent = title;
      if (currentButton) currentButton.textContent = "▶";
      currentButton = btn;
    }
    if (audio.paused) { audio.play(); btn.textContent = "❚❚"; }
    else { audio.pause(); btn.textContent = "▶"; }
  });
});
audio.addEventListener("pause",()=>{if(currentButton)currentButton.textContent="▶"});
audio.addEventListener("play",()=>{if(currentButton)currentButton.textContent="❚❚"});
document.querySelector("#share")?.addEventListener("click", async () => {
  const data={title:document.title,url:location.href};
  try{if(navigator.share) await navigator.share(data); else {await navigator.clipboard.writeText(location.href);alert("Link copied");}}catch(e){}
});
