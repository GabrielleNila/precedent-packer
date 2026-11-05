-- Precedent Pack: core schema, row level security and matter functions.
--
-- Every table carries firm_id. RLS limits every row to members of the
-- signed-in user's firm. Child rows (parties, solicitors, chronology,
-- document history) take their firm_id from their matter via a trigger, so
-- the client can never place a row in another firm.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('admin', 'member');
create type public.matter_status as enum ('active', 'closed');
create type public.claim_type as enum (
  'debt', 'breach_of_contract', 'defective_goods', 'renovation_dispute',
  'tenancy', 'defamation', 'other'
);
create type public.party_side as enum ('client', 'opposing');
create type public.party_kind as enum ('individual', 'company');
create type public.template_source as enum ('builtin', 'uploaded');
create type public.template_category as enum ('letter', 'court');
create type public.audit_event as enum (
  'login', 'logout', 'matter_deleted', 'member_invited', 'member_updated',
  'settings_changed', 'template_uploaded'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  uen text,
  address text,
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  full_name text not null,
  initials text not null,
  email text not null,
  phone text,
  role public.member_role not null default 'member',
  is_solicitor boolean not null default false,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);
create index members_firm_idx on public.members (firm_id);

create table public.firm_settings (
  firm_id uuid primary key references public.firms (id) on delete cascade,
  ref_pattern text not null default 'AW/[solicitor]/[staff]/[number]/[year]',
  letter_format jsonb not null default jsonb_build_object(
    'pageSize', 'A4', 'font', 'Times New Roman', 'fontSizePt', 12,
    'lineSpacing', 1.5, 'justified', true),
  court_format jsonb not null default jsonb_build_object(
    'pageSize', 'A4', 'font', 'Times New Roman', 'fontSizePt', 12,
    'lineSpacing', 1.5, 'justified', true),
  money_in_words boolean not null default false,
  letterhead_path text,
  signature_defaults jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.matters (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  name text not null,
  our_ref text,
  their_ref text,
  solicitor_id uuid references public.members (user_id) on delete set null,
  staff_id uuid references public.members (user_id) on delete set null,
  date_opened date not null default current_date,
  status public.matter_status not null default 'active',
  claim_type public.claim_type,
  claim_type_other text,
  principal_sum numeric(14, 2) check (principal_sum is null or principal_sum >= 0),
  interest_rate numeric(6, 3) check (interest_rate is null or interest_rate >= 0),
  interest_start_date date,
  costs_claimed numeric(14, 2) check (costs_claimed is null or costs_claimed >= 0),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index matters_firm_idx on public.matters (firm_id, status, updated_at desc);

create table public.opposing_solicitors (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  position int not null default 0,
  firm_name text not null,
  address text,
  reference text,
  solicitor_name text,
  email text
);
create index opposing_solicitors_matter_idx on public.opposing_solicitors (matter_id);

create table public.matter_parties (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  side public.party_side not null,
  kind public.party_kind not null,
  position int not null default 0,
  name text not null,
  id_number text,          -- NRIC/FIN for individuals, UEN for companies
  address text,
  email text,
  contact_person text,     -- companies only
  solicitor_id uuid references public.opposing_solicitors (id) on delete set null
);
create index matter_parties_matter_idx on public.matter_parties (matter_id);

create table public.chronology_events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  position int not null default 0,
  event_date date,
  description text not null,
  supporting_document text
);
create index chronology_events_matter_idx on public.chronology_events (matter_id);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  key text not null,
  name text not null,
  source public.template_source not null,
  category public.template_category not null,
  storage_path text,
  version int not null default 1,
  placeholders_known text[] not null default '{}',
  placeholders_unknown text[] not null default '{}',
  active boolean not null default true,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (firm_id, key, version)
);

-- Metadata only: never the file, its name or its contents.
create table public.document_history (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  matter_id uuid not null references public.matters (id) on delete cascade,
  template_key text not null,
  template_version int not null default 1,
  generated_by uuid references auth.users (id) on delete set null,
  generated_at timestamptz not null default now()
);
create index document_history_matter_idx on public.document_history (matter_id, generated_at desc);

