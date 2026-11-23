# Cart Wise CRM

A personal lead tracker for Cart Wise Co, built with React, Vite, TypeScript, Firebase Authentication, and Firestore.

## Local development

1. Copy `.env.example` to `.env`.
2. Fill in the Firebase web configuration and `VITE_ALLOWED_EMAIL`.
3. Keep `VITE_BYPASS_AUTH=false` for normal development unless Firebase Emulator test mode is intentionally configured.
4. Run `npm install`.
5. Run `npm run dev`.

## Validation

```sh
npx tsc --noEmit
npm test
npm run build
```

## Deploy to Vercel

### Option 1: GitHub integration

1. Push this repository to GitHub.
2. Open Vercel and choose **Add New** > **Project**.
3. Import `cartwiseco/SalesTracker`.
4. Use the detected Vite settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
5. Add these environment variables in Vercel:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_ALLOWED_EMAIL`
   - `VITE_BYPASS_AUTH=false`
   - `VITE_ENABLE_AI_DRAFTS=false`
   - `VITE_ENABLE_GMAIL_API=false`
6. Deploy.

### Option 2: Vercel CLI

```sh
npx vercel login
npx vercel
npx vercel --prod
```

Enter the environment variables during the Vercel setup prompts or configure them in the Vercel dashboard before production deployment.

## Firebase setup

Add every Vercel preview and production domain to Firebase Authentication > Settings > Authorized domains.

Deploy the local Firestore rules only after replacing `YOUR_EMAIL@gmail.com` in `firestore.rules`:

```sh
firebase login
firebase use <firebase-project-id>
firebase deploy --only firestore:rules
```

Never commit `.env` or real secrets.
