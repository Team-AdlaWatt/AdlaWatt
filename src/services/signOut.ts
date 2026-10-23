import { supabase } from "@/lib/supabase";
import { logAuth } from "@/services/activityLogService";
import { cancelAllReminders } from "@/services/reminderService";

// ============================================================
// SIGN OUT ORCHESTRATOR
//
// Log out must feel immediate: the UI returns to Login on the
// same tick the user confirms, while the session teardown and
// cleanup continue in the background.
//
// This returns synchronously (void) on purpose — callers do
//   performSignOut();
//   router.replace(Routes.LOGIN);
// so no network round-trip sits in front of navigation. The
// activity log is written first, while the session still
// satisfies RLS on insert; the reminder cancel and the actual
// supabase.auth.signOut() are fire-and-forget. The SIGNED_OUT
// event then clears AuthContext and unmounts the dashboard.
//
// Kept UI-free (no expo-router import) so navigation stays
// with the callers and the module stays unit-testable.
// Scope stays local by design: revoking other devices is
// inherently slow and is the delay this module removes.
// ============================================================

export function performSignOut(): void {
  // Logged before sign-out: after sign-out there is no
  // session left to satisfy RLS on insert.
  logAuth.loggedOut();

  // Scheduled reminders belong to the signed-in phone:
  // cancel so a signed-out device stays silent. Best-effort;
  // never blocks navigation.
  cancelAllReminders().catch((error) => {
    console.warn(
      "Sign out cleanup failed:",
      error instanceof Error ? error.message : error,
    );
  });

  // Local session clear; the SIGNED_OUT event drives state.
  supabase.auth.signOut().catch((error) => {
    console.warn(
      "Sign out failed:",
      error instanceof Error ? error.message : error,
    );
  });
}
