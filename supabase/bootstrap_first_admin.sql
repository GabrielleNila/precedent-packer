-- Run ONCE in the Supabase SQL editor, after:
--   1. the schema (migrations/20261105000001_core_schema.sql) has been run, and
--   2. you have created your own login under Authentication > Users > Add user.
--
-- Replace the two values marked CHANGE ME, then run. It creates the firm and
-- makes you its first admin. Everyone else is added from the app's Team page.

with firm as (
  insert into public.firms (name, uen, address)
  values ('A.W. Law LLC', '201919619Z', '133 New Bridge Road #20-03 Chinatown Point Singapore 059413')
  returning id
)
insert into public.members (user_id, firm_id, full_name, initials, email, role, is_solicitor, must_change_password)
select u.id, firm.id,
       'Hanzalah bin Azmi',          -- CHANGE ME if needed: your full name
       'HA',                         -- CHANGE ME if needed: your initials
       u.email, 'admin', false, false
from auth.users u, firm
where u.email = 'you@awlaw.com.sg';  -- CHANGE ME: the email you just created

-- Check: this should show one row with role = admin.
select full_name, initials, email, role from public.members;
