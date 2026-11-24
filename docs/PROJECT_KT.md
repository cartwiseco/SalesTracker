# Cart Wise CRM: project handover (KT)

Read this first. It explains who the app is for, why it exists, every decision made so far, what the app must do, what is built, and how to work with the owner. Last updated: 23 Nov 2026.

Source of truth for exact behaviour: `reference/cart-wise-lead-tracker-v4.html` (a single-file version that is already live and working). When this file and the reference disagree, the reference wins; tell the owner about the difference.

## 1. The business and the user

- **Cart Wise Co** is a one-person business in India. The owner builds new online stores (Shopify, WooCommerce) and fixes, speeds up or redesigns existing stores for D2C brands.
- **The only user is the owner.** This is a personal tool, not a product for other people.
- Currency is INR with Indian number formatting (`₹1,50,000`, `toLocaleString('en-IN')`). Dates display like `23 Nov 26` (`en-IN`, day 2-digit, month short, year 2-digit). Store dates as ISO `YYYY-MM-DD`.
- The owner is comfortable with code but lets the AI write it and approves the actions. They prefer free tools, want it simple and easy, and asked for "something like Salesforce Sales Cloud, but not exactly the same".
- There is no proven lead source yet. Instagram cold outreach has not been efficient.

## 2. Why this exists (goals, in priority order)

1. **Never miss a follow-up.** This is the number one goal. Follow-ups get missed because the owner (a) forgets to open the tracker, (b) finds the task list too long or unclear, and (c) does not know what to say, so puts it off.
2. **Handle 25 to 50 first messages and follow-ups a day** without it feeling heavy: a short, ordered batch with one obvious next step.
3. **Close more leads:** see what works (replies by follow-up number, results by category and source).
4. **Less typing and faster updates;** keep a full history for every lead.
5. **Find good leads** (new capability: a guided lead finder).

Timeline: real use starts Monday 23 Nov 2026 using the live single-file version; the React rebuild catches up during the following week; improvements come after the first week of real use.

## 3. Product principles (decisions already made, do not reverse)

- Personal, single user, private data. Google sign-in, only one allowed email.
- **A human approves every send.** No automatic sending in this version. Email opens a Gmail compose window; WhatsApp opens a chat with the text filled in; Instagram copies the message and opens the profile.
- Follow-ups come first in every queue.
- Keep all ~30 lead fields. The owner finds them useful.
- Light theme only. Colour-coded cards by purpose. Indigo and turmeric palette. Font: Bricolage Grotesque.
- **No horizontal scrolling anywhere:** tables wrap text and hide low-priority columns on narrow windows; the pipeline board wraps into rows; stage path bar wraps.
- Free-tier friendly: Firebase Spark (Auth + Firestore) and Netlify free.
- No keys or connectors in version 1 other than the public Firebase web config.
- AI drafts (Claude API) and Gmail API drafts are **later add-ons**, off behind feature flags. Templates are the drafting method for now and remain the fallback forever.
- Cold outreach caution: keep a human pressing Send. WhatsApp cold messages at scale need the official Business API with approved templates. Automated Instagram DMs risk account restrictions. Email from a new domain risks spam folders.

## 4. History

