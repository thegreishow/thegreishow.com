// Grei Site - Shared footer component
(function () {
  async function init() {
    if (document.querySelector('[data-site-footer]')) return;
    try {
      const response = await fetch('/shared/footer.html', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Footer unavailable');
      const html = await response.text();
      const mount = document.getElementById('site-footer');
      if (mount) {
        mount.innerHTML = html;
        return;
      }
      const main = document.querySelector('main');
      const target = main || document.body;
      const wrapper = document.createElement('div');
      wrapper.id = 'site-footer';
      wrapper.innerHTML = html;
      target.parentNode.insertBefore(wrapper, target.nextSibling);
    } catch (error) {
      console.error('[Footer Loader] Failed to load footer:', error);
    }
  }

  window.GreiFooter = { init };
})();
