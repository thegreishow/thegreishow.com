select cron.schedule(
  'process-whiteline-email-queue',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://dkvbeizjlgxqjuxnlqho.supabase.co/functions/v1/process-whiteline-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'whiteline_email_cron_token'
        )
      ),
      body := '{"limit":50}'::jsonb,
      timeout_milliseconds := 20000
    );
  $cron$
);
