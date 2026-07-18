# White Line Supabase Setup

The website code is already connected for Supabase. Complete these steps once to activate it.

## 1. Create the project

Create a Supabase project named `white-line-entertainment` or similar.

## 2. Install the schema

In the Supabase dashboard:

1. Open **SQL Editor**.
2. Create a new query.
3. Copy the complete contents of `supabase/whiteline-schema.sql`.
4. Run it.

This creates:

- `talent_profiles`
- `casting_calls`
- `talent_applications`
- `client_requests`
- indexes
- Row Level Security policies

Public visitors can read only approved talent and open casting calls. They can create applications and booking requests but cannot read private submissions.

## 3. Connect the website

Open **Project Settings → API** in Supabase and copy:

- Project URL
- anon/public key

Paste them into:

`assets/js/whiteline-supabase-config.js`

```js
window.WHITE_LINE_SUPABASE = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_ANON_PUBLIC_KEY"
};
```

Never paste the `service_role` key into the website.

## 4. Test submissions

Open `whiteline.html` on the live website.

- Submit a test talent application.
- Submit a test client request.
- Confirm the records appear in Supabase Table Editor.

## 5. Publish talent

Add a row to `talent_profiles` and set:

- a unique `slug`
- `professional_name`
- `disciplines`
- `bio`
- `status` to `approved`

Only records with `status = approved` appear publicly.

## 6. Publish casting calls

Add a row to `casting_calls` and set:

- a unique `slug`
- title and project details
- `status` to `open`
- a current or future deadline

Closed or expired calls are hidden automatically.

## Security model

- The browser contains only the public anon key.
- Private application tables have no public SELECT policy.
- Visitors cannot update or delete records.
- Admin work is performed inside the authenticated Supabase dashboard until a custom White Line admin dashboard is added.
