(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey) return;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);
  const client = originalCreateClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "whiteline-admin-auth"
    }
  });

  window.WHITE_LINE_DB = client;
  window.supabase.createClient = (url, key, options) => {
    if (url === config.url && key === config.anonKey) return client;
    return originalCreateClient(url, key, options);
  };
})();
