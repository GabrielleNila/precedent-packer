\set ON_ERROR_STOP on
-- Fake firms and users (obviously fake).
insert into public.firms (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Sample Firm A LLC'),
  ('00000000-0000-0000-0000-00000000000b', 'Sample Firm B LLC');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'member.a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'nobody@example.test');
insert into public.members (user_id, firm_id, full_name, initials, email, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Admin A', 'AA', 'admin.a@example.test', 'admin'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Member A', 'MA', 'member.a@example.test', 'member'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Admin B', 'AB', 'admin.b@example.test', 'admin');

select 'settings rows auto-created: ' || count(*) from public.firm_settings;

-- As Member A: create a matter via save_matter.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
select public.save_matter('{
  "name": "Sample Client v Sample Debtor",
  "our_ref": "AW/XX/yy/0001/2026",
  "claim_type": "debt", "principal_sum": "12345.67",
  "solicitors": [{"id": "10000000-0000-0000-0000-000000000001", "firm_name": "Example Opposing LLP"}],
  "parties": [
    {"side": "client", "kind": "company", "name": "Sample Client Pte. Ltd.", "id_number": "000000000x"},
    {"side": "opposing", "kind": "individual", "name": "Test Debtor", "id_number": "s0000001a",
     "solicitor_id": "10000000-0000-0000-0000-000000000001"}
  ],
  "chronology": [
    {"event_date": "2026-01-02", "description": "Second event"},
    {"event_date": "2026-01-01", "description": "First event"}
  ]
}'::jsonb) as new_matter_id \gset
select set_config('test.mid', :'new_matter_id', false);

select name, our_ref, principal_sum, created_by is not null as has_creator from public.matters;
select side, name, id_number, solicitor_id is not null as linked from public.matter_parties order by side;
select position, description from public.chronology_events order by position;
select client_names, opposing_names from public.matter_list;

-- Member cannot delete.
do $$ begin
  perform public.delete_matter((select id from public.matters limit 1), 'Sample Client v Sample Debtor');
  raise exception 'FAIL: member was able to delete';
exception when insufficient_privilege then raise notice 'OK: member cannot delete';
end $$;

-- Member cannot write admin-only events to the audit log.
do $$ begin
  insert into public.audit_log (firm_id, user_id, event) values
    (public.current_firm_id(), auth.uid(), 'matter_deleted');
  raise exception 'FAIL: member forged an audit event';
exception when insufficient_privilege then raise notice 'OK: audit forgery blocked';
end $$;
insert into public.audit_log (firm_id, user_id, event)
  values (public.current_firm_id(), auth.uid(), 'login');

-- Stale save is rejected.
do $$ begin
  perform public.save_matter(jsonb_build_object(
    'id', (select id from public.matters limit 1), 'name', 'x',
    'expected_updated_at', '2000-01-01T00:00:00Z'));
  raise exception 'FAIL: stale save accepted';
exception when serialization_failure then raise notice 'OK: stale save rejected';
end $$;

-- Duplicate (clients only) and duplicate with opposing.
select public.duplicate_matter(:'new_matter_id'::uuid, false) as dup1 \gset
select public.duplicate_matter(:'new_matter_id'::uuid, true) as dup2 \gset
select m.name, count(p.*) as parties,
  count(p.*) filter (where p.solicitor_id is not null) as linked
from public.matters m left join public.matter_parties p on p.matter_id = m.id
group by m.name, m.created_at order by m.created_at;

-- As Admin B (another firm): sees nothing, cannot write into firm A.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
select 'firm B sees matters: ' || count(*) from public.matters;
select 'firm B sees parties: ' || count(*) from public.matter_parties;
select 'firm B sees matter_list: ' || count(*) from public.matter_list;
select 'firm B sees members: ' || count(*) from public.members;
do $$ begin
  insert into public.matter_parties (matter_id, side, kind, name, firm_id)
  values ((select '00000000-0000-0000-0000-000000000000'::uuid), 'client', 'individual', 'x',
          '00000000-0000-0000-0000-00000000000a');
  raise exception 'FAIL: cross-firm insert';
exception when others then raise notice 'OK: cross-firm insert blocked (%)', sqlstate;
end $$;
do $$ begin
  perform public.delete_matter(current_setting('test.mid')::uuid, 'Sample Client v Sample Debtor');
  raise exception 'FAIL: cross-firm delete';
exception when others then raise notice 'OK: cross-firm delete blocked (%)', sqlerrm;
end $$;
update public.matters set name = 'hijack';

-- As a signed-in user with no firm: nothing.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
select 'no-firm user sees matters: ' || count(*) from public.matters;
do $$ begin
  perform public.save_matter('{"name": "x"}'::jsonb);
  raise exception 'FAIL: no-firm user saved';
exception when insufficient_privilege then raise notice 'OK: no-firm user cannot save';
end $$;

-- As anon: nothing at all.
reset role;
set role anon;
do $$ begin
  perform count(*) from public.matters;
  raise exception 'FAIL: anon read matters';
exception when insufficient_privilege then raise notice 'OK: anon blocked';
end $$;

-- As Admin A: wrong confirmation fails, right one deletes with cascade.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select 'names after firm B hijack attempt: ' || string_agg(name, ' | ') from public.matters;
do $$ begin
  perform public.delete_matter((select id from public.matters where name = 'Sample Client v Sample Debtor'), 'wrong');
  raise exception 'FAIL: wrong name accepted';
exception when invalid_parameter_value then raise notice 'OK: wrong confirmation rejected';
end $$;
select public.delete_matter(:'new_matter_id'::uuid, 'Sample Client v Sample Debtor');
select 'remaining matters: ' || count(*) from public.matters;
select 'orphan parties: ' || count(*) from public.matter_parties where matter_id = :'new_matter_id'::uuid;
select 'orphan chronology: ' || count(*) from public.chronology_events where matter_id = :'new_matter_id'::uuid;
select event, details from public.audit_log order by id;
