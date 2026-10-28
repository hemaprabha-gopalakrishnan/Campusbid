create type public.listing_status as enum (
  'active',
  'cancelled',
  'unsold',
  'awaiting_seller_approval',
  'reserved',
  'completed',
  'rejected',
  'failed'
);

create type public.sale_status as enum (
  'awaiting_seller_approval',
  'rejected',
  'reserved',
  'completed',
  'failed'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.private_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  campus_identifier text not null check (char_length(campus_identifier) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles (id),
  title text not null check (char_length(title) between 3 and 100),
  category text not null check (category in ('cycle', 'calculator', 'books', 'electronics', 'other')),
  description text not null check (char_length(description) between 10 and 5000),
  condition text not null check (condition in ('like_new', 'good', 'fair', 'poor')),
  starting_price_paise bigint not null check (starting_price_paise > 0),
  min_increment_paise bigint not null check (min_increment_paise > 0),
  ends_at timestamptz not null check (ends_at > created_at),
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  storage_path text not null unique,
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  bidder_id uuid not null references public.profiles (id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.listings (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  winner_id uuid not null references public.profiles (id) on delete restrict,
  winning_amount_paise bigint not null check (winning_amount_paise > 0),
  status public.sale_status not null,
  seller_handover_confirmed_at timestamptz,
  buyer_handover_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seller_id <> winner_id)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  asker_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2000),
  answer text check (answer is null or char_length(answer) between 1 and 2000),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in (
    'new_bid', 'outbid', 'auction_extended', 'auction_ended',
    'seller_approved', 'seller_rejected', 'reservation_updated',
    'handover_updated', 'sale_completed', 'sale_failed'
  )),
  listing_id uuid references public.listings (id) on delete set null,
  message text not null check (char_length(message) between 1 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.watchlist (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index listings_marketplace_idx on public.listings (status, ends_at, created_at desc);
create index listings_seller_idx on public.listings (seller_id, created_at desc);
create index listing_images_order_idx on public.listing_images (listing_id, position);
create index bids_history_idx on public.bids (listing_id, created_at desc, id desc);
create index bids_bidder_idx on public.bids (bidder_id, created_at desc);
create index sales_seller_idx on public.sales (seller_id, status, created_at desc);
create index sales_winner_idx on public.sales (winner_id, status, created_at desc);
create index questions_listing_idx on public.questions (listing_id, created_at);
create index notifications_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger private_profiles_set_updated_at
before update on public.private_profiles
for each row execute function public.set_updated_at();

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
  requested_campus_id text := nullif(btrim(new.raw_user_meta_data ->> 'campus_identifier'), '');
begin
  if requested_campus_id is null or char_length(requested_campus_id) not between 2 and 80 then
    raise exception 'A valid campus identifier is required';
  end if;

  insert into public.profiles (id, display_name)
  values (
    new.id,
    case
      when char_length(requested_name) between 2 and 50 then requested_name
      else 'Campus student'
    end
  );

  insert into public.private_profiles (id, campus_identifier)
  values (new.id, requested_campus_id);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.bids enable row level security;
alter table public.sales enable row level security;
alter table public.questions enable row level security;
alter table public.notifications enable row level security;
alter table public.watchlist enable row level security;

revoke all on public.profiles, public.private_profiles, public.listings, public.listing_images, public.bids,
  public.sales, public.questions, public.notifications, public.watchlist
from anon, authenticated;

grant select (id, display_name) on public.profiles to anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, update (campus_identifier) on public.private_profiles to authenticated;
grant select on public.listings to anon, authenticated;
grant insert (title, category, description, condition, starting_price_paise, min_increment_paise, ends_at)
  on public.listings to authenticated;
grant update (title, category, description, condition, starting_price_paise, min_increment_paise, ends_at, status)
  on public.listings to authenticated;
grant select on public.listing_images to anon, authenticated;
grant insert (listing_id, storage_path, position), delete on public.listing_images to authenticated;
grant select on public.bids to anon, authenticated;
grant select on public.sales to authenticated;
grant select on public.questions to authenticated;
grant insert (listing_id, asker_id, body) on public.questions to authenticated;
grant update (answer, answered_at) on public.questions to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, delete on public.watchlist to authenticated;

create policy "Public display names are readable"
on public.profiles for select to anon, authenticated
using (true);

create policy "Users update their own display name"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users read their own campus identifier"
on public.private_profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Users update their own campus identifier"
on public.private_profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Active listings are publicly readable"
on public.listings for select to anon, authenticated
using (status = 'active');

create policy "Owners and participants can read listing outcomes"
on public.listings for select to authenticated
using (
  seller_id = (select auth.uid())
  or exists (
    select 1 from public.bids b
    where b.listing_id = listings.id and b.bidder_id = (select auth.uid())
  )
  or exists (
    select 1 from public.sales s
    where s.listing_id = listings.id
      and (s.seller_id = (select auth.uid()) or s.winner_id = (select auth.uid()))
  )
);

create policy "Users create their own active listings"
on public.listings for insert to authenticated
with check (
  seller_id = (select auth.uid())
  and status = 'active'
  and ends_at > now()
);

create policy "Owners edit eligible listings"
on public.listings for update to authenticated
using (
  seller_id = (select auth.uid())
  and status = 'active'
  and ends_at > now()
  and not exists (select 1 from public.bids b where b.listing_id = listings.id)
)
with check (
  seller_id = (select auth.uid())
  and status in ('active', 'cancelled')
  and (status = 'cancelled' or ends_at > now())
);

create policy "Listing images are readable with their listing"
on public.listing_images for select to anon, authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status = 'active' or l.seller_id = (select auth.uid()))
  )
);

create policy "Owners add images before bidding"
on public.listing_images for insert to authenticated
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.seller_id = (select auth.uid())
      and l.status = 'active'
      and l.ends_at > now()
      and not exists (select 1 from public.bids b where b.listing_id = l.id)
  )
  and storage_path like ((select auth.uid())::text || '/%')
);

create policy "Owners remove images before bidding"
on public.listing_images for delete to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.seller_id = (select auth.uid())
      and l.status = 'active'
      and l.ends_at > now()
      and not exists (select 1 from public.bids b where b.listing_id = l.id)
  )
);

create policy "Authenticated users read public bid history"
on public.bids for select to anon, authenticated
using (true);

create policy "Sale participants read their sale"
on public.sales for select to authenticated
using (seller_id = (select auth.uid()) or winner_id = (select auth.uid()));

create policy "Authenticated users read listing questions"
on public.questions for select to authenticated
using (true);

create policy "Users ask questions on active listings"
on public.questions for insert to authenticated
with check (
  asker_id = (select auth.uid())
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.status = 'active'
      and l.ends_at > now()
      and l.seller_id <> (select auth.uid())
  )
);

create policy "Listing sellers answer questions"
on public.questions for update to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.seller_id = (select auth.uid())
  )
)
with check (
  answer is not null
  and answered_at is not null
  and exists (
    select 1 from public.listings l
    where l.id = listing_id and l.seller_id = (select auth.uid())
  )
);

create policy "Users read their own notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users update their own notification read state"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage their own watchlist"
on public.watchlist for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users add to their own watchlist"
on public.watchlist for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users remove from their own watchlist"
on public.watchlist for delete to authenticated
using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Listing photos are publicly readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'listing-images');

create policy "Users upload photos into their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update photos in their own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users delete photos in their own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['listings', 'bids', 'sales', 'notifications'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;