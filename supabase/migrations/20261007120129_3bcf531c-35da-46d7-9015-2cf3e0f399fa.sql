create or replace function public.execute_paper_trade(p_ticker text, p_side text, p_qty integer, p_client_price numeric default null)
returns jsonb language plpgsql security definer set search_path = ''
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
  select price into v_price from public.paper_quotes where ticker = p_ticker for update;
  if v_price is null then raise exception 'UNKNOWN_TICKER'; end if;
  -- Live simulated price: accept the displayed price if it stays within a plausible band.
  if p_client_price is not null and p_client_price > 0 and p_client_price between v_price * 0.5 and v_price * 2 then
    v_price := round(p_client_price, 6);
    update public.paper_quotes set price = v_price, updated_at = now() where ticker = p_ticker;
  end if;
  select cash into v_cash from public.paper_accounts where user_id = v_user for update;
  if v_cash is null then
    insert into public.paper_accounts(user_id) values (v_user) on conflict (user_id) do nothing;
    select cash into v_cash from public.paper_accounts where user_id = v_user for update;
  end if;
  select qty, avg_price into v_old_qty, v_old_avg from public.paper_holdings where user_id = v_user and ticker = p_ticker for update;
  v_old_qty := coalesce(v_old_qty, 0);
  v_old_avg := coalesce(v_old_avg, 0);
  v_total := v_price * v_qty;
  if p_side = 'buy' then
    if v_total > v_cash then raise exception 'INSUFFICIENT_CASH'; end if;
    v_new_qty := v_old_qty + v_qty;
    v_new_avg := ((v_old_avg * v_old_qty) + v_total) / v_new_qty;
    update public.paper_accounts set cash = v_cash - v_total, updated_at = now() where user_id = v_user;
    insert into public.paper_holdings(user_id,ticker,qty,avg_price,updated_at) values(v_user,p_ticker,v_new_qty,v_new_avg,now())
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
  insert into public.paper_transactions(user_id,ticker,side,qty,price) values(v_user,p_ticker,p_side,v_qty,v_price);
  return jsonb_build_object('ticker', p_ticker, 'side', p_side, 'qty', v_qty, 'price', v_price, 'total', v_total,
    'cash', case when p_side='buy' then v_cash-v_total else v_cash+v_total end, 'executed_at', now());
end;
$$;