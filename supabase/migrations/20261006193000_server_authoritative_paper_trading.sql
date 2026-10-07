-- Server-authoritative paper trading state.
-- Signed-in users no longer trust localStorage for cash, holdings or trade history.

create table if not exists public.paper_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash numeric(20,2) not null default 100000 check (cash >= 0 and cash <= 1000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_holdings (
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null check (ticker ~ '^[A-Z0-9]{1,8}$'),
  qty bigint not null check (qty > 0 and qty <= 1000000000),
  avg_price numeric(20,6) not null check (avg_price >= 0 and avg_price <= 1000000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, ticker)
);

create table if not exists public.paper_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null check (ticker ~ '^[A-Z0-9]{1,8}$'),
  side text not null check (side in ('buy','sell')),
  qty bigint not null check (qty > 0 and qty <= 1000000),
  price numeric(20,6) not null check (price > 0 and price <= 1000000000),
  created_at timestamptz not null default now()
);

create table if not exists public.paper_quotes (
  ticker text primary key check (ticker ~ '^[A-Z0-9]{1,8}$'),
  price numeric(20,6) not null check (price > 0 and price <= 1000000000),
  updated_at timestamptz not null default now()
);

insert into public.paper_quotes (ticker, price) values
  ('NXQ', 38.61), ('HLX', 12.84), ('SOLR', 13.61), ('ARCB', 15.25),
  ('VTRX', 18.28), ('ORBT', 6.68), ('LUMA', 8.87), ('CYPH', 26.37),
  ('AQUA', 17.64), ('FUSN', 4.19), ('MDNA', 25.43), ('KRNL', 61.13),
  ('PLTX', 18.16), ('NOVA', 6.47)
on conflict (ticker) do nothing;

insert into public.paper_accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.paper_accounts enable row level security;
alter table public.paper_holdings enable row level security;
alter table public.paper_transactions enable row level security;
alter table public.paper_quotes enable row level security;

revoke all on table public.paper_accounts from anon, authenticated;
revoke all on table public.paper_holdings from anon, authenticated;
revoke all on table public.paper_transactions from anon, authenticated;
revoke all on table public.paper_quotes from anon, authenticated;

grant select on table public.paper_accounts to authenticated;
grant select on table public.paper_holdings to authenticated;
grant select on table public.paper_transactions to authenticated;
grant select on table public.paper_quotes to anon, authenticated;
grant all on table public.paper_accounts to service_role;
grant all on table public.paper_holdings to service_role;
grant all on table public.paper_transactions to service_role;
grant all on table public.paper_quotes to service_role;

drop policy if exists "own paper account read" on public.paper_accounts;
create policy "own paper account read"
  on public.paper_accounts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own paper holdings read" on public.paper_holdings;
create policy "own paper holdings read"
  on public.paper_holdings for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own paper transactions read" on public.paper_transactions;
create policy "own paper transactions read"
  on public.paper_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "public paper quotes read" on public.paper_quotes;
create policy "public paper quotes read"
  on public.paper_quotes for select to anon, authenticated
  using (true);

create index if not exists paper_holdings_user_id_idx on public.paper_holdings(user_id);
create index if not exists paper_transactions_user_time_idx on public.paper_transactions(user_id, created_at desc);

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke all on function private.has_role(uuid, public.app_role) from public, anon;
grant execute on function private.has_role(uuid, public.app_role) to authenticated;

drop policy if exists "admin updates settings" on public.market_settings;
create policy "admin updates settings"
  on public.market_settings for update to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (private.has_role((select auth.uid()), 'admin'::public.app_role));

revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;

