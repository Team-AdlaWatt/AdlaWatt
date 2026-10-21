// ============================================================
// ENGLISH (source language — every string is written here
// first; fil/ceb mirror these keys exactly)
// Pilot scope: auth screens + Menu language picker.
// ============================================================

const en = {
  common: {
    or: "OR",
    resendIn: "Resend in {{seconds}}s",
    resending: "Resending...",
    wentWrong: "Something went wrong. Please try again.",
    noConnection:
      "No connection. Check your internet and try again.",
    tooManyRequests:
      "Too many requests. Please wait a moment and try again.",
    confirmationThrottled:
      "A confirmation email was sent recently. Please wait before requesting another.",
    authRequired: "No authenticated user found.",
    accountLoadFailed:
      "Unable to load your account information.",
  },

  validation: {
    emailRequired: "Please enter your email address.",
    emailInvalid: "Please enter a valid email address.",
    usernameRequired: "Please enter a username.",
    usernameShort: "Username must be at least 3 characters.",
    usernameLong:
      "Username must not exceed 30 characters.",
    usernameChars:
      "Username can only contain letters, numbers, and underscores.",
    passwordShort: "Password must be at least 8 characters.",
    passwordLong: "Password must not exceed 72 characters.",
    passwordsMismatch:
      "Passwords do not match. Please check both password fields.",
    identifierRequired:
      "Please enter your username or email and password.",
    identifierEmpty: "Please enter your username or email.",
    passwordEmpty: "Please enter your password.",
    termsRequired:
      "Please agree to the Terms and Conditions.",
    termsRequiredLong:
      "Please agree to the Terms and Conditions before creating your account.",
  },

  passwordInput: {
    labelPassword: "Password",
    labelNewPassword: "New Password",
    labelConfirmNewPassword: "Confirm New Password",
    labelConfirmPassword: "Confirm Password",
    placeholderPassword: "Enter your password",
    placeholderNewPassword: "Create a password",
    placeholderConfirmPassword: "Confirm your password",
    placeholderConfirmNewPassword: "Enter password to confirm",
    placeholderCreateNew: "Create a new password",
    placeholderConfirmNew: "Confirm your new password",
    showA11y: "Show password for 5 seconds",
    showHint: "Shows password for 5 seconds",
    hideA11y:
      "Hide password, auto-hides in {{seconds}} seconds",
    hideHint:
      "Password is visible and will hide automatically",
    visibleLive:
      "Password visible, hides in {{seconds}} seconds",
    visibleHint: "Showing password… hides in {{seconds}}s",
  },

  auth: {
    login: {
      title: "Welcome Back",
      subtitle: "Sign in to continue using AdlaWatt.",
      identifierLabel: "Username or Email",
      identifierPlaceholder:
        "Enter your username or email",
      forgotPassword: "Forgot Password?",
      forgotPasswordLabel: "Forgot password",
      forgotPasswordHint: "Recover your password via email",
      signIn: "Sign In",
      signingIn: "Signing In...",
      dividerOr: "OR",
      continueWithGoogle: "Continue with Google",
      connecting: "Connecting...",
      googleA11y: "Continue with Google",
      googleHint: "Sign in with your Google account",
      invalidCredentials:
        "The username or password is incorrect.",
      signInFailed:
        "We could not sign you in. Please check your information and try again.",
      sessionFailed: "Unable to create a login session.",
      sessionFailedNow:
        "Unable to sign in right now. Please try again.",
      emailNotConfirmed:
        "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
      tooManyAttempts:
        "Too many sign-in attempts. Please wait a moment and try again.",
      googleUnavailable:
        "Google sign-in is unavailable right now. Please try again.",
      googleIncomplete:
        "Google sign-in was not completed. Please try again.",
      googleFailed:
        "Unable to sign in with Google right now. Please try again.",
      verifyTitle: "Verify Your Email",
      verifySent: "• Sent",
      verifyTo: "To:",
      verifyBody:
        "Your account needs verification before you can sign in.",
      verifySentFresh:
        "We've just sent a fresh confirmation link. Check your inbox.",
      verifySentRecent:
        "A link was sent recently. Tap resend below if it hasn't arrived.",
      verifySendFresh:
        "Tap resend below for a new confirmation link.",
      resendConfirmation: "Resend confirmation email",
      footerPrompt: "Don't have an account?",
      footerAction: "Create Account",
      testAdminTitle: "Test admin account (dev only)",
      testAdminHint:
        "Sign in with these credentials to preview the admin dashboard.",
      testAdminEmailLabel: "Email",
      testAdminUsernameLabel: "Username",
      testAdminPasswordLabel: "Password",
    },

    register: {
      title: "Create Account",
      subtitle:
        "Create your AdlaWatt account to start monitoring your energy.",
      usernameLabel: "Username",
      usernamePlaceholder: "Enter your username",
      emailLabel: "Email Address",
      emailPlaceholder: "Enter your email",
      agreePrefix: "I agree to the ",
      termsLink: "Terms and Conditions",
      agreeA11y: "Agree to Terms and Conditions",
      openTermsA11y: "Open Terms and Conditions",
      createAccount: "Create Account",
      creatingAccount: "Creating Account...",
      accountFailed: "Unable to create your account.",
      accountTaken:
        "Unable to create your account with these details. Try signing in instead.",
      tooManyAttempts:
        "Too many attempts. Please wait a moment and try again.",
      accountNotCreated: "Account could not be created.",
      accountFailedNow:
        "Unable to create your account. Please try again.",
      checkEmailTitle: "Check your email",
      confirmationSent:
        "We sent a confirmation link to {{email}}. Click the link to verify your account, then sign in.",
      resendConfirmation: "Resend confirmation email",
      continueToSignIn: "Continue to Sign In",
      useDifferentEmail: "Use a different email address",
      useDifferentEmailA11y: "Use a different email address",
      resendFailed: "Unable to resend confirmation email.",
      footerPrompt: "Already have an account?",
      footerAction: "Sign In",
      googleHint: "Create your account with Google",
    },

    forgot: {
      title: "Reset Password",
      subtitleRequest:
        "Enter your account email. We'll send you a recovery link.",
      subtitleVerified:
        "Your email is confirmed. Continue to your account or set a new password.",
      emailLabel: "Email Address",
      emailPlaceholder: "Enter your email",
      sendLink: "Send Recovery Link",
      sending: "Sending...",
      sendFailed:
        "Unable to send a recovery email right now. Please try again.",
      recoveryThrottled:
        "A recovery email was sent recently. Please wait before requesting another.",
      recoveryFailed:
        "Unable to send a recovery email right now. Please try again.",
      recoveryLinkBad:
        "This recovery link is invalid or has expired. Request a new one below.",
      recoveryLinkWrong:
        "This link is not a password recovery link. Request a new recovery email below.",
      recoveryExpired:
        "This recovery link is invalid or has expired. Request a new one.",
      recoveryUpdateFailed:
        "Unable to update your password right now. Please try again.",
      checkEmailTitle: "Check Your Email",
      checkEmailSent: "• Sent",
      checkEmailTo: "To:",
      checkEmailInbox: "your inbox",
      checkEmailBody:
        "We sent a recovery link. Tap it, then set a new password.",
      resendRecovery: "Resend recovery email",
      checkEmailHint:
        "Didn't get it? Check spam or try a different address.",
      verifyingTitle: "Verifying Link",
      verifyingBody: "Verifying your recovery link…",
      verifiedTitle: "Email Confirmed",
      verifiedBody:
        "You have successfully confirmed your email.",
      continueToAccount: "Continue to Account",
      showChangeForm: "Or you want to change your password?",
      hideChangeForm: "Hide password fields",
      showChangeFormA11y: "Show password change form",
      hideChangeFormA11y: "Hide password change form",
      changeFormHint: "Reveals the new password fields",
      updatePassword: "Update Password",
      updating: "Updating...",
      recoveryEmailSent: "Recovery email sent",
      verifyingLink: "Verifying recovery link",
      emailConfirmed: "Email confirmed",
      footerPrompt: "Remembered your password?",
      footerAction: "Back to Sign In",
    },

    callback: {
      title: "Email Confirmation",
      subtitle: "Confirming your AdlaWatt account email.",
      oauthTitle: "Google Sign-In",
      oauthSubtitle: "Finishing your Google sign-in.",
      linkInvalid:
        "The confirmation link is invalid or has expired.",
      linkInvalidResend:
        "This confirmation link is invalid or has expired. Request a new one from the sign-in screen.",
      linkMissing:
        "This link arrived without its verification code. If you were resetting your password, request a fresh recovery link — otherwise request a new confirmation email.",
      confirmed: "Your email is confirmed. Taking you to your dashboard.",
      signedInGoogle:
        "Signed in with Google. Taking you to your dashboard.",
      signedIn: "You are signed in. Taking you to your dashboard.",
      googleIncomplete:
        "Google sign-in was not completed. Please try again from the sign-in screen.",
      backToSignIn: "Back to Sign In",
      goToResetPassword: "Go to Reset Password",
      footerPrompt: "Need a new account?",
      footerAction: "Create Account",
    },
  },

  menu: {
    language: {
      title: "Language",
      chooseLanguage: "Choose language",
      current: "Current: {{language}}",
    },
    title: "Menu",
    subtitle: "Browse and manage your AdlaWatt application.",
    accountProfile: "Account Profile",
    preferences: "Preferences",
    userManual: "User Manual",
    components: "Components",
    activityLogs: "Activity Logs",
    aboutUs: "About Us",
    openAccountProfile: "Open Account Profile",
    openPreferences: "Open Preferences",
    openUserManual: "Open User Manual",
    openComponents: "Open Components",
    openActivityLogs: "Open Activity Logs",
    openAboutUs: "Open About Us",
    loadingAccount: "Loading account information...",
    username: "Username",
    email: "Email",
    update: "Update",
    enterUsername: "Enter username",
    enterEmail: "Enter email",
    currentPassword: "Current Password",
    enterCurrentPassword: "Enter current password",
    keepCurrentPassword: "Leave blank to keep current",
    confirmNewPasswordPlaceholder: "Confirm new password",
    cancel: "Cancel",
    submit: "Submit",
    save: "Save",
    saving: "Saving...",
    confirm: "Confirm",
    cancelAccountChanges: "Cancel account changes",
    submitAccountChanges: "Submit account changes",
    cancelPreferences: "Cancel Preferences",
    savePreferences: "Save Preferences",
    logoutA11y: "Log out",
    exitAppA11y: "Exit app",
    themes: "Themes",
    themesA11y: "Themes",
    themeSystem: "System",
    themeDark: "Dark",
    themeLight: "Light",
    themeSystemWith: "System ({{mode}})",
    themeOptionA11y: "Theme {{option}}",
    fontSize: "Font Size",
    fontSmall: "Small",
    fontMedium: "Medium",
    fontBig: "Big",
    fontSizeOptionA11y: "Font size {{option}}",
    fontFamily: "Font Family",
    chooseFontFamily: "Choose font family",
    currentFont: "Current: {{font}}",
    vibration: "Vibration",
    vibrationHint:
      "Vibrate when important alerts are received.",
    reminders: "Reminders",
    remindersHint:
      "Daily evening review and low-sun advisories as phone banners. Works offline.",
    emailNotifications: "Email Notifications",
    emailNotificationsHint:
      "Allow AdlaWatt to send alerts and notifications through your email.",
    confirmChanges: "Confirm Changes",
    confirmChangesBody:
      "Enter your current password to confirm these account changes.",
    accountUpdated: "Account Updated",
    accountUpdatedEmailPending:
      "Your username was updated. Please confirm your new email address.",
    changesSaved: "Changes Saved",
    changesSavedMessage:
      "Your account information has been updated successfully.",
    noChanges: "No account changes were made.",
    currentPasswordRequired: "Enter your current password.",
    currentPasswordShort:
      "Current password must be at least 8 characters.",
    updateFailed: "Unable to update your account.",
    updateFailedNow:
      "Unable to update your account. Please try again.",
    logoutTitle: "Log Out",
    logoutMessage: "Are you sure you want to sign out?",
    logoutNo: "No",
    logoutYes: "Yes",
    exitTitle: "Exit",
    exitMessage:
      "Please close this tab manually to exit AdlaWatt.",
    exitWebMessage: "Are you sure you want to exit AdlaWatt?",
    exitAppTitle: "Exit App",
    exitAppMessage: "AdlaWatt will close. Are you sure?",
    exitNo: "No",
    exitYes: "Yes",
    englishName: "English",
  },

  dashboard: {
    common: {
      pullToRefresh: "Pull down to refresh",
    },
    home: {
      title: "Dashboard",
      subtitle: "Monitor your AdlaWatt system in real time.",
      applianceRecommendation: "Electronics Recommendation",
      realtimeMonitoring: "Real-Time Monitoring",
      offlineBanner:
        "You're offline — showing last readings.",
      lastUpdated:
        "Last updated {{time}}.",
      goToApplianceRecommendation:
        "Go to Electronics Recommendation",
      forecastFailed: "Could not load the forecast.",
    },
    about: {
      title: "About Us",
      subtitle: "Meet the team behind AdlaWatt.",
      teamName: "Team AdlaWatt",
      teamBio:
        "Team AdlaWatt is a group of student researchers from Northern Bukidnon State College behind the AdlaWatt off-grid solar backup power system. The team set out to give households a practical way to keep power and stay informed during outages, and has worked together from concept and hardware build-through to the design, development, and testing of the AdlaWatt mobile application. Their goal is simple: make backup energy easier to understand, safer to use, and within reach for everyday families.",
      developers: "Developers",
      roleProgrammer: "Programmer",
      roleDocumenter: "Documenter",
      roleDataAnalyst: "Data Analyst",
      dev1Bio:
        "Builds and maintains the AdlaWatt mobile application, connecting live battery, solar, and temperature data from the system's sensors into a clear, real-time experience, and developing the recommendation logic that tells users which electronics their available power can safely run.",
      dev2Bio:
        "Documents the entire AdlaWatt system, from hardware setup and safety guidance to the in-app user manual, so users and future researchers can operate, understand, and build on the project with confidence.",
      dev3Bio:
        "Studies the system's incoming sensor data, from solar generation and electronics power draw to battery performance, turning those readings into insights that improve system efficiency and keep the electronics recommendations accurate.",
      contactDetails: "Contact Details",
    },
    manual: {
      title: "User Manual",
      subtitle: "Guides for operating your AdlaWatt system.",
    },
    electronics: {
      title: "Electronics",
      subtitle: "Manage and monitor supported electronics.",
    },
    components: {
      title: "Components",
      subtitle: "Monitor AdlaWatt system components.",
    },
    analytics: {
      title: "Analytics & Trends",
      subtitle:
        "Analyze system performance, energy usage, temperature, and electronics data over time.",
      sectionBattery: "Battery",
      sectionSolar: "Solar",
      sectionEnergy: "Energy",
      sectionHealth: "Health",
      sectionUsage: "Usage",
      generateReport: "Generate Report",
      goToGenerateReport: "Go to Generate Report",
      reportSavedTitle: "Report saved",
      reportSavedTo: "Saved to",
      reportPreviewTitle: "Report preview",
      reportOpenFile: "Open file",
      reportDone: "Done",
    },
    logs: {
      title: "Activity Logs",
      subtitle:
        "System activity and electronics events will appear here.",
      total: "Total Activity Logs:",
      loadFailed:
        "We couldn't load your activity logs. Check your connection and try again.",
      timeRange: "Time Range",
      activityType: "Activity Type",
      timeAll: "All",
      timeLastHour: "Last Hour",
      timeToday: "Today",
      timeThisWeek: "This Week",
      timeThisYear: "This Year",
      typeAll: "All",
      typeInfo: "Info",
      typeWarning: "Warning",
      typeError: "Error",
      typeCritical: "Critical",
    },
    notifications: {
      title: "Notifications",
      subtitle:
        "System notifications and important alerts will appear here.",
      total: "Total Notifications:",
      loadFailed:
        "We couldn't load your notifications. Check your connection and try again.",
      markFailed:
        "Couldn't mark notifications as read. Please try again.",
      markError:
        "Couldn't mark as read. Check your connection and try again.",
      marking: "Marking...",
      markAsRead: "Mark as Read",
      markAllAsRead: "Mark all as read",
      recent: "Recent",
      earlier: "Earlier",
      noNotifications: "No Notifications",
      noNotificationsDesc:
        "No notifications found for the selected filters.",
      timeRange: "Time Range",
      notificationType: "Notification Type",
      timeAll: "All",
      timeLastHour: "Last Hour",
      timeToday: "Today",
      timeThisWeek: "This Week",
      timeThisYear: "This Year",
      typeAll: "All",
      typeNormal: "Normal",
      typeAlert: "Alert",
    },
  },

  shared: {
    close: "Close",
    signedInAs: "Signed in as {{username}}",
    notifications: "Notifications",
    emptyTitle: "No Activity Logs",
    emptyDescription:
      "No activities match the selected filters.",
    errorTitle: "Couldn't load data",
    retry: "Try Again",
    paginationPrev: "Prev",
    paginationNext: "Next",
    paginationPage: "Page {{current}} of {{total}}",
    no: "No",
    yes: "Yes",
    cancel: "Cancel",
  },

  media: {
    title: "Choose Photo",
    chooseFromLibrary: "Choose from Library",
    opening: "Opening…",
    chooseA11y: "Choose from library",
    chooseHint: "Opens your photo library",
    removePhoto: "Remove Photo",
    removeA11y: "Remove photo",
    removeHint:
      "Removes the current photo and restores the default icon",
    cancelChoiceA11y: "Cancel photo choice",
    permissionDenied:
      "AdlaWatt needs photo access to attach a picture. Allow access in your device Settings, then try again.",
    unreadable: "Could not read that photo. Try another one.",
    tooBig: "That photo is over 5 MB. Choose a smaller one.",
    processFailed:
      "Could not process that photo. Try another one.",
    libraryFailed:
      "Could not open your photo library. Try again.",
  },

  applianceBox: {
    editAppliance: "Edit electronics item",
    archiveAppliance: "Archive electronics item",
    unarchiveAppliance: "Unarchive electronics item",
    deleteAppliance: "Delete electronics item",
    showOptions: "Show electronics options",
    hideOptions: "Hide electronics options",
    deleteQuestion: "You want to delete this?",
    doNotDelete: "Do not delete electronics item",
    confirmDelete: "Confirm delete electronics item",
    archiveQuestion: "Archive this electronics item?",
    unarchiveQuestion: "Unarchive this electronics item?",
    doNotArchive: "Do not archive electronics item",
    doNotUnarchive: "Do not unarchive electronics item",
    confirmArchive: "Confirm archive electronics item",
    confirmUnarchive: "Confirm unarchive electronics item",
  },

  activityCard: {
    recentActivity: "Recent Activity",
    viewAll: "View All",
    viewAllActivity: "View all activity",
    fallbackDetails: "No activity details available.",
    fallbackTitle: "Activity",
    typeA11y: "Type {{label}}",
  },

  notificationCard: {
    fallbackTitle: "Notification",
    fallbackDetails: "No notification details available.",
    newTypeA11y: "New, Type {{label}}",
    typeA11y: "Type {{label}}",
  },

  onboarding: {
    skip: "Skip",
    proceed: "Proceed to Dashboard",
    swipeHint: "Swipe to continue",
    page: "Page {{current}} of {{total}}",
    welcome: {
      title: "Welcome to AdlaWatt",
      subtitle: "Know your solar power, anytime.",
    },
    about: {
      title: "What is AdlaWatt?",
      subtitle:
        "AdlaWatt is an off-grid solar backup power monitor. It tracks your solar, battery, temperature, and output with real-time data from your device.",
    },
    features: {
      title: "Key Features",
      bulletDashboard: "Live dashboard with gauges",
      bulletAlerts: "Smart alerts for unsafe levels",
      bulletPlanner: "Electronics planner and recommendations",
      bulletLog: "Activity log and history",
    },
    goals: {
      title: "Our Goals",
      bulletReliable: "Keep your backup power reliable",
      bulletBattery: "Protect the battery from damage",
      bulletWise: "Help you use energy wisely",
      bulletLanguages:
        "Easy for everyone — English, Cebuano, Tagalog",
    },
    finish: {
      title: "You're All Set",
      subtitle: "Your power, in your hands.",
    },
  },
} as const;

export default en;
export type EnStrings = typeof en;
