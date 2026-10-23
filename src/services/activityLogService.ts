import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";

// ============================================================
// ACTIVITY LOG SERVICE
//
// Manual write pipeline for the activity_logs table. There
// are no database triggers and no Auth hooks, so every row
// exists because app code called logActivity() at the right
// place (see implementation plan/activity_logging.md).
//
// Fire-and-forget by design: logActivity() never throws and
// must never be awaited inside gesture handlers. A failed
// insert is a console.warn, never user-facing.
//
// Reader contract (activity-logs.tsx + ActivityLogCard):
// only info | warning | error | critical are ever sent.
// ============================================================

export type ActivityLogType =
  | "info"
  | "warning"
  | "error"
  | "critical";

export interface LogActivityInput {
  title: string;
  description?: string;
  type?: ActivityLogType;
  /**
   * Explicit user id, used only when no session exists yet
   * (e.g. right after sign-up before the first session).
   * Prefer the session; RLS still applies.
   */
  userId?: string;
}

async function resolveUserId(): Promise<string | null> {
  try {
    const user = await getAuthenticatedUserSafe();

    return user?.id ?? null;
  } catch {
    return null;
  }
}

export function logActivity(
  input: LogActivityInput,
): void {
  resolveUserId()
    .then(async (sessionUserId) => {
      const userId = sessionUserId ?? input.userId;

      if (!userId) {
        return;
      }

      const { error } = await supabase
        .from("activity_logs")
        .insert({
          user_id: userId,
          title: input.title,
          description: input.description ?? "",
          type: input.type ?? "info",
        });

      if (error) {
        console.warn(
          "Activity log insert failed:",
          error.message,
        );
      }
    })
    .catch((thrown: unknown) => {
      console.warn(
        "Activity log failed:",
        thrown instanceof Error
          ? thrown.message
          : thrown,
      );
    });
}

// ============================================================
// CONVENIENCE WRAPPERS
//
// One-liners so call sites read clearly. Severity follows
// the catalog in implementation plan/activity_logging.md.
// ============================================================

export const logAuth = {
  accountCreated(username: string, userId?: string): void {
    logActivity({
      title: "Account Created",
      description: `${username} created an account.`,
      type: "info",
      userId,
    });
  },

  loggedIn(): void {
    logActivity({
      title: "Logged In",
      description: "Signed in.",
      type: "info",
    });
  },

  // NOTE: failed logins are intentionally not recorded —
  // without a session the insert cannot satisfy RLS.
  loggedOut(): void {
    logActivity({
      title: "Logged Out",
      description: "Signed out.",
      type: "info",
    });
  },
};

export const logProfile = {
  usernameUpdated(username: string): void {
    logActivity({
      title: "Username Updated",
      description: `Username changed to ${username}.`,
      type: "info",
    });
  },

  emailUpdated(): void {
    logActivity({
      title: "Email Updated",
      description: "Email address changed.",
      type: "info",
    });
  },

  emailPending(): void {
    logActivity({
      title: "Email Confirmation Pending",
      description:
        "Email change needs confirmation.",
      type: "warning",
    });
  },

  passwordChanged(): void {
    logActivity({
      title: "Password Changed",
      description: "Password updated.",
      type: "warning",
    });
  },
};

export const logElectronics = {
  added(name: string, watts: string): void {
    logActivity({
      title: "Electronics Added",
      description: `${name} (${watts}) added.`,
      type: "info",
    });
  },

  updated(name: string): void {
    logActivity({
      title: "Electronics Updated",
      description: `${name} updated.`,
      type: "info",
    });
  },

  removed(name: string): void {
    logActivity({
      title: "Electronics Removed",
      description: `${name} removed.`,
      type: "warning",
    });
  },

  archived(name: string): void {
    logActivity({
      title: "Electronics Archived",
      description: `${name} archived.`,
      type: "info",
    });
  },

  unarchived(name: string): void {
    logActivity({
      title: "Electronics Unarchived",
      description: `${name} restored.`,
      type: "info",
    });
  },

  selectionSaved(count: number): void {
    logActivity({
      title: "Selection Saved",
      description: `${count} electronics item${
        count === 1 ? "" : "s"
      } selected.`,
      type: "info",
    });
  },

  selectionReset(): void {
    logActivity({
      title: "Selection Reset",
      description: "Electronics selection cleared.",
      type: "info",
    });
  },
};

export const logPower = {
  chargingStarted(): void {
    logActivity({
      title: "Solar Charging Started",
      description: "Battery is charging from solar.",
      type: "info",
    });
  },

  chargingStopped(): void {
    logActivity({
      title: "Solar Charging Stopped",
      description: "Solar charging stopped.",
      type: "info",
    });
  },

  fullyCharged(): void {
    logActivity({
      title: "Battery Fully Charged",
      description: "Battery reached 100%.",
      type: "info",
    });
  },

  low(percent: number): void {
    logActivity({
      title: "Battery Level Low",
      description: `Battery at ${percent}%.`,
      type: "warning",
    });
  },

  criticalLow(percent: number): void {
    logActivity({
      title: "Battery Critically Low",
      description: `Battery at ${percent}% — recharge soon.`,
      type: "critical",
    });
  },

  overload(watts: number): void {
    logActivity({
      title: "Inverter Overload Detected",
      description: `Load at ${watts}W exceeds safe limit.`,
      type: "critical",
    });
  },
};

export const logDevice = {
  online(): void {
    logActivity({
      title: "System Online",
      description: "Device connected.",
      type: "info",
    });
  },

  offline(): void {
    logActivity({
      title: "System Offline",
      description: "Device disconnected.",
      type: "critical",
    });
  },

  sensorLost(sensor: string): void {
    logActivity({
      title: "Sensor Connection Lost",
      description: `${sensor} stopped reporting.`,
      type: "error",
    });
  },

  staleData(): void {
    logActivity({
      title: "Monitoring Data Stale",
      description: "No fresh monitoring data.",
      type: "error",
    });
  },
};

export const logSettings = {
  preferencesSaved(summary: string): void {
    logActivity({
      title: "Preferences Saved",
      description: summary,
      type: "info",
    });
  },
};
