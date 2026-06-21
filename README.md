# Loader Castle Restaurant POS

Production-oriented React + Vite restaurant POS and management system with offline-first local persistence, Firebase Firestore-ready sync, GST-friendly INR billing, loyalty, inventory, attendance, analytics, branch settings, and thermal receipt printing.

## Run Locally

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Login

The app starts on a role-based login page.

Demo admin:

```text
Email: admin@loadercastle.in
Password: admin123
```

Demo user:

```text
Email: cashier@loadercastle.in
Password: user123
```

Admin accounts can access all modules. User accounts are limited to Dashboard, POS, and Loyalty. The current implementation stores a local demo session and is structured so Firebase Auth can be connected next.

## Firebase Setup

Copy `.env.example` to `.env` and fill the `VITE_FIREBASE_*` values from your Firebase web app. Firestore is initialized with `persistentLocalCache` and `persistentMultipleTabManager`. If Firebase variables are not present, the app still runs from IndexedDB and queues writes locally.

## Offline-First Behavior

- IndexedDB stores the full app state on first boot.
- Checkout, inventory edits, loyalty registration/redemption, attendance updates, tax changes, branch creation, and analytics update immediately from local state.
- Pending writes are tracked in IndexedDB and flushed to Firestore when the browser is online and Firebase config exists.
- Firestore writes use stable document IDs and merge semantics, making seed hydration safe to run repeatedly.

## Deployment

### Vercel

This project is ready for Vercel as a static Vite app.

Vercel settings:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js Version: `20.x` or newer

Add these environment variables in Vercel Project Settings before deploying with Firebase sync enabled:

```bash
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

The included `vercel.json` config enables SPA fallback routing to `index.html`, long-lived asset caching, and basic security headers.

Deploy with the Vercel CLI:

```bash
npm install -g vercel
vercel
vercel --prod
```

### Static Build

Build static assets:

```bash
npm run build
```

PM2 static serving:

```bash
npm install -g pm2 serve
pm2 serve dist 3000 --spa --name loader-castle-pos
pm2 save
```

Nginx reverse proxy sample:

```nginx
server {
  listen 80;
  server_name pos.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

For direct static hosting with Nginx:

```nginx
server {
  listen 80;
  server_name pos.example.com;
  root /var/www/loader-castle-pos/dist;
  index index.html;

  location / {
    try_files $uri /index.html;
  }
}
```

## Print Receipts

The receipt panel includes `@media print` CSS optimized for 80mm and 58mm thermal printers. Use the Settings receipt width in data if you want to switch defaults per branch.
