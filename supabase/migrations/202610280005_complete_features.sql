-- Migration 202610280005_complete_features.sql

-- 1. Notifications constraint update for alerts and Q&A
alter table public.notifications drop constraint if exists notifications_event_type_check;
alter table public.notifications add constraint notifications_event_type_check check (
  event_type in (
    'new_bid', 'outbid', 'auction_extended', 'auction_ended',
    'seller_approved', 'seller_rejected', 'reservation_updated',
    'handover_updated', 'sale_completed', 'sale_failed',
    'item_alert', 'question_asked', 'question_answered'
  )
);

-- 2. Public Q&A access
grant select on public.questions to anon, authenticated;
drop policy if exists "Authenticated users read listing questions" on public.questions;
drop policy if exists "Anyone can read listing questions" on public.questions;
create policy "Anyone can read listing questions"
on public.questions for select to anon, authenticated
using (true);

-- 3. Automatic Bidding Table
create table if not exists public.auto_bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  max_amount_paise bigint not null check (max_amount_paise > 0 and max_amount_paise <= 9999999900),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, bidder_id)
);

create index if not exists auto_bids_listing_idx on public.auto_bids (listing_id, max_amount_paise desc);

alter table public.auto_bids enable row level security;
revoke all on public.auto_bids from anon, authenticated;
grant select on public.auto_bids to anon, authenticated;
grant insert, update, delete on public.auto_bids to authenticated;

drop policy if exists "Auto bids are publicly readable" on public.auto_bids;
create policy "Auto bids are publicly readable"
on public.auto_bids for select to anon, authenticated
using (true);

drop policy if exists "Users manage their own auto bids" on public.auto_bids;
create policy "Users manage their own auto bids"
on public.auto_bids for all to authenticated
using (bidder_id = (select auth.uid()))
with check (bidder_id = (select auth.uid()));

-- 4. Wanted Alerts Table ("Never miss what you need")
create table if not exists public.wanted_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  category text check (category is null or category in ('cycle', 'calculator', 'books', 'electronics', 'other')),
  max_price_paise bigint not null check (max_price_paise > 0 and max_price_paise <= 9999999900),
  created_at timestamptz not null default now()
);

create index if not exists wanted_alerts_user_idx on public.wanted_alerts (user_id, created_at desc);

alter table public.wanted_alerts enable row level security;
revoke all on public.wanted_alerts from anon, authenticated;
grant select, insert, delete on public.wanted_alerts to authenticated;

drop policy if exists "Users manage their own wanted alerts" on public.wanted_alerts;
create policy "Users manage their own wanted alerts"
on public.wanted_alerts for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- 5. Sale Status Management RPCs
create or replace function public.approve_winning_sale(p_listing_id uuid)
returns public.sale_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;

  select * into v_sale
  from public.sales
  where listing_id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'sale_not_found';
  end if;

  if v_sale.seller_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'seller_authorization_required';
  end if;

  if v_sale.status <> 'awaiting_seller_approval' then
    raise exception using errcode = 'P0001', message = 'invalid_sale_status';
  end if;

  update public.sales
  set status = 'reserved', updated_at = now()
  where listing_id = p_listing_id;

  update public.listings
  set status = 'reserved', updated_at = now()
  where id = p_listing_id;

  insert into public.notifications (user_id, event_type, listing_id, message)
  values (
    v_sale.winner_id,
    'seller_approved',
    p_listing_id,
    'Your winning bid was approved! Item is reserved for campus handover.'
  );

  return 'reserved';
end;
$$;

revoke all on function public.approve_winning_sale(uuid) from public;
grant execute on function public.approve_winning_sale(uuid) to authenticated;

create or replace function public.reject_winning_sale(p_listing_id uuid)
returns public.sale_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;

  select * into v_sale
  from public.sales
  where listing_id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'sale_not_found';
  end if;

  if v_sale.seller_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'seller_authorization_required';
  end if;

  if v_sale.status <> 'awaiting_seller_approval' then
    raise exception using errcode = 'P0001', message = 'invalid_sale_status';
  end if;

  update public.sales
  set status = 'rejected', updated_at = now()
  where listing_id = p_listing_id;

  update public.listings
  set status = 'rejected', updated_at = now()
  where id = p_listing_id;

  insert into public.notifications (user_id, event_type, listing_id, message)
  values (
    v_sale.winner_id,
    'seller_rejected',
    p_listing_id,
    'The seller rejected the winning price. The auction sale has ended.'
  );

  return 'rejected';
end;
$$;

revoke all on function public.reject_winning_sale(uuid) from public;
grant execute on function public.reject_winning_sale(uuid) to authenticated;

