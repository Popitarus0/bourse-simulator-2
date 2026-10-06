create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text not null default 'Trader', bio text not null default '', created_at timestamptz not null default now());
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to anon, authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.market_settings (id int primary key default 1 check (id = 1), speed numeric not null default 1, volatility numeric not null default 1, trend numeric not null default 0, news_rate numeric not null default 0.07, paused boolean not null default false, updated_at timestamptz not null default now());
grant select on public.market_settings to anon, authenticated;
grant update on public.market_settings to authenticated;
grant all on public.market_settings to service_role;
alter table public.market_settings enable row level security;
create policy "settings readable" on public.market_settings for select to anon, authenticated using (true);
create policy "admin updates settings" on public.market_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.market_settings (id) values (1);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1))) on conflict do nothing;
  end if;
  if new.email_confirmed_at is not null and lower(new.email) = 'claudelisscfj@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null) execute function public.handle_new_user();