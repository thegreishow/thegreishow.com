// Grei Arcade Engine - Embed Layer
// Enables external developer games via iframe sandbox system

let activeModal = null;

function handleEscape(event) {
  if (event.key === 'Escape') closeGameEmbed();
}

export function openGameEmbed(game) {
  closeGameEmbed();

  activeModal = document.createElement('div');
  activeModal.className = 'arcade-modal';
  activeModal.setAttribute('role', 'dialog');
  activeModal.setAttribute('aria-modal', 'true');
  activeModal.setAttribute('aria-label', `${game.title || 'Arcade game'} player`);

  activeModal.innerHTML = `
    <div class="arcade-modal-backdrop"></div>
    <div class="arcade-modal-content">
      <button class="close-btn" type="button" aria-label="Close game">&times;</button>
      <iframe
        src="${game.entry}"
        title="${game.title || 'Arcade game'}"
        allowfullscreen
        class="arcade-iframe"
      ></iframe>
    </div>
  `;

  document.body.appendChild(activeModal);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', handleEscape);

  activeModal.querySelector('.close-btn').addEventListener('click', closeGameEmbed);
  activeModal.querySelector('.arcade-modal-backdrop').addEventListener('click', closeGameEmbed);
  activeModal.querySelector('.close-btn').focus();
}

export function closeGameEmbed() {
  if (!activeModal) return;

  activeModal.remove();
  activeModal = null;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleEscape);
}
