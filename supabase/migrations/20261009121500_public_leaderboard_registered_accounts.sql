create or replace view public.public_leaderboard
with (security_invoker = false)
as
select
  p.id as user_id,
  coalesce(nullif(btrim(p.name), ''), 'Trader') as name,
  (
    coalesce(a.cash, 100000::numeric)
    + coalesce(sum(coalesce(h.qty, 0) * coalesce(q.price, 0)), 0)
  )::numeric as value,
  p.created_at
from public.profiles p
left join public.paper_accounts a on a.user_id = p.id
left join public.paper_holdings h on h.user_id = p.id
left join public.paper_quotes q on q.ticker = h.ticker
group by p.id, p.name, p.created_at, a.cash;

revoke all on public.public_leaderboard from public;
grant select on public.public_leaderboard to anon, authenticated;