- **v3:** original single-file lead tracker (7 stages, 5-step follow-up cadence, message drafts, data checks, goal gauge, CSV export).
- **v4 (current live reference):** added review-and-send queue (Start review), channel buttons, activity timeline, editable templates, tab-title due count, sortable and filterable leads with saved views, drag-and-drop pipeline, CSV import, editable follow-up gaps, replies-by-follow-up report, AI drafts and Gmail drafts (these two only work inside Claude's hosted page), Find leads tab with a store checklist, Home "Your plan for today", full indigo and turmeric redesign with less horizontal scrolling.
- **React rebuild (this repo):** needed for owner-controlled hosting on free tiers (Netlify + Firebase), owner-controlled data, and future automation. The live v4 stays the working tool until the rebuild passes the acceptance checklist in section 11.

## 5. Domain model

### 5.1 Stages (in order) and colours
`New Lead #6b7a90`, `Message Sent #0176d3`, `Replied #06a59a`, `Call Booked #7f5bd6`, `Quote Sent #fe9339`, `Won #2e844a`, `Lost #ba0517`. In the lead record the path bar shows the first six as chevrons and "Closed lost" as a separate item.

### 5.2 Lead fields (by form section; `*` = required; key in backticks)
- **Lead information:** `brand`* (text), `contact`, `route` (select), `handle` (phone, handle or email), `link` (store or Instagram link), `category`, `source`, `leadType`, `platform` (all selects), `added` (date).
- **What you noticed:** `observation` (textarea, full width). One specific, fixable problem about their store.
- **Outreach:** `firstMsg` (date), `fu` (number 0 to 5, follow-ups done), `audit` (Yes/No, free audit sent), `lastContacted`, `replyDate`, `callDate`, `nextAction` (dates).
- **Deal:** `budget`, `service`, `dealType` (selects), `value` (number, ₹, total for the deal), `founding` (Yes/No), `wonDate` (date), `lostReason` (select).
- **Notes:** `notes` (textarea, full width).
- Also stored: `id`, `n` (running lead number), `stage`, `log` (activity array).
- New lead defaults: `stage='New Lead'`, `added=today`, `fu=0`, `audit='No'`, `founding='No'`, `budget='Unknown'`, `n = max(existing n) + 1`.

### 5.3 Option lists
- **category:** Kids & Toys, Home & Lifestyle, Fashion & Accessories, Beauty & Wellness, Food & D2C, Other
- **source:** Meta Ad Library, Instagram, Google, Directory, Referral, LinkedIn, Other
- **leadType:** Running ads, Weak existing store, No store yet
- **platform:** Shopify, WooCommerce, Custom, Wix / Other, None (no store), Unknown
- **route:** WhatsApp, Instagram DM, Email, LinkedIn, Phone call
- **budget:** Unknown, Under ₹40,000, ₹40,000 to ₹70,000, ₹70,000 to ₹1,50,000, Above ₹1,50,000
- **service:** New store build, Store redesign, Fixes and speed work, Ongoing store management, Other
- **dealType:** One-time project, Monthly retainer
- **lostReason:** No reply after follow-ups, Price too high, Chose someone else, Already has a good store, Bad timing, Not a fit, Other
- **Yes/No:** No, Yes

### 5.4 Settings (document `users/{uid}/settings/main`)
Defaults: `goal: 300000` (monthly revenue goal), `win: 30` (target win rate %), `perDay: 15` (leads per day), `days: 5`. Also: `gaps` (array, default `[1,3,7,14,21]`, up to 5 numbers, strictly increasing), `tpl` (array of 6 template strings or null for defaults), `views` (array of saved list views `{n, sf, f, sort, dir}`).

### 5.5 Activity log
`log` is an array of `{t: 'YYYY-MM-DD', x: text}`. These exact texts drive the Home counts, so never change them: `First message sent`, `Follow-up N sent` (N = number), `Found via lead finder`, `Stage: <old> to <new>`, `Gmail draft created` (later). User notes use `Note: ...`, `Reply received: ...`, `Call: ...`, `Message sent: ...`.

### 5.6 Follow-up logic
- Applies to leads in stage `Message Sent` with a `firstMsg` date. With `G = gaps` (default [1,3,7,14,21]) and `n = fu`, the next follow-up is due on `firstMsg + G[n]` days; when `n >= G.length` the cadence is done (suggest closing as Lost).
- Sending a first message: stage becomes `Message Sent`, `firstMsg = today`, `fu = 0`, `lastContacted = today`, log `First message sent`.
- Sending a follow-up: `fu = min(G.length, fu + 1)`, `lastContacted = today`, log `Follow-up N sent`.
- Statuses: Overdue (due date before today), Due today. Overdue items come first in every queue. Use local date parts for all date maths (`iso`, `today`, `addDays`, `gap` helpers in the reference); never `toISOString()` because it shifts dates by one day in India.
- Message used: first message = template 0; follow-up n uses template n+1; the last follow-up (n = G.length - 1) always uses template 5, the polite closing message.

### 5.7 Default message templates (placeholders `{hi}`, `{brand}`, `{obs}`)
`{hi}` = "Hi <first name>," (or "Hi,"). `{brand}` = brand or "your brand". `{obs}` = observation with first letter lowercased and trailing full stop removed, or "a few things on the store that could be improved".
0. `{hi} I was looking at {brand} and noticed {obs}. I help online brands fix issues like this so more visitors check out. Could I send you a free 10-point audit of your store?`
1. `{hi} just checking you saw my last message about {brand}. Happy to share what I found, no strings attached.`
2. `{hi} I put together a free 10-point audit for {brand}, starting with {obs}. Want me to send it over?`
3. `{hi} here is a live store in your space that we improved. I can show you what changed and what it did for their orders.`
4. `{hi} one quick tip for {brand}: fast pages and a simple checkout lift orders more than most design changes. Glad to point out where yours can improve.`
5. `{hi} I will stop pinging you here. If store improvements come up later, I am a message away. Wishing {brand} a great season.`

## 6. Screens and behaviour

Reference function names are given so the agent can read the exact code.

- **Home** (`vHome`, `planCard`): "Your plan for today" panel (solid indigo) with three progress bars: (1) Follow up: sent today out of sent plus due, (2) Find new leads: `Found via lead finder` entries today out of `perDay`, (3) Send first messages: `First message sent` entries today out of `perDay`; one Next button (Clear N follow-ups, Find leads, or Send first messages) or "All done for today". Then: Monthly revenue goal gauge, KPI cards (Open quotes, Expected, Needs action, Added this week), Tasks for today (follow-ups due, up to 50), Ready for a first message (new leads, up to 50), Needs fixing (data checks; see `checks` in the reference). Browser tab title shows `(N) Cart Wise Co: Lead Tracker` where N = the total number of tasks in the queue, including overdue/due follow-ups, close tasks and set-date/next-action tasks.
- **Start review** (`startReview`, `rq0`, `openDraft`, `doneSend`, `skipRq`): one batch of up to 50: overdue and due follow-ups first, then new leads. Each item opens the draft window with Skip and "I sent it, next".
- **Draft window** (`openDraft`, `draft`, `chBtn`, `openCh`): shows the message in an editable textarea, copy button, and a channel button by route: WhatsApp opens `https://wa.me/<digits>?text=<encoded>` (10-digit numbers get `91` prefixed); Email opens a Gmail compose window `https://mail.google.com/mail/?view=cm&fs=1&to=...&su=Quick idea for <brand>&body=...` (fallback `mailto:`); Instagram copies the message and opens the lead's link or `https://instagram.com/<handle>`. "I sent it" logs the send (5.6).
- **Leads** (`vLeads`, `edit`, `saveM`): stage chips with counts, search, sortable columns (#, Lead, Category, Source, Stage, Next step, Deal value, Added), filters (category, source, lead type, platform, route) with Clear, saved views, show first 100 rows then "Show all". Columns hide as the window narrows: Added first, then # and Source, then Category and Deal value. Lead, Stage and Next step always show. The lead record is a modal: header, clickable stage path, Activity timeline (add Note, Reply received, Call, Message sent; "Reply received" fills `replyDate` if empty; stage changes auto-log), the five sections of fields, "Needs fixing" warnings, save and delete.
- **Pipeline** (`vPipe`, `dropTo`): one tinted lane per stage, cards wrap into rows, native HTML5 drag and drop. On drop: set `firstMsg` when moving to Message Sent and empty; set `replyDate` when moving to Replied, Call Booked, Quote Sent or Won and empty; set `wonDate` for Won; log `Stage: A to B`; save; open the lead if (Lost and no `lostReason`) or (Quote Sent or Won and no `value`).
- **Find leads** (`vFind`, `openFind`, `addFound`): keyword box, category select (default Fashion & Accessories), three search cards, a one-minute store checklist, and "Save a lead".
  - Running ads: Meta Ad Library `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IN&media_type=all&search_type=keyword_unordered&q=<kw>`.
  - Weak existing store: Google `https://www.google.com/search?start=10&q=<kw> buy online India` (look at pages 2 to 4).
  - No store yet: Google `https://www.google.com/search?q=site:instagram.com "DM to order" <kw>`.
  - Saving: blocks duplicate brands (case-insensitive); sets `leadType`; source by type (Running ads → Meta Ad Library, Weak existing store → Google, No store yet → Instagram); `platform` = `None (no store)` for No store yet, else `Unknown`; log `Found via lead finder`; shows "Added today" count.
  - Checklist for stores (label → phrase written into `observation`): Slow to load on mobile → "slow mobile loading"; Cluttered or confusing homepage → "a cluttered homepage"; Weak product photos or pages → "weak product photos"; Long or confusing checkout → "a long checkout"; No reviews, returns policy or contact details → "missing trust signals like reviews or a returns policy"; Hard to use on a phone → "a layout that is hard to use on a phone"; No clear offer or call to action → "no clear call to action"; Looks outdated → "an outdated design".
  - Checklist for Instagram sellers: Takes orders only by DM → "orders being taken only by DM"; No website link in bio → "no website link in the bio"; Customers cannot browse the full range online → "no way to browse the full range online"; Prices only shown in posts → "prices only shown in posts".
  - Phrases join as "a, b and c". Show "Problems found: n of N" and "Strong lead" at 3 or more.
- **Templates** (`vTpl`): six editable templates, saved on change, reset to defaults.
- **Reports** (`vNum`, `repFu`): funnel and win rates, by category, by source, replies by follow-up number (replied leads grouped by `fu` at reply: after first message, after follow-up 1, ...), targets (leads per day, revenue goal, win rate, follow-up gaps editor).
- **Import** (`prevImp`, `doImport`) and **Export** (`exportCsv`): CSV or pasted spreadsheet rows (comma or tab separated); header names are matched case-insensitively ignoring punctuation (field keys plus friendly aliases such as "brand or store", "phone", "store platform"); preview "N ready, M skipped"; skip rows with no brand or a brand that already exists; dates `dd/mm/yyyy` are converted to ISO; defaults as in a new lead.
- **Backup and Restore** (new in the rebuild): one JSON file `{version, exportedAt, leads, settings}`; restore validates, shows counts, offers Merge (by id, default) or Replace (type REPLACE to confirm).

## 7. Technical architecture

- React + Vite + TypeScript (strict), plain CSS with variables. Firebase Auth (Google) and Firestore (modular SDK). Netlify hosting from GitHub (`netlify.toml`: build `npm run build`, publish `dist`, SPA redirect).
- Data paths: `users/{uid}/leads/{leadId}`, `users/{uid}/settings/main`.
- Security: UI check against `VITE_ALLOWED_EMAIL`, and Firestore rules allowing access only when `request.auth.uid == uid` AND `request.auth.token.email` equals the owner's email.
- Config: `.env` with `VITE_FIREBASE_*` and `VITE_ALLOWED_EMAIL` (see `.env.example`). Flags `ENABLE_AI_DRAFTS=false`, `ENABLE_GMAIL_API=false`.
- One realtime listener for leads, cached in memory. Free-quota aware. Save important actions immediately; debounce only typing.
- Design tokens: bg `#f6f5fb`, ink `#1f1d3d`, muted `#625f82`, line `#e4e2f0`, soft `#f1f0f8`, brand `#3d3aa8` (hover `#2b2980`), gold `#f0a81c`, good `#1f8a54`, bad `#c4283f`. Card tints (bg / border): blue `#e2f0fa`/`#c5def2`, amber `#fdf1d1`/`#f3dea0`, green `#e1f3e8`/`#bfe3cd`, red `#fbe5ea`/`#f3c3cd`, purple `#ecebfb`/`#d3d1f3`, teal `#def3f1`/`#b9e3df`, grey `#efeef5`/`#dddbea`.
- **Deferred add-ons** (prompts are in `docs/PROMPTS.md`): AI drafts through a Netlify Function calling the Claude API (tones: Short and casual English, Professional English, Hinglish; template fallback); real Gmail drafts through the Gmail API with Google Identity Services. Both need keys and setup the owner does not want yet.

## 8. Current status (23 Nov 2026)

**Phase 1 foundation verified:**
- Firebase Google sign-in and the allowed-email UI check exist.
- Development-only auth bypass is restricted to `import.meta.env.DEV`, shows a visible banner, and bypass users receive no Firestore uid/listener/write access.
- Firestore rules deny by default outside `/users/{uid}/...` and require matching uid plus the email placeholder `YOUR_EMAIL@gmail.com`.
- The old Test Brand sample-lead factory and Header button action were removed. Existing remote data was not listed or deleted because the bypass cannot access real Firestore and no explicit deletion approval was given.
- One `LeadsProvider` now owns the leads/settings snapshots and exposes cached state plus save/delete helpers through `useLeads()`.
- Pure date, formatting, follow-up, queue, data-check, and template-filling modules live under `src/lib`.
- `npx tsc --noEmit` passes with zero errors and `npm run build` passes.
- `docs/PROJECT_KT.md` and `docs/PROMPTS.md` are not present; the KT is available at the workspace root as `PROJECT_KT.md`.
- `reference/cart-wise-lead-tracker-v4.html` is not present, so reference-only data checks and exact screen parity could not be independently copied or verified.

**Still not built or broken:**
- Leads page and Pipeline board are placeholders.
- Lead modal, filtering, sorting, saved views, CSV import/export, Start review, drafts, and real task actions remain incomplete.
- Backup and Restore are not wired.
- The Firestore placeholder email must be replaced and rules deployed.
- The Netlify address must be added to Firebase authorized domains; README needs finishing.
- Skip for now: code splitting, automated tests, and drag-and-drop libraries.

## 9. How to work with the owner

- Work in small steps. After each step run `npx tsc --noEmit` and `npm run build`, commit, then summarise what changed, what you verified, and give a short browser test checklist. Wait for approval before the next step.
- Never say something is done unless you ran it and checked it. List anything you could not verify.
- You may have no network. If a package must be installed or a Firebase or Netlify command run, give the exact command and wait for the owner to run it.
- Ask before adding a dependency or doing anything destructive. Never commit secrets or `.env`.
- Plain, direct language. The owner may be new to Git and Firebase commands; spell them out.
- Test data: the owner can Export a CSV from the live single-file tracker and Import it into the new app.

## 10. Roadmap

1. Finish the rebuild (Leads, Pipeline, verification of existing pages, backup and restore, rules, deploy).
2. First week of real use: collect notes (what felt slow, confusing or missing), group into bugs, quick wins, bigger features, then implement in that order.
3. Later add-ons when asked: AI drafts (Claude API), real Gmail drafts, then ideas such as scheduled reminders and semi-automatic outreach (still with human approval).
4. Lead finding stays guided and manual (search links plus checklist). No scraping tools.

## 11. Acceptance checklist before switching from the live tracker

1. Sign-in works and a different Google account is refused (also by Firestore rules).
2. Export from the live tracker imports cleanly; lead count and stages match.
3. Daily plan, tasks and follow-up due dates match the live tracker for the same data.
4. Start review clears a batch; WhatsApp, Instagram and Gmail compose buttons work.
5. Drag and drop, saved views, import and export all work.
6. Nothing scrolls sideways at laptop and phone widths.
7. A full backup downloads and restores.
8. No keys or secrets are in the repo; Netlify build passes; live site sign-in works.
