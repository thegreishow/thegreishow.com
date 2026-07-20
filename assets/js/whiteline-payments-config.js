window.WHITE_LINE_PAYMENTS = {
  // Add the public payment/profile URLs clients should open. Leave blank until confirmed.
  paypalUrl: '',
  wiseUrl: '',
  payoneerUrl: '',

  // Keep sensitive account numbers out of this public file. Use general transfer instructions only.
  bankInstructions: 'Reply to this message to receive the appropriate bank-transfer details.',
  confirmationEmail: 'thegreishow@gmail.com'
};

// The admin page already loads this configuration before its operational modules.
// Load the approval workflow here so application approval creates the roster profile
// and enables the talent portal in one controlled action.
if (/whiteline-admin\.html$/.test(window.location.pathname)) {
  const script = document.createElement('script');
  script.src = 'assets/js/whiteline-admin-onboarding.js';
  script.defer = true;
  document.head.appendChild(script);
}
