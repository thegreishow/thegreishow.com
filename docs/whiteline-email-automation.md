# White Line email automation

## What is automated

The database queues idempotent transactional messages for:

- talent application received, approved and rejected
- new client request, quotation, confirmation, completion and cancellation
- deposit received and payment received in full
- talent payout paid, failed, held, unclaimed and returned
- internal notifications for new talent and client submissions

The queue is visible in **White Line Admin → Emails**. Failed messages use exponential retry delays and stop after five attempts unless an administrator manually retries them.

## Provider

The Edge Function uses Resend through its HTTPS API. The sender must use a domain verified in Resend. Recommended sender:

`White Line Entertainment <bookings@thegreishow.com>`

Replies can continue going to `thegreishow@gmail.com` until a dedicated mailbox is created.

## Required Supabase secrets

Set these Edge Function secrets:

- `RESEND_API_KEY`
- `WLE_FROM_EMAIL` — for example `bookings@thegreishow.com`
- `WLE_FROM_NAME` — `White Line Entertainment`
- `WLE_REPLY_TO` — `thegreishow@gmail.com`
- `EMAIL_CRON_SECRET` — a long random value used only by the scheduler

Supabase already provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions.

## Deployment

1. Apply these migrations in order:
   - `20260720_add_email_automation.sql`
   - `20260720_add_email_dispatch_claim.sql`
   - `20260720_harden_email_automation_permissions.sql`
2. Deploy `process-whiteline-email-queue` with JWT verification enabled.
3. Verify `thegreishow.com` or a sending subdomain in Resend and add the DNS records it provides.
4. Add the required Edge Function secrets.
5. Schedule a POST request every minute to:
   - `https://<project-ref>.supabase.co/functions/v1/process-whiteline-email-queue`
   - header: `x-cron-secret: <EMAIL_CRON_SECRET>`
   - JSON body: `{ "limit": 50 }`
6. Until scheduling is enabled, use **Admin → Emails → Process queue**.

## Controlled launch test

1. Submit one talent application using an email address you control.
2. Confirm two outbox rows: applicant receipt and internal admin alert.
3. Process the queue and verify both messages arrive.
4. Approve the application and verify the approval email.
5. Submit one client request and move it through quoted and confirmed.
6. Test one small real or controlled payment and verify payment receipt email.
7. Confirm provider message IDs appear in the admin delivery log.
8. Force one invalid recipient address, confirm retry behavior, then correct and manually retry it.

## Safety

- Event keys prevent duplicate queue entries for the same lifecycle event.
- Queue rows are claimed with `FOR UPDATE SKIP LOCKED` to prevent parallel duplicate sends.
- The service-role key is never exposed to the browser.
- Admin RLS protects delivery history and manual retries.
- Trigger helper functions are not callable by anonymous or authenticated API users.
- No marketing email is sent from this system; it is transactional only.
