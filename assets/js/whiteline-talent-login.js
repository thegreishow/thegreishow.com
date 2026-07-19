(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  const db = window.supabase.createClient(config.url, config.anonKey);
  const form = document.getElementById('login-form');
  const signup = document.getElementById('signup');
  const status = document.getElementById('status');

  const show = (message) => { status.hidden = false; status.textContent = message; };
  const emailValue = () => String(new FormData(form).get('email') || '').trim();
  const passwordValue = () => String(new FormData(form).get('password') || '');

  db.auth.getSession().then(({ data }) => {
    if (data.session) location.href = 'whiteline-talent-portal.html';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    show('Signing in…');
    const { error } = await db.auth.signInWithPassword({ email: emailValue(), password: passwordValue() });
    if (error) return show(error.message);
    location.href = 'whiteline-talent-portal.html';
  });

  signup.addEventListener('click', async () => {
    const email = emailValue();
    const password = passwordValue();
    if (!email || password.length < 8) return show('Enter your approved profile email and a password of at least 8 characters.');
    show('Creating account…');
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/whiteline-talent-portal.html` }
    });
    if (error) return show(error.message);
    if (data.session) location.href = 'whiteline-talent-portal.html';
    else show('Account created. Check your email to confirm the account, then sign in.');
  });
})();