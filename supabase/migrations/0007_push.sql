-- 0007_push.sql
-- Push notification subscriptions and user reminder preferences

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Index on user_id for fast lookup
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

create policy "Users can select own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- Profile reminder fields
alter table public.profiles
  add column if not exists last_reminder_date date,
  add column if not exists weekly_reminder_on boolean default true,
  add column if not exists weekly_reminder_time time default '18:00:00',
  add column if not exists weekly_reminder_day smallint default 0;

-- Backfill from legacy profiles.push_subscription jsonb if present
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
select
  id as user_id,
  (push_subscription->>'endpoint')::text as endpoint,
  (push_subscription->'keys'->>'p256dh')::text as p256dh,
  (push_subscription->'keys'->>'auth')::text as auth,
  now() as created_at
from public.profiles
where push_subscription is not null
  and (push_subscription->>'endpoint') is not null
  and (push_subscription->'keys'->>'p256dh') is not null
  and (push_subscription->'keys'->>'auth') is not null
on conflict (endpoint) do nothing;

-- Deprecate legacy jsonb column (do not drop yet)
comment on column public.profiles.push_subscription is '@deprecated Use public.push_subscriptions table instead';