create or replace function public.execute_paper_trade(
  p_ticker text,
  p_side text,
  p_qty integer,
  p_client_price numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_price numeric(20,6);
  v_cash numeric(20,2);
  v_qty bigint := p_qty;
  v_old_qty bigint := 0;
  v_old_avg numeric(20,6) := 0;
  v_total numeric(30,6);
  v_new_qty bigint;
  v_new_avg numeric(20,6);
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_ticker is null or p_ticker !~ '^[A-Z0-9]{1,8}$' then raise exception 'INVALID_TICKER'; end if;
  if p_side not in ('buy','sell') then raise exception 'INVALID_SIDE'; end if;
  if p_qty is null or p_qty <= 0 or p_qty > 1000000 then raise exception 'INVALID_QUANTITY'; end if;

  select price into v_price
  from public.paper_quotes
  where ticker = p_ticker
  for update;

  if v_price is null then raise exception 'UNKNOWN_TICKER'; end if;

  select cash into v_cash from public.paper_accounts
  where user_id = v_user
  for update;

  if v_cash is null then
    insert into public.paper_accounts(user_id) values (v_user)
    on conflict (user_id) do nothing;
    select cash into v_cash from public.paper_accounts where user_id = v_user for update;
  end if;

  select qty, avg_price into v_old_qty, v_old_avg
  from public.paper_holdings
  where user_id = v_user and ticker = p_ticker
  for update;

  v_total := v_price * v_qty;

  if p_side = 'buy' then
    if v_total > v_cash then raise exception 'INSUFFICIENT_CASH'; end if;
    v_new_qty := v_old_qty + v_qty;
    v_new_avg := ((v_old_avg * v_old_qty) + v_total) / v_new_qty;
    update public.paper_accounts set cash = v_cash - v_total, updated_at = now() where user_id = v_user;
    insert into public.paper_holdings(user_id,ticker,qty,avg_price,updated_at)
      values(v_user,p_ticker,v_new_qty,v_new_avg,now())
    on conflict(user_id,ticker) do update set qty=excluded.qty, avg_price=excluded.avg_price, updated_at=now();
  else
    if v_old_qty < v_qty then raise exception 'INSUFFICIENT_POSITION'; end if;
    v_new_qty := v_old_qty - v_qty;
    update public.paper_accounts set cash = v_cash + v_total, updated_at = now() where user_id = v_user;
    if v_new_qty = 0 then
      delete from public.paper_holdings where user_id=v_user and ticker=p_ticker;
    else
      update public.paper_holdings set qty=v_new_qty, updated_at=now() where user_id=v_user and ticker=p_ticker;
    end if;
  end if;

  insert into public.paper_transactions(user_id,ticker,side,qty,price)
    values(v_user,p_ticker,p_side,v_qty,v_price);

  return jsonb_build_object(
    'ticker', p_ticker,
    'side', p_side,
    'qty', v_qty,
    'price', v_price,
    'total', v_total,
    'cash', case when p_side='buy' then v_cash-v_total else v_cash+v_total end,
    'executed_at', now()
  );
end;
$$;

revoke all on function public.execute_paper_trade(text,text,integer,numeric) from public, anon;
grant execute on function public.execute_paper_trade(text,text,integer,numeric) to authenticated;

create or replace function public.reset_paper_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.paper_accounts set cash=100000, updated_at=now() where user_id=v_user;
  if not found then insert into public.paper_accounts(user_id) values(v_user); end if;
  delete from public.paper_holdings where user_id=v_user;
  delete from public.paper_transactions where user_id=v_user;
end;
$$;

revoke all on function public.reset_paper_account() from public, anon;
grant execute on function public.reset_paper_account() to authenticated;

create or replace function public.admin_set_paper_cash(p_user_id uuid, p_cash numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.has_role((select auth.uid()), 'admin'::public.app_role) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_cash is null or p_cash < 0 or p_cash > 1000000000000 then raise exception 'INVALID_CASH'; end if;
  update public.paper_accounts set cash=p_cash, updated_at=now() where user_id=p_user_id;
  if not found then insert into public.paper_accounts(user_id,cash) values(p_user_id,p_cash); end if;
end;
$$;

revoke all on function public.admin_set_paper_cash(uuid,numeric) from public, anon;
grant execute on function public.admin_set_paper_cash(uuid,numeric) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, name)
    values (
      new.id,
      left(coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)), 32)
    ) on conflict do nothing;
    insert into public.paper_accounts (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
