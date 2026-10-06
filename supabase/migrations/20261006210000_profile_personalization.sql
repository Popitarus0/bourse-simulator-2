-- Profile personalization: persisted trader identity + glass UI preferences.
alter table public.profiles
  add column if not exists title text not null default 'Market Explorer',
  add column if not exists avatar_style text not null default 'orb',
  add column if not exists accent text not null default 'blue',
  add column if not exists banner text not null default 'aurora',
  add column if not exists status text not null default 'Actif';

alter table public.profiles
  drop constraint if exists profiles_title_length,
  drop constraint if exists profiles_avatar_style_allowed,
  drop constraint if exists profiles_accent_allowed,
  drop constraint if exists profiles_banner_allowed,
  drop constraint if exists profiles_status_length,
  drop constraint if exists profiles_status_allowed;

alter table public.profiles
  add constraint profiles_title_length check (char_length(title) between 1 and 40),
  add constraint profiles_avatar_style_allowed check (avatar_style in ('orb','grid','mono','rings')),
  add constraint profiles_accent_allowed check (accent in ('blue','violet','cyan','green','gold')),
  add constraint profiles_banner_allowed check (banner in ('aurora','midnight','sunset','ice')),
  add constraint profiles_status_length check (char_length(status) between 1 and 24),
  add constraint profiles_status_allowed check (status in ('Actif','En observation','En pause'));

-- Keep the existing owner-only profile write policy; no new public write access is granted.
