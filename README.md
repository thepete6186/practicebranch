# Professional Development (PD) App

## Overview

This repository contains a Professional Development (PD) web application designed to manage teacher profiles, PD events, and signups. The app provides:
- Teacher and Administrator roles
- Teacher profiles with PD hours tracking
- Event calendar and sign-up flows
- Admin-only operations (create/delete events, delete teachers in development)

## Hosted demo

You can try the live hosted version here: https://profdevlhkis.netlify.app

## Tech stack and skills used

- React (Create React App) for the front-end UI and routing
- CSS / HTML for styling and layout
- Firebase (Auth + Firestore) for authentication and data storage
- Express (simple development server) for a local API with admin checks
- JavaScript (ES6+), React hooks, Context API, and modular services

## Repository layout

- `pdapp/` — React front-end application
	- `src/` — source files (components, contexts, services)
	- `public/` — static assets
	- `build/` — production build output
- `server/` — simple development API server (file-based `db.json` persistence)

## Key files

- `pdapp/src/App.js` — routing + main UI pages
- `pdapp/src/pdDataContext.js` — data provider and subscriptions to Firestore
- `pdapp/src/services/pdFirestore.js` — Firestore helpers (subscribe, create, update, delete)
- `pdapp/src/firebase/` — Firebase initialization and auth wrappers
- `server/index.js` — small dev API (teacher/event endpoints, admin header enforcement)

## Local development

1. Start the dev API server (optional for testing server-backed endpoints):

```bash
cd server
npm install
node index.js
```

The dev API listens on port 4000 by default.

2. Start the React front-end:

```bash
cd pdapp
npm install
npm start
```

Open http://localhost:3000 in your browser.

## Environment and configuration

- Firebase project configuration is in `pdapp/src/firebase/firebase.js`. Set your project's credentials there or use environment-based config.
- `server/db.json` is a simple JSON store used by the dev server.

## Notes and caveats

- The development API enforces admin-only deletes via a simple `x-user-role` request header. This is a development convenience and is NOT secure for production.
- For production, protect admin operations with authenticated server-side checks and Firestore security rules.

## Contributions and next steps

- Improve styling and responsive layout
- Add role-based UI flows and admin dashboards
- Add tests and CI

If you want help running the project, restoring a specific UI snapshot, or making further changes, tell me what to do next.

