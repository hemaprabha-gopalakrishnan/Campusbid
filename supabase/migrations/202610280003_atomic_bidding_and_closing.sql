create function public.place_bid(p_listing_id uuid, p_amount_paise bigint)
returns table (
  bid_id uuid,
  listing_id uuid,
  bidder_id uuid,
  amount_paise bigint,
  accepted_at timestamptz,
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
  v_previous_bidder uuid;
  v_minimum_amount bigint;
  v_bid_id uuid;
  v_ends_at timestamptz;
  v_extended boolean := false;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;

  if p_listing_id is null or p_amount_paise is null or p_amount_paise <= 0 then
    raise exception using errcode = 'P0001', message = 'invalid_bid';
  end if;

  if p_amount_paise > 9999999900 then
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

  select b.amount_paise, b.bidder_id
  into v_current_amount, v_previous_bidder
  from public.bids b
  where b.listing_id = p_listing_id
  order by b.amount_paise desc, b.created_at asc, b.id asc
  limit 1;

  if not found then
    v_minimum_amount := v_listing.starting_price_paise;
  else
    if v_current_amount > 9223372036854775807 - v_listing.min_increment_paise then
      raise exception using errcode = 'P0001', message = 'bid_amount_too_large';
    end if;
    v_minimum_amount := v_current_amount + v_listing.min_increment_paise;
  end if;

  if p_amount_paise < v_minimum_amount then
    raise exception using errcode = 'P0001', message = 'bid_below_minimum';
  end if;

  insert into public.bids (listing_id, bidder_id, amount_paise, created_at)
  values (p_listing_id, v_user_id, p_amount_paise, v_now)
  returning id into v_bid_id;

  v_ends_at := v_listing.ends_at;
  if v_listing.ends_at <= v_now + interval '30 seconds' then
    v_ends_at := v_now + interval '60 seconds';
    v_extended := true;
    update public.listings
    set ends_at = v_ends_at
    where id = p_listing_id;
  end if;

  insert into public.notifications (user_id, event_type, listing_id, message)
  values (
    v_listing.seller_id,
    'new_bid',
    p_listing_id,
    'A new bid was placed on your listing.'
  );

  if v_previous_bidder is not null and v_previous_bidder <> v_user_id then
    insert into public.notifications (user_id, event_type, listing_id, message)
    values (
      v_previous_bidder,
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
  select v_bid_id, p_listing_id, v_user_id, p_amount_paise, v_now, v_ends_at, v_extended;
end;
$$;

revoke all on function public.place_bid(uuid, bigint) from public, anon, authenticated;
grant execute on function public.place_bid(uuid, bigint) to authenticated;

create function public.close_expired_auction(p_listing_id uuid)
returns public.listing_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.listings%rowtype;
  v_winner_id uuid;
  v_winning_amount bigint;
  v_now timestamptz;
  v_next_status public.listing_status;
begin
  if p_listing_id is null then
    raise exception using errcode = 'P0001', message = 'listing_not_found';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'listing_not_found';
  end if;

  if v_listing.status <> 'active' then
    return v_listing.status;
  end if;

  v_now := clock_timestamp();
  if v_listing.ends_at > v_now then
    return 'active';
  end if;

  select b.bidder_id, b.amount_paise
  into v_winner_id, v_winning_amount
  from public.bids b
  where b.listing_id = p_listing_id
  order by b.amount_paise desc, b.created_at asc, b.id asc
  limit 1;

  if v_winner_id is null then
    v_next_status := 'unsold';
    update public.listings
    set status = v_next_status
    where id = p_listing_id;

    insert into public.notifications (user_id, event_type, listing_id, message)
    values (
      v_listing.seller_id,
      'auction_ended',
      p_listing_id,
      'Your auction ended without bids. You can list the item again.'
    );
  else
    v_next_status := 'awaiting_seller_approval';

    insert into public.sales (listing_id, seller_id, winner_id, winning_amount_paise, status)
    values (p_listing_id, v_listing.seller_id, v_winner_id, v_winning_amount, 'awaiting_seller_approval')
    on conflict (listing_id) do nothing;

    update public.listings
    set status = v_next_status
    where id = p_listing_id;

    insert into public.notifications (user_id, event_type, listing_id, message)
    values
      (v_listing.seller_id, 'auction_ended', p_listing_id, 'Your auction ended. Review the provisional winning price.'),
      (v_winner_id, 'auction_ended', p_listing_id, 'You are the provisional winner. The seller must review the winning price.');
  end if;

  return v_next_status;
end;
$$;

revoke all on function public.close_expired_auction(uuid) from public;
grant execute on function public.close_expired_auction(uuid) to anon, authenticated;

alter table public.bids
  add constraint bids_amount_max check (amount_paise <= 9999999900);