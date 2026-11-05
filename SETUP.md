# Setting up Precedent Pack

These steps take about 20 minutes. Some are already done for you; they're marked **✓ Done**.

What you'll need open: the [Supabase dashboard](https://supabase.com/dashboard), the [Vercel dashboard](https://vercel.com/dashboard) and [GitHub](https://github.com/GabrielleNila/precedent-packer).

---

## 1. GitHub repository: ✓ Done

The code lives at **github.com/GabrielleNila/precedent-packer**. The `main` branch is what's live. Each phase arrives as a **pull request** (a proposed change) that you can try out on its own preview link before merging.

## 2. Supabase project: ✓ Created (two steps for you)

A project called **precedent-pack** exists in the **AW law** organisation, in the **Singapore** region.

### 2a. Create the database tables

Run each file in `supabase/migrations/`, **in order**, once each:

| Order | File | Added in |
|---|---|---|
| 1 | [`20261105000001_core_schema.sql`](supabase/migrations/20261105000001_core_schema.sql) | Phase 1 |
| 2 | [`20261105000002_letters.sql`](supabase/migrations/20261105000002_letters.sql) | Phase 2 |

For each one:

1. Open the Supabase dashboard and click the **precedent-pack** project.
2. In the left sidebar, click **SQL Editor**, then **New query**.
3. On GitHub, open the file, click the **Copy raw file** button (two overlapping squares, top right of the file), and paste it into the SQL editor.
4. Click **Run**. You should see *"Success. No rows returned."*

> Each later phase that changes the database adds one more numbered file here. Run only the new one.

### 2b. Turn off public sign-ups

1. In the left sidebar click **Authentication**, then **Sign In / Providers** (under Configuration).
2. Turn **off** *"Allow new users to sign up"*, then click **Save**.

This means only admins can create accounts, from the app's Team page.

## 3. Make yourself the first admin

1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Enter your work email and a strong password. Tick **Auto Confirm User**. Click **Create user**.
3. Go back to **SQL Editor → New query**. Paste the contents of [`supabase/bootstrap_first_admin.sql`](supabase/bootstrap_first_admin.sql).
4. Change `you@awlaw.com.sg` to the email you just used, and check your name and initials.
5. Click **Run**. The last result should show one row with `role = admin`.

## 4. Connect Vercel and add the secret key

The Vercel project **precedent-pack** is linked to the GitHub repo, and the two public settings (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) are already filled in. **✓ Done**

You add one secret yourself, so it never passes through chat or GitHub:

1. In Supabase: **Project Settings** (gear icon) → **API Keys** → **Secret keys** section. If there isn't one, click **Add new secret key**, name it `vercel`. Click the copy icon next to the key (it starts with `sb_secret_`).
2. In Vercel: open the **precedent-pack** project → **Settings** → **Environment Variables**.
3. Add:
   - **Key:** `SUPABASE_SECRET_KEY`
   - **Value:** paste the key
   - **Environments:** tick **Production** and **Preview**
   - Tick **Sensitive**
4. Click **Save**.
5. Go to **Deployments**, click the **⋯** next to the latest deployment, then **Redeploy**, so it picks up the new key.

> The secret key can create accounts and bypasses the database's security rules. Never paste it into chat, email, a GitHub file or anything starting with `NEXT_PUBLIC_`. If it ever leaks, delete it in Supabase (API Keys) and create a new one.

## 5. Run it on your own computer (optional, for development)

You need **Node.js 22 or newer**. Check by opening Terminal (Mac) or PowerShell (Windows) and running:

```bash
node -v
```

If it says `v22…` or higher you're fine. Otherwise install the **LTS** version from [nodejs.org](https://nodejs.org).

Then, one line at a time:

```bash
git clone https://github.com/GabrielleNila/precedent-packer.git
cd precedent-packer
npm install
cp .env.example .env.local
```

(On Windows PowerShell use `copy .env.example .env.local` for the last line.)

Open `.env.local` in any text editor and fill in the three values. The URL and publishable key are in Supabase under **Project Settings → API Keys**; the secret key is the same one from step 4. Save the file, then:

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. Press `Ctrl + C` in the terminal to stop it.

`.env.local` is listed in `.gitignore`, so git will never upload it.

## How updates reach the live site

1. Each phase is pushed to its own branch, and a **pull request** is opened on GitHub.
2. Vercel builds a **preview** for that pull request automatically. The link appears in the pull request.
3. You test on the preview. When you're happy, click **Merge pull request** on GitHub.
4. Vercel deploys `main` to the live site within a minute or two.
