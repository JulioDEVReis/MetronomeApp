-- Run by hand in the Supabase SQL editor (this is a shared project with
-- other apps — check the Table Editor first to make sure `entitlements`
-- doesn't already exist for a different purpose).

create table if not exists public.entitlements (
  user_id            uuid not null references auth.users(id) on delete cascade,
  app                text not null,
  is_pro             boolean not null default false,
  purchased_at       timestamptz,
  stripe_session_id  text,
  stripe_customer_id text,
  updated_at         timestamptz not null default now(),
  primary key (user_id, app)
);

alter table public.entitlements enable row level security;

create policy "select own entitlement"
  on public.entitlements for select
  using (auth.uid() = user_id);

-- Deliberately no insert/update/delete policy for anon/authenticated.
-- With RLS enabled and zero permissive write policies, all client writes
-- are denied by default. Only the service_role key (used exclusively
-- inside api/stripe-webhook.ts) can write — service_role bypasses RLS
-- entirely by Supabase's design. This is what actually prevents a user
-- from unlocking PRO by editing localStorage or calling the client SDK.
