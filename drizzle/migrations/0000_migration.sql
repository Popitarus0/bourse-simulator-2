create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)), 32))
  on conflict do nothing;
  insert into public.paper_accounts (user_id) values (new.id) on conflict do nothing;
  if new.email_confirmed_at is not null and lower(new.email) = 'claudelisscfj@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end; $$;

insert into public.user_roles(user_id, role)
select id, 'admin' from auth.users where lower(email)='claudelisscfj@gmail.com' and email_confirmed_at is not null
on conflict do nothing;

create or replace function public.admin_list_accounts()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not private.has_role((select auth.uid()), 'admin'::public.app_role) then raise exception 'ADMIN_REQUIRED'; end if;
  return coalesce((select jsonb_agg(row_to_json(t) order by t.created_at) from (
    select u.id, u.email, u.created_at, u.last_sign_in_at, (u.email_confirmed_at is not null) as confirmed,
      coalesce(p.name, split_part(u.email,'@',1)) as name, coalesce(p.title,'') as title,
      coalesce(a.cash, 100000) as cash,
      exists(select 1 from public.user_roles r where r.user_id=u.id and r.role='admin') as is_admin,
      (select count(*) from public.paper_transactions x where x.user_id=u.id) as trades,
      coalesce((select jsonb_agg(jsonb_build_object('ticker',h.ticker,'qty',h.qty,'avg_price',h.avg_price)) from public.paper_holdings h where h.user_id=u.id),'[]'::jsonb) as holdings
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.paper_accounts a on a.user_id=u.id
  ) t), '[]'::jsonb);
end; $$;

create or replace function public.admin_user_transactions(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not private.has_role((select auth.uid()), 'admin'::public.app_role) then raise exception 'ADMIN_REQUIRED'; end if;
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select id, ticker, side, qty, price, created_at from public.paper_transactions
    where user_id=p_user_id order by created_at desc limit 200) t), '[]'::jsonb);
end; $$;

create or replace function public.admin_reset_user(p_user_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not private.has_role((select auth.uid()), 'admin'::public.app_role) then raise exception 'ADMIN_REQUIRED'; end if;
  update public.paper_accounts set cash=100000, updated_at=now() where user_id=p_user_id;
  if not found then insert into public.paper_accounts(user_id) values(p_user_id); end if;
  delete from public.paper_holdings where user_id=p_user_id;
  delete from public.paper_transactions where user_id=p_user_id;
end; $$;

revoke execute on function public.admin_list_accounts() from public, anon;
revoke execute on function public.admin_user_transactions(uuid) from public, anon;
revoke execute on function public.admin_reset_user(uuid) from public, anon;
grant execute on function public.admin_list_accounts() to authenticated;
grant execute on function public.admin_user_transactions(uuid) to authenticated;
grant execute on function public.admin_reset_user(uuid) to authenticated;