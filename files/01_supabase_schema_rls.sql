-- InvestIQ Supabase schema + Row Level Security
-- Run this first in the Supabase SQL editor.
--
-- Supabase projects already provide the database and the auth schema. This
-- script creates the public app tables and attaches them to auth.users.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  app_user_id text unique not null,
  version text not null default '1.0',
  name text not null,
  age integer not null check (age >= 0),
  occupation text not null,
  location text not null,
  currency text not null default 'USD' check (currency = 'USD'),
  financial_context jsonb not null default '{}'::jsonb,
  risk_profile jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  extensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  external_goal_id text not null,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount >= 0),
  current_progress numeric(14, 2) not null default 0 check (current_progress >= 0),
  target_date date not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  flexibility text not null check (flexibility in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_goal_id)
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  external_portfolio_id text not null,
  version text not null default '1.0',
  as_of timestamptz not null,
  currency text not null default 'USD' check (currency = 'USD'),
  summary jsonb not null default '{}'::jsonb,
  allocation jsonb not null default '{}'::jsonb,
  risk_metrics jsonb not null default '{}'::jsonb,
  extensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_portfolio_id)
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  external_holding_id text not null,
  symbol text not null,
  name text not null,
  asset_class text not null check (asset_class in ('equity', 'debt', 'gold', 'cash')),
  subcategory text not null,
  sector text not null,
  quantity numeric(18, 6) not null check (quantity >= 0),
  avg_buy_price numeric(14, 4) not null check (avg_buy_price >= 0),
  current_price numeric(14, 4) not null check (current_price >= 0),
  current_value numeric(14, 2) not null check (current_value >= 0),
  unrealized_pnl numeric(14, 2) not null,
  unrealized_pnl_percent numeric(8, 2) not null,
  weight_in_portfolio numeric(8, 2) not null check (weight_in_portfolio >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, external_holding_id)
);

create table if not exists public.market_contexts (
  id uuid primary key default gen_random_uuid(),
  external_market_context_id text unique not null,
  as_of timestamptz not null,
  market_snapshot jsonb not null default '{}'::jsonb,
  macro_context jsonb not null default '{}'::jsonb,
  extensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_events (
  id uuid primary key default gen_random_uuid(),
  market_context_id uuid not null references public.market_contexts(id) on delete cascade,
  external_event_id text not null,
  headline text not null,
  category text not null,
  impact text not null check (impact in ('negative', 'neutral', 'positive')),
  relevance_to_user text not null check (relevance_to_user in ('low', 'moderate', 'high')),
  plain_summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_context_id, external_event_id)
);

create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists portfolios_user_id_idx on public.portfolios(user_id);
create index if not exists holdings_user_id_idx on public.holdings(user_id);
create index if not exists holdings_portfolio_id_idx on public.holdings(portfolio_id);
create index if not exists holdings_symbol_idx on public.holdings(symbol);
create index if not exists market_events_market_context_id_idx on public.market_events(market_context_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists set_portfolios_updated_at on public.portfolios;
create trigger set_portfolios_updated_at
before update on public.portfolios
for each row execute function public.set_updated_at();

drop trigger if exists set_holdings_updated_at on public.holdings;
create trigger set_holdings_updated_at
before update on public.holdings
for each row execute function public.set_updated_at();

drop trigger if exists set_market_contexts_updated_at on public.market_contexts;
create trigger set_market_contexts_updated_at
before update on public.market_contexts
for each row execute function public.set_updated_at();

drop trigger if exists set_market_events_updated_at on public.market_events;
create trigger set_market_events_updated_at
before update on public.market_events
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.market_contexts enable row level security;
alter table public.market_events enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
on public.profiles for delete
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can read own goals" on public.goals;
create policy "Users can read own goals"
on public.goals for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals"
on public.goals for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals"
on public.goals for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals"
on public.goals for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own portfolios" on public.portfolios;
create policy "Users can read own portfolios"
on public.portfolios for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own portfolios" on public.portfolios;
create policy "Users can insert own portfolios"
on public.portfolios for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own portfolios" on public.portfolios;
create policy "Users can update own portfolios"
on public.portfolios for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own portfolios" on public.portfolios;
create policy "Users can delete own portfolios"
on public.portfolios for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own holdings" on public.holdings;
create policy "Users can read own holdings"
on public.holdings for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own holdings" on public.holdings;
create policy "Users can insert own holdings"
on public.holdings for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.portfolios
    where portfolios.id = holdings.portfolio_id
      and portfolios.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own holdings" on public.holdings;
create policy "Users can update own holdings"
on public.holdings for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.portfolios
    where portfolios.id = holdings.portfolio_id
      and portfolios.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own holdings" on public.holdings;
create policy "Users can delete own holdings"
on public.holdings for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read market contexts" on public.market_contexts;
create policy "Authenticated users can read market contexts"
on public.market_contexts for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read market events" on public.market_events;
create policy "Authenticated users can read market events"
on public.market_events for select
to authenticated
using (true);
