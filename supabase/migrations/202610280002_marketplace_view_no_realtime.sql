create view public.marketplace_listings
with (security_invoker = true)
as
select
  l.id,
  l.seller_id,
  p.display_name as seller_name,
  l.title,
  l.category,
  l.description,
  l.condition,
  l.starting_price_paise,
  l.min_increment_paise,
  coalesce(max(b.amount_paise), l.starting_price_paise) as current_price_paise,
  count(b.id)::integer as bid_count,
  l.ends_at,
  l.status,
  l.created_at,
  l.updated_at
from public.listings l
join public.profiles p on p.id = l.seller_id
left join public.bids b on b.listing_id = l.id
group by l.id, p.display_name;

grant select on public.marketplace_listings to anon, authenticated;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['listings', 'bids', 'sales', 'notifications'] loop
      if exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime drop table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;