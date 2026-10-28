insert into public.profiles (id, display_name)
select
  u.id,
  case
    when char_length(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), '')) between 2 and 50
      then btrim(u.raw_user_meta_data ->> 'display_name')
    else 'Campus student'
  end
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.private_profiles (id, campus_identifier)
select
  u.id,
  case
    when char_length(nullif(btrim(u.raw_user_meta_data ->> 'campus_identifier'), '')) between 2 and 80
      then btrim(u.raw_user_meta_data ->> 'campus_identifier')
    else 'not-verified'
  end
from auth.users u
left join public.private_profiles pp on pp.id = u.id
where pp.id is null
on conflict (id) do nothing;