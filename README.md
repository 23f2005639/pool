# BizzNNovate 2026 — Team Company Voting Site

Mobile-friendly static website with all 26 companies and their branding from the official company dossier. Members pick their first name (or choose Other), rank **1–10 companies**, and submit a vote. Everyone sees an aggregated ranking. Ballots persist across phones when connected to Supabase.

**This is not an official BizzNNovate voting platform.** It is a private team preference poll.

## Deploy to Vercel (about 10 minutes)

### 1) Create a free Supabase project

Visit https://supabase.com and create a project. In your project:

1. Go to **Authentication → Providers → Anonymous Sign-Ins** and enable anonymous sign-ins. (The exact dashboard section name may vary.)
2. Go to **SQL Editor**. Paste all content of `supabase.sql` and run it once.
3. Find **Project URL** and **Publishable key** (or **anon key**) under Project Settings / API / Connect.
4. Open `config.js` and replace the two placeholders with the project URL and publishable/anon key.

**Important:** Use only the public **publishable / anon** key. NEVER paste the `service_role` key, database password, or secret API key into a public website or this config file. Row-level security policies protect who can edit ballots. Anyone with the site and API key can read votes, so don't use for sensitive polls.

### 2) Upload to Vercel

Option A (easy): unzip the project, upload it to a GitHub repository, then go to https://vercel.com/new → Import Project → select the repository → Framework preset **Other** → deploy. The project is plain HTML, CSS and JS; no build command is required.

Option B: install `vercel` CLI and run `vercel --prod` from the project folder, following the login/project prompts.

Share the deployed link with your team. Everyone opens the same link, chooses their name, ranks companies, and submits.

### 3) Check that shared voting works

On your phone, choose a first name, select a few companies and press **Submit my vote**. On a second phone/computer, open **Results** and check that the number of ballots increased. Results auto-refresh approximately every 30 seconds, or you can press Refresh.

## Voting rules used by the site

- 12 name options: **Shreyas, Shantanu, Paranjay, Jeet, Govind, Rahul, Ruaplee, Srishti, Moksha, Arya, Rajnandini, Jalaj**. Jayesh is not included. All predefined names are first names only.
- You can choose **Other — type a name** if yours is missing.
- Rank **1 to 10** unique companies; fewer than 10 is allowed.
- A company ranked #1 receives 10 points, #2 gets 9, ..., #10 gets 1. The Results page also shows how many ballots include each company and how many #1 votes it received.
- One ballot per name. Once someone claims a name, other browser identities cannot overwrite it. A voter can edit from the **same browser/session**.
- If someone loses their browser session or claimed the wrong name, an administrator must fix that ballot through the Supabase Table Editor or SQL Editor. There is deliberately no public 'delete anyone' button.

## Files

- `index.html` — page layout
- `styles.css` — responsive presentation
- `app.js` — filters, ranked voting, results, Supabase synchronization
- `companies.js` — all 26 names, descriptions and quick MBA/MCA ideas
- `assets/` — the 26 company *dossier header images* (many include original logos; some brands have only a textual name/wordmark in the supplied dossier)
- `config.js` — project URL + public API key
- `supabase.sql` — database table and row-level security policies
- `vercel.json` — static hosting settings

## Notes / limitations

- This is a **lightweight class poll, not identity-verified voting**. The first person to use a name claims it, so share the link only with teammates. Anonymous sign-ins and custom names can be abused by someone deliberately submitting additional votes.
- No email, password, or full name is collected. Supabase creates an anonymous account ID in the browser; clearing browser site data may lose edit access.
- The site needs internet connectivity for real cross-device votes. Without configuring `config.js`, company browsing still works but voting is disabled and clearly labeled **Preview mode**.
- 'Likely popular' and 'May be overlooked' labels are qualitative estimates from earlier research, **not guaranteed auction behavior or measured bid data**.
- Do not delete the Supabase table while your poll is live.
