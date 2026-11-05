# Precedent Pack

A document drafting suite for the litigation team. Enter a matter's facts once in its **Matter Profile**; every document template (Warrant to Act, Letters of Demand, Holding Letter, Statement of Claim) pulls from that profile, so names, NRIC/UEN numbers and amounts are never retyped.

Built with Next.js (App Router, TypeScript, Tailwind), Supabase (login and database) and Vercel (hosting).

- **First-time setup:** see [SETUP.md](SETUP.md), written for non-developers with exact steps.
- **Status:** Phase 2 (Letter of Demand and Holding Letter, with document history). Final LOD, Warrant to Act, Statement of Claim and settings arrive in Phases 3–5.

## Where the data lives (for the supervising solicitor)

| What | Where | Notes |
|---|---|---|
| Matter Profiles (parties, NRIC/UEN, addresses, claim details, chronology, notes) | Supabase database, **Singapore region** (AWS ap-southeast-1) | Encrypted at rest. Every table has row level security, so a signed-in user can only see their own firm's matters. Signed-out visitors see nothing. |
| Login accounts | Supabase Auth, same Singapore project | Invite-only: there is no public sign-up. Admins add colleagues from the Team page. |
| Generated Word documents | **Only on the user's own computer** | Built inside the browser and downloaded directly. Never uploaded or stored on a server. |
| Draft options and wording edits | The user's browser tab only (session storage) | Cleared when the tab is closed. Never sent to the server. |
| Document history | Supabase database | Which document, when and by whom. No file, file name or content. |
| Audit log | Supabase database | Sign-ins, sign-outs, matter deletions, team changes. Never contains client details. Readable by admins only. |
| The app's code | GitHub (this repository) | Code and obviously fake sample data only. No client data, ever. |
| Hosting | Vercel, with server functions pinned to Singapore (`sin1`) | Serves the pages. Does not store matter data. |

**Deleting a matter** (admins only, typed confirmation) permanently removes the matter and everything under it: parties, NRIC/UEN numbers, solicitors, chronology, notes and document history. The audit log records that a deletion happened, without any of the matter's details.

**Masking.** NRIC/FIN numbers display as `S****567D` until someone clicks *Reveal*. This prevents shoulder-surfing and screen-share leaks; access control itself is enforced by the database.

## Development

```bash
npm install
cp .env.example .env.local   # then fill in the values (see SETUP.md)
npm run dev                  # http://localhost:3000
npm test                     # formatter unit tests
npm run typecheck
npm run lint
```

The database schema and its security rules are in `supabase/migrations/`. `supabase/tests/rls_test.sql` checks that firms can't see each other's data, that members can't delete matters or forge audit entries, and that stale saves are rejected. It runs against a plain local Postgres using `supabase/tests/supabase_stub.sql`.

## Project layout

```
app/                  pages and server actions
  login/              sign-in
  account/            change password, sign out
  (app)/matters/      matter list, new matter, Matter Profile
  (app)/settings/     team management (admins)
components/           shared UI and the Matter Profile form
lib/                  Supabase clients, auth, data access, formatters, validation
lib/documents/        document model, .docx writer, letterhead, and the templates
supabase/             schema migration, first-admin script, database tests
tests/                unit tests
proxy.ts              refreshes the login session and redirects signed-out visitors
```
