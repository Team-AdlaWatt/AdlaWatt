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

    session: {
      notFoundTitle: "Account Not Existing",
      notFoundBody:
        "This account no longer exists. Please sign in again.",
      backToSignIn: "Back to Sign In",
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
    addDevice: "Add Device",
    openAccountProfile: "Open Account Profile",
    openPreferences: "Open Preferences",
    openUserManual: "Open User Manual",
    openComponents: "Open Components",
    openActivityLogs: "Open Activity Logs",
    openAboutUs: "Open About Us",
    openAddDevice: "Open Add Device",
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
    messagePanel: "Guidance Messages",
    messagePanelHint:
      "Show short in-app tips that explain what's happening, like the vibration notice.",
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

  guidance: {
    vibration: {
      title: "Warning detected",
      body: "Your phone is vibrating so you don't miss the warning.",
      hint: "You can turn vibration off in Preferences.",
      openPreferences: "Open Preferences",
      dontShowAgain:
        "Don't show messages like this again",
      closeA11y: "Close message",
    },
  },

  dashboard: {
    common: {
      pullToRefresh: "Pull down to refresh",
      scrollToTop: "Scroll to top",
    },
    addDevice: {
      title: "Add Device",
      subtitle: "Connect and set up your AdlaWatt monitoring device.",
      provisioningNote:
        "Any signed-in user can set this device's Wi-Fi config and monitoring account.",
      deviceLabel: "AdlaWatt Device",
      deviceName: "AW-01 ? ESP32-S3",
      bluetoothName: "Bluetooth device: AdlaWatt-AW-01",
      bluetoothHint: "Looks for nearby AdlaWatt devices ({{prefix}}). You do not need to pair in phone settings.",
      bluetoothReadyShort: "Bluetooth ready",
      bluetoothNotReadyShort: "Bluetooth not ready",
      scanSection: "Find Your Device",
      scanSectionHint: "Turn on Bluetooth and allow permission, then scan for your AdlaWatt device.",
      readyToScan: "Bluetooth is ready. Tap Scan for Devices to continue.",
      scanBlocked: "Turn on Bluetooth and allow permission to scan.",
      scan: "Scan for Devices",
      scanAgain: "Scan Again",
      showDevices: "Show Devices",
      scanning: "Scanning...",
      scanningHint: "Looking for nearby AdlaWatt devices...",
      scanTitle: "Select Device",
      noDevices: "No devices found",
      noDevicesDescription:
        "Keep your AdlaWatt device powered on and nearby, then try scanning again.",
      noDevicesHint: "No AdlaWatt devices were found. Make sure the device is on and close by, then tap Scan Again.",
      selectDevice: "Select a Bluetooth device",
      selectedDevice: "Selected device",
      wifiSection: "Wi-Fi Configuration",
      wifiSsid: "Network Name (SSID)",
      wifiSsidPlaceholder: "Enter Wi-Fi name",
      wifiPassword: "Wi-Fi Password",
      wifiPasswordPlaceholder: "Enter Wi-Fi password",
      wifiSsidRequired: "Enter your Wi-Fi name.",
      wifiPasswordRequired: "Enter your Wi-Fi password.",
      accountSection: "Account",
      loggedInAs: "Logged in as",
      assignmentCheckingUser: "Checking your account...",
      assignmentChecking: "Retrieving your monitoring assignment...",
      assignmentVerified: "Monitoring assignment verified",
      assignmentMissing:
        "No monitoring assignment found for this account.",
      assignmentError:
        "Unable to verify your monitoring assignment.",
      assignmentSessionExpired:
        "Your session is unavailable or has expired. Sign in again and try again.",
      assignmentQueryFailed:
        "Unable to retrieve your monitoring assignment. We'll retry automatically.",
      assignmentAmbiguous:
        "Your monitoring assignment could not be determined. Please contact support.",
      assignmentInvalid:
        "Your monitoring assignment is invalid. Please contact support.",
      loginRequired: "Sign in to configure a device.",
      send: "Send Configuration",
      sending: "Sending...",
      retry: "Retry",
      assignmentRetry: "Retry assignment",
      routeErrorTitle:
        "This screen could not be displayed.",
      routeErrorBody:
        "Try again. If the problem continues, reopen the app.",
      routeErrorRetry: "Try Again",
      previewTitle: "Preview status",
      previewOpen: "Open status preview",
      previewNote: "Preview mode - not a real device status",
      bluetoothNotReady: "Bluetooth is not ready. Turn it on and allow permission, then try again.",
      turnOnBluetooth: "Turn On Bluetooth",
      turningOnBluetooth: "Turning on...",
      openBluetoothSettings: "Open Bluetooth Settings",
      openSettings: "Open Settings",
      grantPermission: "Grant Permission",
      checkingPermissions: "Checking...",
      bluetoothEnableDeclined:
        "Bluetooth was not turned on. Turn it on to find your AdlaWatt device.",
      bluetoothIosInstructions:
        "To turn on Bluetooth, open Control Center or Settings, then come back here.",
      readiness_checking: "Checking Bluetooth",
      readiness_checking_body:
        "Checking Bluetooth and permission status...",
      readiness_unknown: "Checking Bluetooth",
      readiness_unknown_body:
        "Waiting for Bluetooth status...",
      readiness_resetting: "Bluetooth is resetting",
      readiness_resetting_body:
        "Bluetooth is restarting. Please wait a moment.",
      readiness_unsupported: "Bluetooth not supported",
      readiness_unsupported_body:
        "This device does not support Bluetooth needed to connect to AdlaWatt.",
      readiness_unauthorized: "Bluetooth not available",
      readiness_unauthorized_body:
        "AdlaWatt cannot use Bluetooth on this device. Check your system settings and try again.",
      readiness_poweredOff: "Bluetooth is turned off",
      readiness_poweredOff_body:
        "Bluetooth is needed to find and connect to your AdlaWatt monitoring device. Turn on Bluetooth to continue.",
      readiness_permission_required: "Bluetooth permission needed",
      readiness_permission_required_body:
        "Allow Bluetooth permission so AdlaWatt can find and connect to your device.",
      readiness_permission_denied: "Bluetooth permission denied",
      readiness_permission_denied_body:
        "Bluetooth permission is needed to scan for your AdlaWatt device. You can allow it and try again.",
      readiness_permission_blocked: "Bluetooth permission blocked",
      readiness_permission_blocked_body:
        "Bluetooth permission is blocked in system settings. Open Settings to allow it, then return here.",
      readiness_ready: "Bluetooth is ready",
      readiness_ready_body:
        "You can scan for nearby AdlaWatt devices now.",
      provisioning: "Setting up device",
      success: "Configuration saved successfully",
      connectionFailed: "Connection failed",
      status_idle: "Ready to configure",
      status_scanning: "Scanning for devices",
      status_connecting: "Connecting to device",
      status_connected: "Connected to AW-01 over Bluetooth",
      status_subscribed: "Device status notifications are ready",
      status_writing: "Sending Wi-Fi configuration and monitor ID to AW-01",
      status_received: "Configuration received by device",
      status_busy: "Device is processing the request",
      status_wifi_connected: "Device connected to Wi-Fi",
      status_wifi_failed: "Wi-Fi connection failed",
      status_wifi_lost: "Wi-Fi connection lost",
      status_configured: "Configuration saved successfully",
      status_error: "Provisioning error",
      status_disconnected: "Bluetooth disconnected",
      status_timeout: "Setup timed out",
      timeout: "Setup timed out",
      timeoutBody:
        "The device did not finish setup within {{seconds}} seconds. Keep it powered on and nearby, then try again.",
      validationSsidRequired: "Enter a Wi-Fi network name.",
      validationSsidTooLong: "The Wi-Fi network name is too long.",
      validationPasswordTooLong: "The Wi-Fi password is too long.",
      validationMonitorIdInvalid: "The monitor ID is invalid.",
      validationInvalidText: "The Wi-Fi details contain an invalid character.",
      errorTitle: "Provisioning failed",
      errorBody:
        "The device could not complete the request. Check the details and try again.",
      bleWriteNotPermitted:
        "AW-01 does not accept this Bluetooth write mode. Update the device firmware and try again.",
      bleTxDescriptorMissing:
        "AW-01 is missing the status notification descriptor. Update the device firmware and try again.",
      bleCharacteristicNotFound:
        "A required Bluetooth characteristic was not found. Keep the device nearby and try again.",
      bleServiceNotFound:
        "The AW-01 Bluetooth service was not found. Power-cycle the device and try again.",
      bleOperationTimeout:
        "The Bluetooth operation timed out. Keep the device powered on and nearby, then try again.",
      bleOperationCancelled:
        "The Bluetooth operation was cancelled. Try again.",
      bleDisconnected:
        "Bluetooth disconnected during setup. Keep the device powered on and nearby, then try again.",
      bleGattError:
        "The device rejected the Bluetooth write. Update the device firmware and try again.",
      permissionDenied:
        "Bluetooth permission is required to find the device.",
      bluetoothOff: "Turn on Bluetooth to continue.",
    },
    home: {
      title: "Dashboard",
      subtitle: "Monitor your AdlaWatt system in real time.",
      electronicsRecommendation: "Electronics Recommendation",
      realtimeMonitoring: "Real-Time Monitoring",
      offlineBanner:
        "You're offline — showing last readings.",
      deviceOfflineBanner:
        "Device is offline — showing last readings.",
      lastUpdated:
        "Last updated {{time}}.",
      deviceLastSeen:
        "Last seen {{time}}.",
      deviceLastSeenUnavailable:
        "Last seen unavailable.",
      goToElectronicsRecommendation:
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
    preferences: {
      title: "Preferences",
      subtitle:
        "Control appearance, language, alerts, and notifications.",
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
        "Review solar collection, load use, and battery activity for the selected range.",
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

  electronicsBox: {
    editElectronics: "Edit electronics item",
    archiveElectronics: "Archive electronics item",
    unarchiveElectronics: "Unarchive electronics item",
    deleteElectronics: "Delete electronics item",
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

  batteryEnergy: {
    title: "Usable energy",
    value: "{{wh}} Wh",
    ofUsable: "of {{capacity}} Wh usable",
    reserve: "{{wh}} Wh protected reserve",
    status: {
      normal: "Healthy",
      warning: "Low energy",
      critical: "Critical",
      waiting: "Waiting for data",
    },
    selectedLoad:
      "Selected: {{ac}} W AC · {{battery}} W from battery",
    liveDraw: "Live draw: {{watts}} W",
    timeRemaining: "Est. time left: {{time}}",
  },

  batteryProtection: {
    warningTitle: "Usable energy is low",
    warningBody:
      "Only {{wh}} Wh of usable energy remains. Avoid switching on new appliances.",
    criticalTitle:
      "Unplug unnecessary electronics",
    criticalBody:
      "Usable energy is down to {{percent}}%. Unplug all nonessential loads now.",
    newLoadTitle: "Unlisted load detected",
    newLoadBody:
      "Live draw is about {{watts}} W above the selected load. Check what is plugged in.",
    review: "Review electronics",
    criticalInstructions:
      "Unplug all nonessential appliances, then review the connected electronics.",
    recovering:
      "Verifying stable load and usable energy...",
    dismiss: "Got it",
    blocked:
      "New selections are paused while battery protection is active. You can still remove appliances.",
    closeA11y:
      "Dismiss battery protection notice",
    reviewTitle: "Electronics review",
    reviewBody:
      "These are the appliances counted in the current recommendation.",
    done: "Done",
  },

  electronicsModal: {
    checkRecommendation: "Check Recommendation",
    done: "Done",
    saving: "Saving...",
    selectAtLeastOne:
      "Select at least one appliance before continuing.",
    notAdvisableBlocked:
      "This selection is not advisable. Change the selection and check again.",
    detectedHeader:
      "electronics plugged detected, check the recommendation for accurate guidance",
    reserveBlocked:
      "This load would use all remaining usable energy. Unplug a load or change the selection before continuing.",
  },

  recommendationResult: {
    title: "Recommendation",
    status: {
      empty: "No electronics selected",
      waiting: "Waiting for battery data",
      blocked: "Battery check needed",
      ready: "Combined recommendation",
    },
    verdict: {
      recommended: "OK to use",
      care: "Use with care",
      notRecommended: "Not advisable",
      unknown: "Waiting",
    },
    badgeA11y: "Recommendation: {{label}}",
    reason: {
      empty:
        "Select electronics to see a recommendation.",
      waiting:
        "Waiting for a fresh battery reading.",
      offline:
        "Waiting for the device to come online.",
      stale:
        "Battery reading is too old. Waiting for fresh data.",
      blocked:
        "Battery readings are outside safe limits.",
      invalidWattage:
        "One or more wattage values are invalid.",
      overCap:
        "Combined peak load exceeds the safe cap.",
      unsafeVoltage:
        "Combined peak load would drop voltage below safe levels.",
      highDrain:
        "This combination uses too much usable energy per hour.",
      care: "Usable with care — keep the load light.",
      recommended:
        "Safe to use with this battery level.",
    },
    remainingBattery:
      "Estimated remaining usable energy",
    estimatedRuntime: "Estimated runtime",
    combinedPeak: "Combined peak load (battery side)",
    currentLoad: "Current load",
    alternativesTitle: "Better options",
    noAlternatives:
      "No alternatives available right now.",
    estimateNote:
      "Estimates use catalog wattage, not live appliance detection.",
  },
} as const;

export default en;
export type EnStrings = typeof en;
