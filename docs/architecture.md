# CampusBid Architecture

## Application

The application uses the Next.js App Router. Route components and Server Actions are the default place for server-side data access and validation; browser Supabase access is reserved for interactive features such as Realtime subscriptions. Keep authorization checks in the database RLS policies and in each server-side action that reads or mutates protected data.

## Supabase

- Supabase Auth owns credentials and sessions. The application never stores passwords.
- `src/lib/supabase/client.ts` creates a browser client with the public URL and publishable key.
- `src/lib/supabase/server.ts` creates a request-scoped server client using the Next.js cookie store.
- `src/proxy.ts` refreshes auth cookies with verified claims on Next.js 16. It is not an authorization boundary; protected page and action code must verify identity itself.
- Versioned SQL lives in `supabase/migrations`. Exposed tables have RLS enabled, and client grants are narrower than the policy surface.
- The `listing-images` Storage bucket stores public listing photos. Object writes are limited by Storage policies to paths owned by the authenticated user.
- Realtime is enabled for listing, bid, sale, and notification state; table policies continue to govern which rows clients can receive.

## Data and Auction Invariants

- Listing and bid prices are integer paise. Convert to rupees only when rendering.
- A bid is append-only. Clients receive no direct insert, update, or delete grants on bids.
- The accepted bid operation will be implemented as a trusted PostgreSQL function that locks the listing row, checks the database deadline and current maximum bid, inserts the bid, and applies any anti-sniping extension atomically.
- Auction closing and sale transitions will be database-controlled and idempotent. A browser countdown is display-only.
- The initial migration creates the data boundaries; later migrations add the bid/close functions and transition policies alongside their tests.
- Campus identifiers are self-reported in the MVP. They do not prove enrollment or campus-email ownership.

## Sensitive Configuration

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required for the current client setup. Publishable keys are intended for browser use and are constrained by RLS. Do not add a service-role/secret key to browser code or a `NEXT_PUBLIC_` variable. If a future trusted server job needs one, keep it server-only and narrowly scoped.

## Current External Setup

Create a Supabase project, configure email/password sign-in, copy its URL and publishable key into `.env.local`, and apply migrations with the Supabase CLI. No external project is configured in this workspace yet.