# CampusBid

CampusBid is a student-to-student campus marketplace built around independently timed auctions, auditable bids, and confirmed campus handovers.

## Stack

- Next.js 16 App Router, React, strict TypeScript, and Tailwind CSS
- Supabase Auth, PostgreSQL with Row Level Security, Storage, and Realtime
- Zod, React Hook Form, and Lucide icons
- Vitest and Playwright are planned for the testing phase

## Local Setup

Requirements: Node.js 20.9 or later and npm.

1. Create a Supabase project. In **Project Settings → API** or the project **Connect** dialog, copy the project URL and publishable key.
2. Create `.env.local` in the project root and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to those values. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable or browser code.
3. Install dependencies with `npm install`.
4. Initialize Supabase CLI config once, then link the project and apply migrations:

	```powershell
	npx supabase init
	npx supabase login
	npx supabase link --project-ref YOUR_PROJECT_REF
	npx supabase db push
	```

	For a local Supabase stack, run `npx supabase start` and `npx supabase db reset` after initialization. The local email confirmation link is captured by Inbucket at <http://localhost:54324>.
5. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the Redirect URLs list. For deployment, add the production callback URL too.
6. In **Authentication → Sign In / Providers**, enable Email. Email confirmation can remain enabled; CampusBid shows a confirmation state and exchanges the callback code at `/auth/callback`.
7. Campus identifiers are currently self-reported and are **not verified** by a campus directory or verified-email domain.
8. Start the app with `npm run dev` and open <http://localhost:3000>.

The initial migration creates the application tables, RLS rules, a public listing-image bucket, Storage policies, and Realtime publication entries. Review [the architecture notes](docs/architecture.md) before deploying. Database migrations cannot be applied or integration-tested until a Supabase project is configured.

## Scripts

- `npm run dev` starts the local development server.
- `npm run build` runs the production build and TypeScript checks.
- `npm run typecheck` runs TypeScript without producing output.
- `npm run lint` runs ESLint.

## Feature Checklist

- [x] Next.js App Router, strict TypeScript, and Tailwind foundation
- [x] Supabase browser/server clients and Next.js 16 auth-session refresh proxy
- [ ] Initial schema, RLS, Storage policies, and Realtime migration (drafted; not applied or tested)
- [x] Sign-up, sign-in, and email-confirmation callback
- [x] Responsive marketplace shell and session-aware navigation
- [ ] Profile UI and protected dashboard
- [ ] Listing creation, editing, photo upload, marketplace search, and detail pages
- [ ] Transaction-safe bidding and last-minute deadline extensions
- [ ] Idempotent auction closing and seller approval/handover workflow
- [ ] In-app notifications and tests

Features are checked only after implementation and verification. No Supabase connection or migration has been claimed as tested without project credentials.
