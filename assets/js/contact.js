(function () {
  const form = document.getElementById('project-inquiry');
  const interest = document.getElementById('interest');
  const prepared = document.getElementById('prepared-inquiry');
  const emailLink = document.getElementById('prepared-email-link');
  if (!form || !interest || !prepared || !emailLink) return;

  const interestAliases = {
    'creative-project': 'creative-direction',
    production: 'music-production'
  };
  const requestedInterest = new URLSearchParams(window.location.search).get('interest');
  const selectedInterest = interestAliases[requestedInterest] || requestedInterest;

  if (selectedInterest && interest.querySelector(`option[value="${CSS.escape(selectedInterest)}"]`)) {
    interest.value = selectedInterest;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const serviceLabel = interest.options[interest.selectedIndex].text;
    const subject = `Project inquiry - ${serviceLabel}`;
    const body = [
      'Hi Grei,',
      '',
      `Name: ${fields.get('name')}`,
      `Email: ${fields.get('email')}`,
      `Project type: ${serviceLabel}`,
      `Timeline: ${fields.get('timeline')}`,
      `Budget range: ${fields.get('budget')}`,
      '',
      'Project brief:',
      fields.get('brief'),
      '',
      'Thanks.'
    ].join('\n');

    emailLink.href = `mailto:thegreishow@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    prepared.hidden = false;
    prepared.focus();
    window.greiTrack?.('grei_inquiry_prepared', { service: interest.value });
  });
})();
