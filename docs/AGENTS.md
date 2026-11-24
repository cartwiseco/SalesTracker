You are building "Cart Wise CRM", a personal lead tracker for ONE user (a solo freelancer who builds and fixes online stores for D2C brands in India). It must behave exactly like the reference file reference/cart-wise-lead-tracker-v4.html, which is the source of truth for features, field names, option lists, wording, calculations and layout. Before building any feature, read the matching code in that file and copy its behaviour. If the reference and these notes disagree, the reference wins; tell me about the difference.

STACK
- React + Vite + TypeScript (strict). Plain CSS or CSS modules with CSS variables (no heavy UI library).
- Firebase Auth (Google sign-in) + Firestore (modular v9+ SDK). Firebase is the ONLY external service in this version.
- Netlify hosting, deployed from GitHub. No server code yet.

RULES
- NO secrets, API keys, OAuth flows, Google Cloud code, Anthropic code or server functions in this version. The only configuration is the public Firebase web config in VITE_ variables. Add two feature flags, ENABLE_AI_DRAFTS=false and ENABLE_GMAIL_API=false; while false, the AI draft button and any Gmail API feature are hidden. Structure the code so those features can be added later without restructuring.
- Single user. Only the Google account in VITE_ALLOWED_EMAIL may use the app. Enforce this in the UI and in the Firestore security rules (data lives under users/{uid}/..., readable and writable only by that uid, and only when the token email equals the allowed email).
- The Email button opens a Gmail compose window in a new tab with the message filled in: https://mail.google.com/mail/?view=cm&fs=1&to=<email>&su=<subject>&body=<body> (URL-encoded), with a mailto: fallback. No API.
- Data: users/{uid}/leads/{leadId} and users/{uid}/settings/main. Derive the full lead field list and all option lists from the reference file. Keep an activity log array per lead; entries are {t: ISO date, x: text}. The Home plan counts depend on these exact texts: "Found via lead finder", "First message sent", and "Follow-up N sent".
- Stages in order: New Lead, Message Sent, Replied, Call Booked, Quote Sent, Won, Lost. Follow-up counter fu runs 0 to 5. Follow-up due dates = firstMsg + gaps[fu] days, default gaps [1,3,7,14,21] (editable, up to 5). The final follow-up uses the closing template.
- Use one realtime listener for leads and cache in memory. Be careful with reads (Firestore free quota). Debounce writes.
- Never put secrets in git. Show clear messages when something fails; never break the screen.
- Layout: no horizontal scrolling anywhere. Tables hide low-priority columns on narrower windows. The pipeline board wraps into rows. Mobile-friendly.
- Design tokens (light theme only): bg #f6f5fb, ink #1f1d3d, muted #625f82, line #e4e2f0, soft #f1f0f8, brand indigo #3d3aa8 (hover #2b2980), gold #f0a81c, good #1f8a54, bad #c4283f. Card tints by purpose (bg/border): blue #e2f0fa/#c5def2, amber #fdf1d1/#f3dea0, green #e1f3e8/#bfe3cd, red #fbe5ea/#f3c3cd, purple #ecebfb/#d3d1f3, teal #def3f1/#b9e3df, grey #efeef5/#dddbea. Font: Bricolage Grotesque.
- Work in small steps. After each step: run the build and type-check, fix errors, summarise what changed and what I should test. Commit with clear messages. Ask before adding a new dependency or doing anything destructive.