-- Never holds client data: details carries ids and counts only.
create table public.audit_log (
  id bigint generated always as identity primary key,
  firm_id uuid references public.firms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event public.audit_event not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_firm_idx on public.audit_log (firm_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies can call them without
-- recursing into members' own RLS)
-- ---------------------------------------------------------------------------
create function public.current_firm_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.firm_id from public.members m
  where m.user_id = auth.uid() and m.active
$$;

create function public.is_firm_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid() and m.active and m.role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.set_matter_firm()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.firm_id := public.current_firm_id();
    new.created_by := auth.uid();
  else
    new.firm_id := old.firm_id;   -- a matter can never move firm
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger matters_set_firm before insert or update on public.matters
for each row execute function public.set_matter_firm();

create function public.set_child_firm()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  select m.firm_id into new.firm_id from public.matters m where m.id = new.matter_id;
  return new;
end $$;

create trigger opposing_solicitors_set_firm before insert or update on public.opposing_solicitors
for each row execute function public.set_child_firm();
create trigger matter_parties_set_firm before insert or update on public.matter_parties
for each row execute function public.set_child_firm();
create trigger chronology_events_set_firm before insert or update on public.chronology_events
for each row execute function public.set_child_firm();
create trigger document_history_set_firm before insert or update on public.document_history
for each row execute function public.set_child_firm();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.firms enable row level security;
alter table public.members enable row level security;
alter table public.firm_settings enable row level security;
alter table public.matters enable row level security;
alter table public.opposing_solicitors enable row level security;
alter table public.matter_parties enable row level security;
alter table public.chronology_events enable row level security;
alter table public.templates enable row level security;
alter table public.document_history enable row level security;
alter table public.audit_log enable row level security;

-- Nothing is readable without signing in.
revoke all on all tables in schema public from anon;

create policy "firm members read their firm" on public.firms
  for select to authenticated using (id = (select public.current_firm_id()));
create policy "admins update their firm" on public.firms
  for update to authenticated
  using (id = (select public.current_firm_id()) and (select public.is_firm_admin()))
  with check (id = (select public.current_firm_id()));

-- Members: everyone in the firm can see colleagues (to pick the solicitor in
-- charge). Only admins change roles; invites run server-side.
create policy "firm members read members" on public.members
  for select to authenticated using (firm_id = (select public.current_firm_id()));
create policy "admins update members" on public.members
  for update to authenticated
  using (firm_id = (select public.current_firm_id()) and (select public.is_firm_admin()))
  with check (firm_id = (select public.current_firm_id()));

create policy "firm members read settings" on public.firm_settings
  for select to authenticated using (firm_id = (select public.current_firm_id()));
create policy "admins update settings" on public.firm_settings
  for update to authenticated
  using (firm_id = (select public.current_firm_id()) and (select public.is_firm_admin()))
  with check (firm_id = (select public.current_firm_id()));

create policy "firm members read matters" on public.matters
  for select to authenticated using (firm_id = (select public.current_firm_id()));
create policy "firm members create matters" on public.matters
  for insert to authenticated with check (firm_id = (select public.current_firm_id()));
create policy "firm members update matters" on public.matters
  for update to authenticated
  using (firm_id = (select public.current_firm_id()))
  with check (firm_id = (select public.current_firm_id()));
-- Deletion goes through delete_matter(), which checks admin and logs it.

-- Child tables: full access for firm members, scoped to their firm.
create policy "firm members manage opposing solicitors" on public.opposing_solicitors
  for all to authenticated
  using (firm_id = (select public.current_firm_id()))
  with check (firm_id = (select public.current_firm_id()));
create policy "firm members manage parties" on public.matter_parties
  for all to authenticated
  using (firm_id = (select public.current_firm_id()))
  with check (firm_id = (select public.current_firm_id()));
create policy "firm members manage chronology" on public.chronology_events
  for all to authenticated
  using (firm_id = (select public.current_firm_id()))
  with check (firm_id = (select public.current_firm_id()));

create policy "firm members read templates" on public.templates
  for select to authenticated using (firm_id = (select public.current_firm_id()));
create policy "admins manage templates" on public.templates
  for all to authenticated
  using (firm_id = (select public.current_firm_id()) and (select public.is_firm_admin()))
  with check (firm_id = (select public.current_firm_id()) and (select public.is_firm_admin()));

create policy "firm members read document history" on public.document_history
  for select to authenticated using (firm_id = (select public.current_firm_id()));
create policy "firm members record their own documents" on public.document_history
  for insert to authenticated
  with check (firm_id = (select public.current_firm_id()) and generated_by = (select auth.uid()));

create policy "admins read audit log" on public.audit_log
  for select to authenticated
  using (firm_id = (select public.current_firm_id()) and (select public.is_firm_admin()));
create policy "users log their own sign-in and sign-out" on public.audit_log
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and firm_id = (select public.current_firm_id())
    and event in ('login', 'logout')
  );

-- ---------------------------------------------------------------------------
-- Matter list view (security_invoker: the caller's RLS applies)
-- ---------------------------------------------------------------------------
create view public.matter_list with (security_invoker = true) as
select
  m.id, m.name, m.our_ref, m.their_ref, m.status, m.claim_type,
  m.date_opened, m.updated_at, m.solicitor_id,
  coalesce(string_agg(p.name, ', ' order by p.side, p.position)
           filter (where p.side = 'client'), '') as client_names,
  coalesce(string_agg(p.name, ', ' order by p.side, p.position)
           filter (where p.side = 'opposing'), '') as opposing_names,
  lower(concat_ws(' ', m.name, m.our_ref, m.their_ref, string_agg(p.name, ' '))) as search_text
from public.matters m
left join public.matter_parties p on p.matter_id = m.id
group by m.id;

revoke all on public.matter_list from anon;
grant select on public.matter_list to authenticated;

-- ---------------------------------------------------------------------------
-- save_matter: saves the whole Matter Profile in one transaction.
-- security invoker, so every statement is checked by RLS.
-- Rejects the save if someone else changed the matter since it was loaded.
-- ---------------------------------------------------------------------------
create function public.save_matter(p jsonb)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_expected timestamptz := nullif(p->>'expected_updated_at', '')::timestamptz;
  v_current timestamptz;
  r jsonb;
  i int;
begin
  if public.current_firm_id() is null then
    raise exception 'Not a member of any firm' using errcode = '42501';
  end if;

  if v_id is null then
    insert into public.matters (
      name, our_ref, their_ref, solicitor_id, staff_id, date_opened, status,
      claim_type, claim_type_other, principal_sum, interest_rate,
      interest_start_date, costs_claimed, notes, firm_id)
    values (
      p->>'name', nullif(p->>'our_ref', ''), nullif(p->>'their_ref', ''),
      nullif(p->>'solicitor_id', '')::uuid, nullif(p->>'staff_id', '')::uuid,
      coalesce(nullif(p->>'date_opened', '')::date, current_date),
      coalesce(nullif(p->>'status', ''), 'active')::public.matter_status,
      nullif(p->>'claim_type', '')::public.claim_type, nullif(p->>'claim_type_other', ''),
      nullif(p->>'principal_sum', '')::numeric, nullif(p->>'interest_rate', '')::numeric,
      nullif(p->>'interest_start_date', '')::date, nullif(p->>'costs_claimed', '')::numeric,
      nullif(p->>'notes', ''), public.current_firm_id())
    returning id into v_id;
  else
    select updated_at into v_current from public.matters where id = v_id for update;
    if not found then
      raise exception 'Matter not found' using errcode = 'P0002';
    end if;
    if v_expected is not null and v_current > v_expected then
      raise exception 'This matter was changed by someone else since you opened it. Reload to see their changes.'
        using errcode = '40001';
    end if;
    update public.matters set
      name = p->>'name',
      our_ref = nullif(p->>'our_ref', ''),
      their_ref = nullif(p->>'their_ref', ''),
      solicitor_id = nullif(p->>'solicitor_id', '')::uuid,
      staff_id = nullif(p->>'staff_id', '')::uuid,
      date_opened = coalesce(nullif(p->>'date_opened', '')::date, date_opened),
      status = coalesce(nullif(p->>'status', ''), 'active')::public.matter_status,
      claim_type = nullif(p->>'claim_type', '')::public.claim_type,
      claim_type_other = nullif(p->>'claim_type_other', ''),
      principal_sum = nullif(p->>'principal_sum', '')::numeric,
      interest_rate = nullif(p->>'interest_rate', '')::numeric,
      interest_start_date = nullif(p->>'interest_start_date', '')::date,
      costs_claimed = nullif(p->>'costs_claimed', '')::numeric,
      notes = nullif(p->>'notes', '')
    where id = v_id;
  end if;

  -- Replace child rows. Ids come from the client so links between parties
  -- and solicitors survive the save.
  delete from public.matter_parties where matter_id = v_id;
  delete from public.opposing_solicitors where matter_id = v_id;
  delete from public.chronology_events where matter_id = v_id;

  i := 0;
  for r in select * from jsonb_array_elements(coalesce(p->'solicitors', '[]'::jsonb)) loop
    insert into public.opposing_solicitors (id, matter_id, firm_id, position, firm_name,
      address, reference, solicitor_name, email)
    values (coalesce(nullif(r->>'id', '')::uuid, gen_random_uuid()), v_id,
      public.current_firm_id(), i, r->>'firm_name', nullif(r->>'address', ''),
      nullif(r->>'reference', ''), nullif(r->>'solicitor_name', ''), nullif(r->>'email', ''));
    i := i + 1;
  end loop;

  i := 0;
  for r in select * from jsonb_array_elements(coalesce(p->'parties', '[]'::jsonb)) loop
    insert into public.matter_parties (id, matter_id, firm_id, side, kind, position, name,
      id_number, address, email, contact_person, solicitor_id)
    values (coalesce(nullif(r->>'id', '')::uuid, gen_random_uuid()), v_id,
      public.current_firm_id(), (r->>'side')::public.party_side,
      (r->>'kind')::public.party_kind, i, r->>'name',
      nullif(upper(trim(r->>'id_number')), ''), nullif(r->>'address', ''),
      nullif(r->>'email', ''), nullif(r->>'contact_person', ''),
      nullif(r->>'solicitor_id', '')::uuid);
    i := i + 1;
  end loop;

  i := 0;
  for r in select * from jsonb_array_elements(coalesce(p->'chronology', '[]'::jsonb)) loop
    insert into public.chronology_events (id, matter_id, firm_id, position, event_date,
      description, supporting_document)
    values (coalesce(nullif(r->>'id', '')::uuid, gen_random_uuid()), v_id,
      public.current_firm_id(), i, nullif(r->>'event_date', '')::date,
      r->>'description', nullif(r->>'supporting_document', ''));
    i := i + 1;
  end loop;

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- duplicate_matter: copies the clients (and optionally the opposing side)
-- into a new active matter. Claim details, chronology and notes stay behind.
-- ---------------------------------------------------------------------------
create function public.duplicate_matter(source_id uuid, include_opposing boolean default false)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_new uuid;
  v_src public.matters%rowtype;
  s record;
  v_map jsonb := '{}'::jsonb;
  v_sol uuid;
begin
  select * into v_src from public.matters where id = source_id;
  if not found then
    raise exception 'Matter not found' using errcode = 'P0002';
  end if;

  insert into public.matters (name, solicitor_id, staff_id, firm_id)
  values (v_src.name || ' (copy)', v_src.solicitor_id, v_src.staff_id, public.current_firm_id())
  returning id into v_new;

  if include_opposing then
    for s in select * from public.opposing_solicitors where matter_id = source_id order by position loop
      insert into public.opposing_solicitors (matter_id, firm_id, position, firm_name, address,
        reference, solicitor_name, email)
      values (v_new, public.current_firm_id(), s.position, s.firm_name, s.address, null,
        s.solicitor_name, s.email)
      returning id into v_sol;
      v_map := v_map || jsonb_build_object(s.id::text, v_sol);
    end loop;
  end if;

  insert into public.matter_parties (matter_id, firm_id, side, kind, position, name, id_number,
    address, email, contact_person, solicitor_id)
  select v_new, public.current_firm_id(), p.side, p.kind, p.position, p.name, p.id_number,
    p.address, p.email, p.contact_person,
    case when p.solicitor_id is null then null else (v_map->>p.solicitor_id::text)::uuid end
  from public.matter_parties p
  where p.matter_id = source_id and (p.side = 'client' or include_opposing);

  return v_new;
end $$;

-- ---------------------------------------------------------------------------
-- delete_matter: admin only, requires the matter name typed exactly.
-- Removes the matter and (by cascade) its parties, solicitors, chronology and
-- document history. Logs the deletion without any of the matter's content.
-- ---------------------------------------------------------------------------
create function public.delete_matter(target_id uuid, confirm_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_firm uuid := public.current_firm_id();
  v_name text;
  v_counts jsonb;
begin
  if not public.is_firm_admin() then
    raise exception 'Only an admin can delete a matter' using errcode = '42501';
  end if;

  select name into v_name from public.matters where id = target_id and firm_id = v_firm;
  if not found then
    raise exception 'Matter not found' using errcode = 'P0002';
  end if;
  if confirm_name is distinct from v_name then
    raise exception 'The name typed does not match the matter name' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'parties', (select count(*) from public.matter_parties where matter_id = target_id),
    'solicitors', (select count(*) from public.opposing_solicitors where matter_id = target_id),
    'chronology', (select count(*) from public.chronology_events where matter_id = target_id),
    'documents', (select count(*) from public.document_history where matter_id = target_id)
  ) into v_counts;

  delete from public.matters where id = target_id;

  insert into public.audit_log (firm_id, user_id, event, details)
  values (v_firm, auth.uid(), 'matter_deleted',
          jsonb_build_object('matter_id', target_id, 'rows_removed', v_counts));
end $$;

-- ---------------------------------------------------------------------------
-- mark_password_changed: a user clears their own first-login flag after
-- replacing the temporary password an admin gave them.
-- ---------------------------------------------------------------------------
create function public.mark_password_changed()
returns void
language sql security definer set search_path = ''
as $$
  update public.members set must_change_password = false where user_id = auth.uid()
$$;
revoke execute on function public.mark_password_changed() from public, anon;
grant execute on function public.mark_password_changed() to authenticated;

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------
revoke execute on function public.save_matter(jsonb) from public, anon;
revoke execute on function public.duplicate_matter(uuid, boolean) from public, anon;
revoke execute on function public.delete_matter(uuid, text) from public, anon;
revoke execute on function public.current_firm_id() from public, anon;
revoke execute on function public.is_firm_admin() from public, anon;
grant execute on function public.save_matter(jsonb) to authenticated;
grant execute on function public.duplicate_matter(uuid, boolean) to authenticated;
grant execute on function public.delete_matter(uuid, text) to authenticated;
grant execute on function public.current_firm_id() to authenticated;
grant execute on function public.is_firm_admin() to authenticated;

-- Trigger functions are not callable directly.
revoke execute on function public.set_matter_firm() from public, anon, authenticated;
revoke execute on function public.set_child_firm() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- New firms get default settings.
-- ---------------------------------------------------------------------------
create function public.create_firm_settings()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.firm_settings (firm_id) values (new.id);
  return new;
end $$;
revoke execute on function public.create_firm_settings() from public, anon, authenticated;

create trigger firms_create_settings after insert on public.firms
for each row execute function public.create_firm_settings();
