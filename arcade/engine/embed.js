// Grei Arcade Engine - Embed Layer
// Enables external developer games via iframe sandbox system

let activeModal = null;

export function openGameEmbed(game) {
  closeGameEmbed();

  activeModal = document.createElement('div');
  activeModal.className = 'arcade-modal';

  activeModal.innerHTML = `
    <div class="arcade-modal-backdrop"></div>
    <div class="arcade-modal-content">
      <button class="close-btn">×</button>
      <iframe 
        src="${game.entry}" 
        frameborder="0"
        allowfullscreen
        class="arcade-iframe"
      ></iframe>
    </div>
  `;

  document.body.appendChild(activeModal);

  activeModal.querySelector('.close-btn').addEventListener('click', closeGameEmbed);
  activeModal.querySelector('.arcade-modal-backdrop').addEventListener('click', closeGameEmbed);
}

export function closeGameEmbed() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}
