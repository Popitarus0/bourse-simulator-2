-- Security hardening for profiles and authorization.
-- This migration intentionally removes the email-based admin bootstrap from the trigger.
-- Admin roles must be granted explicitly in public.user_roles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, name)
    values (
      new.id,
      left(coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)), 32)
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

alter table public.profiles
  drop constraint if exists profiles_name_length,
  drop constraint if exists profiles_bio_length;

alter table public.profiles
  add constraint profiles_name_length check (char_length(name) between 1 and 32),
  add constraint profiles_bio_length check (char_length(bio) between 0 and 160);

alter table public.market_settings
  drop constraint if exists market_settings_speed_range,
  drop constraint if exists market_settings_volatility_range,
  drop constraint if exists market_settings_news_rate_range;

alter table public.market_settings
  add constraint market_settings_speed_range check (speed between 0.1 and 10),
  add constraint market_settings_volatility_range check (volatility between 0 and 10),
  add constraint market_settings_news_rate_range check (news_rate between 0 and 1);

-- Defense in depth: anonymous users can only read public profiles.
-- Writes remain restricted to the authenticated owner's row by the existing RLS policies.
