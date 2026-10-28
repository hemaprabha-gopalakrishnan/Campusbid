begin;
select plan(8);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.listings'::regclass),
  'listing rows use RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.listing_images'::regclass),
  'listing image metadata uses RLS'
);
select ok(
  has_table_privilege('authenticated', 'public.listings', 'insert'),
  'authenticated users can create listings subject to policy'
);
select ok(
  not has_table_privilege('authenticated', 'public.listings', 'delete'),
  'clients cannot delete listing history'
);
select ok(
  not has_table_privilege('authenticated', 'public.bids', 'insert'),
  'clients cannot insert arbitrary bids'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname = 'Owners edit eligible listings'
  ),
  'listing edits require owner and no bids'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload photos into their own folder'
  ),
  'Storage writes are scoped to the authenticated user folder'
);
select ok(
  not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'listings'
  ),
  'listings are not published to Realtime'
);

select * from finish();
rollback;