export const Routes = {
  // Authentication
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  FORGOT_PASSWORD: "/auth/forgot-password",
  AUTH_CALLBACK: "/auth/callback",

  // Onboarding (first-time household users)
  ONBOARDING: "/onboarding",

  // Dashboard
  DASHBOARD: "/dashboard",

  // Dashboard Pages
  ELECTRONICS: "/dashboard/electronics",
  COMPONENTS: "/dashboard/components",
  ACTIVITY_LOGS: "/dashboard/activity-logs",
  ANALYTICS: "/dashboard/analytics",
  
  NOTIFICATIONS: "/dashboard/notifications",
  MENU: "/dashboard/menu",
  ABOUT_US: "/dashboard/about-us",
  USER_MANUAL: "/dashboard/user-manual",

  // Admin (hidden, role-gated — no Menu entry)
  ADMIN: "/admin",
} as const;