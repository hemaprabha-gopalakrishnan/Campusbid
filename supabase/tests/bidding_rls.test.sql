begin;
select plan(8);

select ok(
  not has_table_privilege('anon', 'public.bids', 'insert,update,delete'),
  'anonymous clients cannot write bids directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.bids', 'insert,update,delete'),
  'authenticated clients cannot write or rewrite bid history directly'
);
select ok(
  has_function_privilege('authenticated', 'public.place_bid(uuid,bigint)', 'execute'),
  'authenticated users can invoke the transactional bid function'
);
select ok(
  not has_function_privilege('anon', 'public.place_bid(uuid,bigint)', 'execute'),
  'anonymous users cannot place bids'
);
select ok(
  has_function_privilege('anon', 'public.close_expired_auction(uuid)', 'execute'),
  'expired auctions can be closed from public listing requests'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.place_bid(uuid,bigint)'::regprocedure),
  'bid function runs with trusted database privileges'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.close_expired_auction(uuid)'::regprocedure),
  'close function runs with trusted database privileges'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.place_bid(uuid,bigint)'::regprocedure),
  'bid function pins an empty search path'
);

select * from finish();
rollback;