create or replace function public.confirm_handover(p_listing_id uuid)
returns table (
  status public.sale_status,
  seller_confirmed boolean,
  buyer_confirmed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales%rowtype;
  v_seller_conf timestamptz;
  v_buyer_conf timestamptz;
  v_new_status public.sale_status;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;

  select * into v_sale
  from public.sales
  where listing_id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'sale_not_found';
  end if;

  if v_sale.seller_id <> v_user_id and v_sale.winner_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'unauthorized';
  end if;

  if v_sale.status <> 'reserved' then
    raise exception using errcode = 'P0001', message = 'invalid_sale_status';
  end if;

  v_seller_conf := v_sale.seller_handover_confirmed_at;
  v_buyer_conf := v_sale.buyer_handover_confirmed_at;

  if v_user_id = v_sale.seller_id then
    v_seller_conf := coalesce(v_seller_conf, clock_timestamp());
  else
    v_buyer_conf := coalesce(v_buyer_conf, clock_timestamp());
  end if;

  if v_seller_conf is not null and v_buyer_conf is not null then
    v_new_status := 'completed';
    update public.listings set status = 'completed', updated_at = now() where id = p_listing_id;

    insert into public.notifications (user_id, event_type, listing_id, message)
    values
      (v_sale.seller_id, 'sale_completed', p_listing_id, 'Campus handover confirmed by both parties! Sale is completed.'),
      (v_sale.winner_id, 'sale_completed', p_listing_id, 'Campus handover confirmed by both parties! Sale is completed.');
  else
    v_new_status := 'reserved';
    if v_user_id = v_sale.seller_id then
      insert into public.notifications (user_id, event_type, listing_id, message)
      values (v_sale.winner_id, 'handover_updated', p_listing_id, 'The seller confirmed campus handover. Please confirm your receipt to complete the sale.');
    else
      insert into public.notifications (user_id, event_type, listing_id, message)
      values (v_sale.seller_id, 'handover_updated', p_listing_id, 'The buyer confirmed campus handover. Please confirm your delivery to complete the sale.');
    end if;
  end if;

  update public.sales
  set
    seller_handover_confirmed_at = v_seller_conf,
    buyer_handover_confirmed_at = v_buyer_conf,
    status = v_new_status,
    updated_at = now()
  where listing_id = p_listing_id;

  return query
  select v_new_status, (v_seller_conf is not null), (v_buyer_conf is not null);
end;
$$;

revoke all on function public.confirm_handover(uuid) from public;
grant execute on function public.confirm_handover(uuid) to authenticated;

create or replace function public.report_failed_pickup(p_listing_id uuid)
returns public.sale_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;

  select * into v_sale
  from public.sales
  where listing_id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'sale_not_found';
  end if;

  if v_sale.seller_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'seller_authorization_required';
  end if;

  if v_sale.status <> 'reserved' then
    raise exception using errcode = 'P0001', message = 'invalid_sale_status';
  end if;

  update public.sales
  set status = 'failed', updated_at = now()
  where listing_id = p_listing_id;

  update public.listings
  set status = 'failed', updated_at = now()
  where id = p_listing_id;

  insert into public.notifications (user_id, event_type, listing_id, message)
  values
    (v_sale.winner_id, 'sale_failed', p_listing_id, 'Campus handover could not be completed. The sale has been marked failed.'),
    (v_sale.seller_id, 'sale_failed', p_listing_id, 'Sale marked failed. You may list the item again.');

  return 'failed';
end;
$$;

revoke all on function public.report_failed_pickup(uuid) from public;
grant execute on function public.report_failed_pickup(uuid) to authenticated;

-- 6. Automatic Proxy Bidding Function
create or replace function public.place_auto_bid(p_listing_id uuid, p_max_amount_paise bigint)
returns table (
  bid_id uuid,
  listing_id uuid,
  bidder_id uuid,
  current_amount_paise bigint,
  max_amount_paise bigint,
  ends_at timestamptz,
  extended boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_now timestamptz;
  v_current_amount bigint;
  v_current_leader uuid;
  v_minimum_amount bigint;
  v_bid_id uuid;
  v_ends_at timestamptz;
  v_extended boolean := false;
  v_competing_auto public.auto_bids%rowtype;
  v_effective_bid bigint;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;

  if p_listing_id is null or p_max_amount_paise is null or p_max_amount_paise <= 0 then
    raise exception using errcode = 'P0001', message = 'invalid_bid';
  end if;

  if p_max_amount_paise > 9999999900 then
    raise exception using errcode = 'P0001', message = 'bid_amount_too_large';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'listing_not_found';
  end if;

  v_now := clock_timestamp();

  if v_listing.status <> 'active' or v_listing.ends_at <= v_now then
    raise exception using errcode = 'P0001', message = 'auction_closed';
  end if;

  if v_listing.seller_id = v_user_id then
    raise exception using errcode = 'P0001', message = 'seller_cannot_bid';
  end if;

  -- Get current leading bid
  select b.amount_paise, b.bidder_id
  into v_current_amount, v_current_leader
  from public.bids b
  where b.listing_id = p_listing_id
  order by b.amount_paise desc, b.created_at asc, b.id asc
  limit 1;

  if not found then
    v_minimum_amount := v_listing.starting_price_paise;
  else
    v_minimum_amount := v_current_amount + v_listing.min_increment_paise;
  end if;

  if p_max_amount_paise < v_minimum_amount then
    raise exception using errcode = 'P0001', message = 'bid_below_minimum';
  end if;

  -- Upsert caller's auto-bid
  insert into public.auto_bids (listing_id, bidder_id, max_amount_paise, updated_at)
  values (p_listing_id, v_user_id, p_max_amount_paise, v_now)
  on conflict (listing_id, bidder_id)
  do update set max_amount_paise = excluded.max_amount_paise, updated_at = excluded.updated_at;

  -- Check competing auto-bids from other bidders
  select * into v_competing_auto
  from public.auto_bids
  where listing_id = p_listing_id and bidder_id <> v_user_id
  order by max_amount_paise desc, created_at asc
  limit 1;

  if not found then
    -- No competition: bid only the minimum needed
    v_effective_bid := v_minimum_amount;
    insert into public.bids (listing_id, bidder_id, amount_paise, created_at)
    values (p_listing_id, v_user_id, v_effective_bid, v_now)
    returning id into v_bid_id;
  else
    -- Competition exists!
    if p_max_amount_paise > v_competing_auto.max_amount_paise then
      -- New bidder wins against competing max
      -- Place competing auto-bid up to its max if needed
      if v_current_amount is null or v_current_amount < v_competing_auto.max_amount_paise then
        insert into public.bids (listing_id, bidder_id, amount_paise, created_at)
        values (p_listing_id, v_competing_auto.bidder_id, v_competing_auto.max_amount_paise, v_now);
      end if;

      v_effective_bid := least(p_max_amount_paise, v_competing_auto.max_amount_paise + v_listing.min_increment_paise);
      insert into public.bids (listing_id, bidder_id, amount_paise, created_at)
      values (p_listing_id, v_user_id, v_effective_bid, v_now + interval '1 millisecond')
      returning id into v_bid_id;
    else
      -- Competing auto-bidder stays leader
      -- Place caller's bid at their max
      insert into public.bids (listing_id, bidder_id, amount_paise, created_at)
      values (p_listing_id, v_user_id, p_max_amount_paise, v_now)
      returning id into v_bid_id;

      -- Counter-bid by competing auto-bidder
      v_effective_bid := least(v_competing_auto.max_amount_paise, p_max_amount_paise + v_listing.min_increment_paise);
      insert into public.bids (listing_id, bidder_id, amount_paise, created_at)
      values (p_listing_id, v_competing_auto.bidder_id, v_effective_bid, v_now + interval '1 millisecond');
    end if;
  end if;

  -- Anti-sniping extension check
  v_ends_at := v_listing.ends_at;
  if v_listing.ends_at <= v_now + interval '30 seconds' then
    v_ends_at := v_now + interval '60 seconds';
    v_extended := true;
    update public.listings
    set ends_at = v_ends_at
    where id = p_listing_id;
  end if;

  -- Notifications
  insert into public.notifications (user_id, event_type, listing_id, message)
  values (
    v_listing.seller_id,
    'new_bid',
    p_listing_id,
    'A new bid was placed on your listing.'
  );

  if v_current_leader is not null and v_current_leader <> v_user_id then
    insert into public.notifications (user_id, event_type, listing_id, message)
    values (
      v_current_leader,
      'outbid',
      p_listing_id,
      'You have been outbid on a campus listing.'
    );
  end if;

  if v_extended then
    insert into public.notifications (user_id, event_type, listing_id, message)
    values (
      v_user_id,
      'auction_extended',
      p_listing_id,
      'The auction closing time was extended after a late bid.'
    );
  end if;

  return query
  select v_bid_id, p_listing_id, v_user_id, v_effective_bid, p_max_amount_paise, v_ends_at, v_extended;
end;
$$;

revoke all on function public.place_auto_bid(uuid, bigint) from public;
grant execute on function public.place_auto_bid(uuid, bigint) to authenticated;

-- 7. Add auto_bids and questions to Realtime publication
do $$
declare
  t_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t_name in array array['auto_bids', 'questions'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = t_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t_name);
      end if;
    end loop;
  end if;
end;
$$;
