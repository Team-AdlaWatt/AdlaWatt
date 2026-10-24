# Account Session Checker

Status: **shipped**. Adds a real-time check for accounts that
were deleted while the app was open, a full-screen takeover,
and an automatic return to the login screen.

## Problem

Deleting an account in Supabase (`Authentication -> Users`)
removes the `auth.users` row but leaves the issued JWT valid
until it expires (default 1h). The client keeps a working
session, so the app keeps rendering the dashboard with data it
can no longer write. Nothing in the app noticed the delete:

- `AuthContext` bootstraps from the persisted session only
  (`getSession()` is a local read, no server validation).
- `getCurrentUserProfile()` and `getAuthenticatedUserSafe()`
  collapse every failure into "no profile" / `null`, so a
  deleted account and a flaky network look identical.
- The splash screen routes to the dashboard when the profile
  load fails, so the user lands in an empty dashboard instead
  of the login screen.

## Detection

One request per tick: `supabase.auth.getUser()`.

The only trusted signal is an **explicit server statement that
the user no longer exists**:

| Server response | Verdict |
|---|---|
| 403 `user_from_sub_claim_does_not_exist` | deleted (auth row gone, JWT still valid) |
| 404 `user_not_found` | deleted |
| `refresh_token_not_found` + profile row missing | deleted |
| `refresh_token_not_found` + profile row present | unknown (rotated token on a second device) |
| 401 `invalid_jwt` + refresh succeeds | active |
| 401 `invalid_jwt` + refresh fails | unknown (expired token) |
| network failure / 5xx | unknown (offline / server) |
| `AuthSessionMissingError` | unknown (no session) |

A `deleted` verdict is confirmed by a **second call 1.2s
later** before it is returned: one misread response must never
lock a user out. `unknown` never shows the takeover and the
next tick retries on its own.

The profile lookup exists only to break the tie in the
`refresh_token_not_found` case, where a deleted auth row and a
rotated refresh token are indistinguishable. It runs
`maybeSingle()`, so "no row" is a fact and an error (offline,
RLS, 5xx) is not.

## Cadence

`src/components/auth/AccountSessionGuard.tsx`, mounted in
`src/app/_layout.tsx` so it covers every route:

- one check on mount (a cold start after the delete must not
  open a ghost dashboard),
- one check every **15s** while the app is in the foreground,
- one check when the app returns to the foreground,
- no check while offline (`useConnectivity`) and none in the
  background — a backgrounded app checks again on return.

Ticking in the background would only burn battery; the
foreground check already covers the gap.

## Takeover

`src/components/auth/AccountNotFoundOverlay.tsx` renders a
full-screen `Modal` (opaque, fade) with the centered message
**"Account Not Existing"**, a supporting line, and a
**"Back to Sign In"** button.

Sequence on detection:

1. the session is dropped immediately (`useAuth().signOut()`),
   so nothing may keep writing with a dead account,
2. the takeover stays for **2.5s**,
3. the app replaces the route with `/auth/login` and the
   takeover closes.

The button skips the wait. Because the session is already gone
when the route changes, the signed-in bounce in the auth layout
does not fire on the way out.

`performSignOut()` is deliberately **not** used here: it writes
an activity-log row and cancels reminders, both of which hit
tables keyed to a user that no longer exists.

## Known limits

- A deleted auth user leaves an **orphaned `public.users` row**
  (no cascade from `auth.users` in the repo migrations). The
  username stays reserved and the row is dead; cleaning it up
  needs a DB trigger or a migration, not app code.
- A delete that lands while the access token is *already*
  expired, on a profile that still exists, is reported as
  `unknown`: the SDK signs the session out on its own and the
  user reaches the login screen, but without the takeover
  message. The message needs an explicit server statement.
- Realtime `postgres_changes` on `public.users` would make
  profile deletes instant, but it needs a `supabase_realtime`
  publication migration applied by hand and a `DELETE` policy.
  The 15s poll covers the current requirement without either.

## Files

- `src/services/accountSessionChecker.ts` — verdict logic.
- `src/components/auth/AccountSessionGuard.tsx` — cadence and
  routing.
- `src/components/auth/AccountNotFoundOverlay.tsx` — takeover.
- `src/app/_layout.tsx` — global mount.
- `src/locales/{en,ceb,fil}.ts` — `auth.session.*` strings.
- `src/services/__tests__/accountSessionChecker.test.ts` —
  verdict table.
