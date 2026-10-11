// ============================================================
// CEBUANO (draft translations for native review — keys
// mirror en.ts exactly)
// ============================================================

const ceb = {
  common: {
    or: "O",
    resendIn: "Ipadala pag-usab sa {{seconds}}s",
    resending: "Gipadala pag-usab...",
    wentWrong:
      "May sayop nga nahitabo. Palihug sulayi pag-usab.",
    noConnection:
      "Walay koneksyon. Susiha ang imong internet ug sulayi pag-usab.",
    tooManyRequests:
      "Sobra kadaghan ang pagsulay. Paghulat ug sulayi pag-usab.",
    confirmationThrottled:
      "Bag-o lang nagpadala ug confirmation email. Paghulat sa dili pa mangayo pag-usab.",
    authRequired: "Walay naka-authenticate nga user.",
    accountLoadFailed:
      "Dili ma-load ang impormasyon sa imong account.",
  },

  validation: {
    emailRequired: "Palihug isulod ang imong email address.",
    emailInvalid:
      "Palihug isulod ang balido nga email address.",
    usernameRequired: "Palihug isulod ang username.",
    usernameShort:
      "Ang username kinahanglan dili mominus sa 3 ka karakter.",
    usernameLong:
      "Ang username dili molapas sa 30 ka karakter.",
    usernameChars:
      "Ang username mahimo lang nga adunay mga letra, numero, ug underscore.",
    passwordShort:
      "Ang password kinahanglan dili mominus sa 8 ka karakter.",
    passwordLong:
      "Ang password dili molapas sa 72 ka karakter.",
    passwordsMismatch:
      "Dili magtugma ang mga password. Palihug susiha ang duha ka password field.",
    identifierRequired:
      "Palihug isulod ang imong username o email ug password.",
    identifierEmpty:
      "Palihug isulod ang imong username o email.",
    passwordEmpty: "Palihug isulod ang imong password.",
    termsRequired: "Palihug uyon sa Terms and Conditions.",
    termsRequiredLong:
      "Palihug uyon sa Terms and Conditions sa dili pa buhaton ang imong account.",
  },

  passwordInput: {
    labelPassword: "Password",
    labelNewPassword: "Bag-ong Password",
    labelConfirmNewPassword:
      "Kumpirmahi ang Bag-ong Password",
    placeholderPassword: "Isulod ang imong password",
    placeholderNewPassword: "Pagbuhat ug password",
    placeholderConfirmPassword:
      "Kumpirmahi ang imong password",
    placeholderCreateNew: "Pagbuhat ug bag-ong password",
    placeholderConfirmNew:
      "Kumpirmahi ang imong bag-ong password",
    showA11y: "Ipakita ang password sulod sa 5 segundos",
    showHint: "Nagpakita sa password sulod sa 5 segundos",
    hideA11y:
      "Tagoa ang password, awtomatikong motago sa {{seconds}} ka segundos",
    hideHint:
      "Makita ang password ug awtomatikong motago",
    visibleLive:
      "Makita ang password, motago sa {{seconds}} ka segundos",
    visibleHint:
      "Nagpakita sa password… motago sa {{seconds}}s",
  },

  auth: {
    login: {
      title: "Maayong Pagbalik",
      subtitle:
        "Pag-sign in aron magpadayon sa paggamit sa AdlaWatt.",
      identifierLabel: "Username o Email",
      identifierPlaceholder:
        "Isulod ang imong username o email",
      forgotPassword: "Nalimtan ang Password?",
      forgotPasswordLabel: "Nalimtan ang password",
      forgotPasswordHint:
        "Bawi-a ang imong password pinaagi sa email",
      signIn: "Pag-Sign In",
      signingIn: "Nag-sign In...",
      dividerOr: "O",
      continueWithGoogle: "Padayon gamit ang Google",
      connecting: "Nagkonek...",
      googleA11y: "Padayon gamit ang Google",
      googleHint:
        "Pag-sign in gamit ang imong Google account",
      invalidCredentials: "Sayop ang username o password.",
      signInFailed:
        "Dili ka namo ma-sign in. Palihug susiha ang imong impormasyon ug sulayi pag-usab.",
      sessionFailed: "Dili makabuhat ug login session.",
      sessionFailedNow:
        "Dili makapag-sign in karon. Palihug sulayi pag-usab.",
      emailNotConfirmed:
        "Palihug kumpirmahi ang imong email address sa dili pa mag-sign in. Susiha ang imong inbox para sa confirmation link.",
      tooManyAttempts:
        "Sobra kadaghan ang pagsulay sa pag-sign in. Paghulat ug sulayi pag-usab.",
      googleUnavailable:
        "Dili available ang Google sign-in karon. Palihug sulayi pag-usab.",
      googleIncomplete:
        "Wala mahuman ang Google sign-in. Palihug sulayi pag-usab.",
      googleFailed:
        "Dili makapag-sign in gamit ang Google karon. Palihug sulayi pag-usab.",
      verifyTitle: "I-verify ang Imong Email",
      verifySent: "• Napadala",
      verifyTo: "Ngadto kang:",
      verifyBody:
        "Kinahanglan ug beripikasyon ang imong account sa dili pa ka makapag-sign in.",
      verifySentFresh:
        "Bag-o lang namo gipadala ug confirmation link. Susiha ang imong inbox.",
      verifySentRecent:
        "Bag-o lang nagpadala ug link. Pindota ang resend sa ubos kung wala pa kini moabot.",
      verifySendFresh:
        "Pindota ang resend sa ubos para sa bag-ong confirmation link.",
      resendConfirmation:
        "Ipadala pag-usab ang confirmation email",
      footerPrompt: "Wala pa kay account?",
      footerAction: "Pagbuhat ug Account",
      testAdminTitle: "Test admin account (dev only)",
      testAdminHint:
        "Pag-sign in gamit kini nga mga kredensyal aron masilip ang admin dashboard.",
      testAdminEmailLabel: "Email",
      testAdminUsernameLabel: "Username",
      testAdminPasswordLabel: "Password",
    },

    register: {
      title: "Pagbuhat ug Account",
      subtitle:
        "Buhata ang imong AdlaWatt account aron sugdan ang pagmonitor sa imong enerhiya.",
      usernameLabel: "Username",
      usernamePlaceholder: "Isulod ang imong username",
      emailLabel: "Email Address",
      emailPlaceholder: "Isulod ang imong email",
      agreePrefix: "Mouyon ako sa ",
      termsLink: "Terms and Conditions",
      agreeA11y: "Uyon sa Terms and Conditions",
      openTermsA11y: "Ablihi ang Terms and Conditions",
      createAccount: "Pagbuhat ug Account",
      creatingAccount: "Naghimo ug Account...",
      accountFailed: "Dili mabuhat ang imong account.",
      accountTaken:
        "Dili mabuhat ang imong account gamit kini nga mga detalye. Sulayi pag-sign in hinuon.",
      tooManyAttempts:
        "Sobra kadaghan ang pagsulay. Paghulat ug sulayi pag-usab.",
      accountNotCreated: "Dili mabuhat ang account.",
      accountFailedNow:
        "Dili mabuhat ang imong account. Palihug sulayi pag-usab.",
      checkEmailTitle: "Susiha ang imong email",
      confirmationSent:
        "Nagpadala kami ug confirmation link sa {{email}}. I-click ang link aron i-verify ang imong account, dayon pag-sign in.",
      resendConfirmation:
        "Ipadala pag-usab ang confirmation email",
      continueToSignIn: "Padayon sa Sign In",
      useDifferentEmail: "Paggamit ug laing email address",
      useDifferentEmailA11y:
        "Paggamit ug laing email address",
      resendFailed:
        "Dili mapadala pag-usab ang confirmation email.",
      footerPrompt: "Naana kay account?",
      footerAction: "Pag-Sign In",
      googleHint: "Pagbuhat ug imong account gamit ang Google",
    },

    forgot: {
      title: "I-reset ang Password",
      subtitleRequest:
        "Isulod ang email sa imong account. Padad-an ka namo ug recovery link.",
      subtitleVerified:
        "Nakumpirma ang imong email. Padayon sa imong account o pagbutang ug bag-ong password.",
      emailLabel: "Email Address",
      emailPlaceholder: "Isulod ang imong email",
      sendLink: "Ipadala ang Recovery Link",
      sending: "Gipadala...",
      sendFailed:
        "Dili makapadala ug recovery email karon. Palihug sulayi pag-usab.",
      recoveryThrottled:
        "Bag-o lang nagpadala ug recovery email. Paghulat sa dili pa mangayo pag-usab.",
      recoveryFailed:
        "Dili makapadala ug recovery email karon. Palihug sulayi pag-usab.",
      recoveryLinkBad:
        "Dili balido o na-expire na kini nga recovery link. Pagpangayo ug bag-o sa ubos.",
      recoveryLinkWrong:
        "Dili kini password recovery link. Pagpangayo ug bag-ong recovery email sa ubos.",
      recoveryExpired:
        "Dili balido o na-expire na kini nga recovery link. Pagpangayo ug bag-o.",
      recoveryUpdateFailed:
        "Dili ma-update ang imong password karon. Palihug sulayi pag-usab.",
      checkEmailTitle: "Susiha ang Imong Email",
      checkEmailSent: "• Napadala",
      checkEmailTo: "Ngadto kang:",
      checkEmailInbox: "imong inbox",
      checkEmailBody:
        "Nagpadala kami ug recovery link. I-tap kini, dayon pagbutang ug bag-ong password.",
      resendRecovery: "Ipadala pag-usab ang recovery email",
      checkEmailHint:
        "Wala madawat? Susiha ang spam o sulayi ug laing address.",
      verifyingTitle: "Gina-verify ang Link",
      verifyingBody: "Gina-verify ang imong recovery link…",
      verifiedTitle: "Nakumpirma ang Email",
      verifiedBody:
        "Malampuson nimong nakumpirma ang imong email.",
      continueToAccount: "Padayon sa Account",
      showChangeForm:
        "O gusto ba nimong usbon ang imong password?",
      hideChangeForm: "Tagoa ang mga password field",
      showChangeFormA11y:
        "Ipakita ang form sa pag-usab sa password",
      hideChangeFormA11y:
        "Tagoa ang form sa pag-usab sa password",
      changeFormHint:
        "Nagpakita sa bag-ong mga password field",
      updatePassword: "I-update ang Password",
      updating: "Gina-update...",
      recoveryEmailSent: "Napadala ang recovery email",
      verifyingLink: "Gina-verify ang recovery link",
      emailConfirmed: "Nakumpirma ang email",
      footerPrompt: "Nahinumdom ka sa imong password?",
      footerAction: "Balik sa Sign In",
    },

    callback: {
      title: "Kumpirmasyon sa Email",
      subtitle:
        "Gina-kumpirma ang email sa imong AdlaWatt account.",
      oauthTitle: "Google Sign-In",
      oauthSubtitle: "Ginatapos ang imong Google sign-in.",
      linkInvalid:
        "Dili balido o na-expire na ang confirmation link.",
      linkInvalidResend:
        "Dili balido o na-expire na kini nga confirmation link. Pagpangayo ug bag-o gikan sa sign-in screen.",
      linkMissing:
        "Miabot kini nga link nga walay verification code. Kung nag-reset ka sa imong password, pagpangayo ug bag-ong recovery link — kung dili, pagpangayo ug bag-ong confirmation email.",
      confirmed:
        "Nakumpirma ang imong email. Dad-on ka sa imong dashboard.",
      signedInGoogle:
        "Naka-sign in gamit ang Google. Dad-on ka sa imong dashboard.",
      signedIn:
        "Naka-sign in ka. Dad-on ka sa imong dashboard.",
      googleIncomplete:
        "Wala mahuman ang Google sign-in. Palihug sulayi pag-usab gikan sa sign-in screen.",
      continueToDashboard: "Padayon sa Dashboard",
      backToSignIn: "Balik sa Sign In",
      goToResetPassword: "Adto sa Reset Password",
      footerPrompt: "Kinahanglan ug bag-ong account?",
      footerAction: "Pagbuhat ug Account",
    },
  },

  menu: {
    language: {
      title: "Pinulongan",
      chooseLanguage: "Pagpili ug pinulongan",
      current: "Karon: {{language}}",
    },
    title: "Menu",
    subtitle: "Tan-awa ug dumalaha ang imong AdlaWatt application.",
    accountProfile: "Profile sa Account",
    preferences: "Mga Kagustuhan",
    userManual: "Manwal sa Gumagamit",
    components: "Mga Komponente",
    activityLogs: "Mga Tala sa Aktibidad",
    aboutUs: "Mahitungod Kanamo",
    openAccountProfile: "Ablihi ang Account Profile",
    openPreferences: "Ablihi ang Preferences",
    openUserManual: "Ablihi ang User Manual",
    openComponents: "Ablihi ang Components",
    openActivityLogs: "Ablihi ang Activity Logs",
    openAboutUs: "Ablihi ang About Us",
    loadingAccount: "Nag-load sa impormasyon sa account...",
    username: "Username",
    email: "Email",
    update: "Update",
    enterUsername: "Isulod ang username",
    enterEmail: "Isulod ang email",
    currentPassword: "Current Password",
    enterCurrentPassword: "Isulod ang current password",
    keepCurrentPassword: "Biyai nga blangko aron magpabilin",
    confirmNewPasswordPlaceholder: "Kumpirmahi ang bag-ong password",
    cancel: "Cancel",
    submit: "Submit",
    save: "Save",
    saving: "Nag-save...",
    confirm: "Confirm",
    cancelAccountChanges: "Kanselahon ang mga pagbag-o sa account",
    submitAccountChanges: "Isumite ang mga pagbag-o sa account",
    cancelPreferences: "Kanselahon ang Preferences",
    savePreferences: "I-save ang Preferences",
    logoutA11y: "Pag-log out",
    exitAppA11y: "Isira ang app",
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
    chooseFontFamily: "Pagpili ug font family",
    currentFont: "Karon: {{font}}",
    vibration: "Vibration",
    vibrationHint: "Mag-vibrate kung adunay importanteng alerto.",
    reminders: "Reminders",
    remindersHint:
      "Adlaw-adlaw nga evening review ug low-sun advisories isip phone banners. Moandar offline.",
    emailNotifications: "Email Notifications",
    emailNotificationsHint:
      "Tugoti ang AdlaWatt nga magpadala ug mga alerto sa imong email.",
    confirmChanges: "Kumpirmahi ang mga Pagbag-o",
    confirmChangesBody:
      "Isulod ang imong current password aron kumpirmahon kini nga mga pagbag-o.",
    accountUpdated: "Na-update ang Account",
    accountUpdatedEmailPending:
      "Na-update ang imong username. Palihug kumpirmahi ang imong bag-ong email address.",
    changesSaved: "Nai-save ang mga Pagbag-o",
    changesSavedMessage: "Malampuson nga na-update ang imong account.",
    noChanges: "Walay gihimong pagbag-o sa account.",
    currentPasswordRequired: "Isulod ang imong current password.",
    currentPasswordShort:
      "Ang current password kinahanglan dili mominus sa 8 ka karakter.",
    updateFailed: "Dili ma-update ang imong account.",
    updateFailedNow:
      "Dili ma-update ang imong account. Palihug sulayi pag-usab.",
    logoutTitle: "Pag-Log Out",
    logoutMessage: "Sigurado ka nga gusto kang mag-sign out?",
    logoutNo: "Dili",
    logoutYes: "Oo",
    exitTitle: "Gawas",
    exitMessage: "Palihug isira kini nga tab aron mogawas sa AdlaWatt.",
    exitWebMessage: "Sigurado ka nga gusto kang mogawas sa AdlaWatt?",
    exitAppTitle: "Isira ang App",
    exitAppMessage: "Isira ang AdlaWatt. Sigurado ka?",
    exitNo: "Dili",
    exitYes: "Oo",
    englishName: "English",
  },

  dashboard: {
    home: {
      title: "Dashboard",
      subtitle: "I-monitor ang imong AdlaWatt system nga real time.",
      applianceRecommendation: "Appliance Recommendation",
      realtimeMonitoring: "Real-Time Monitoring",
      goToApplianceRecommendation: "Adto sa Appliance Recommendation",
      offlineBanner:
        "Wala kay koneksyon — katapusang readings ang gipakita.",
      lastUpdated:
        "Katapusang na-update {{time}}.",
      forecastFailed: "Dili ma-load ang forecast.",
    },
    about: {
      title: "About Us",
      subtitle: "Pagkat-on bahin sa AdlaWatt ug sa katuyoan niini.",
      tagline:
        "Usa ka IoT-Based Off-Grid Solar Backup Power System nga adunay Real-Time Energy Monitoring ug Appliance Recommendation",
      overview:
        "Ang AdlaWatt usa ka madalang off-grid solar backup power system nga gidisenyo aron hatagan ang mga panimalay ug barato ug kasaligan nga kuryente panahon sa brownout. Gikolekta sa system ang solar energy gamit ang solar panel, gitipigan kini sa baterya sulod sa secure nga lockable enclosure, ug naghatag ug backup power sa adlaw-adlaw nga mga appliance pinaagi sa built-in AC outlet. Pinaagi sa real-time sensors ug yano nga mobile application, makita sa mga user ang live nga battery levels, mosulod nga solar power, konsumo sa enerhiya, ug mga safety temperature, samtang makadawat ug maalamon nga appliance recommendation base sa nahabilin nga battery capacity. Sa paghiusa sa real-time monitoring ug giya sa enerhiya, gihatagan sa AdlaWatt ang mga pamilya ug katakus nga kontrolon ang ilang paggamit sa enerhiya, magpabiling luwas ang importanteng mga device, ug magpabilin ang kuryente panahon sa blackout.",
      developers: "Mga Developer",
      roleProgrammer: "Programmer",
      roleDocumenter: "Documenter",
      roleDataAnalyst: "Data Analyst",
      dev1Bio:
        "Nag-develop ug nag-maintain sa software ug system firmware, gihiusa ang real-time sensor data, lakip ang battery levels, solar input, ug temperature, sa mobile app ug nag-program sa recommendation algorithms.",
      dev2Bio:
        "Nagsulat ug user manuals, system setup guides, technical documentation, ug safety instructions para sa pagpadagan sa AdlaWatt hardware ug mobile application.",
      dev3Bio:
        "Nag-analisar sa mosulod nga sensor telemetry, lakip ang solar generation patterns, konsumo sa kuryente sa mga appliance, ug performance sa baterya, aron ma-optimize ang efficiency sa system ug mapalambo ang smart appliance recommendations.",
      contactDetails: "Contact Details",
    },
    manual: {
      title: "User Manual",
      subtitle: "Mga giya sa pagpadagan sa imong AdlaWatt system.",
    },
    appliances: {
      title: "Mga Appliance",
      subtitle: "Dumalaha ug i-monitor ang gisuportahang mga appliance.",
    },
    components: {
      title: "Mga Komponente",
      subtitle: "I-monitor ang mga component sa AdlaWatt system.",
    },
    analytics: {
      title: "Analytics ug Trends",
      subtitle:
        "Susiha ang performance sa system, paggamit sa enerhiya, temperatura, ug datos sa appliance sa paglabay sa panahon.",
      sectionBattery: "Baterya",
      sectionSolar: "Solar",
      sectionEnergy: "Enerhiya",
      sectionHealth: "Panglawas",
      sectionUsage: "Paggamit",
      generateReport: "Generate Report",
      goToGenerateReport: "Adto sa Generate Report",
    },
    logs: {
      title: "Activity Logs",
      subtitle: "Dinhi makita ang aktibidad sa system ug mga event sa appliance.",
      total: "Tibuok Activity Logs:",
      loadFailed:
        "Dili ma-load ang imong activity logs. Susiha ang imong koneksyon ug sulayi pag-usab.",
      timeRange: "Sakop sa Oras",
      activityType: "Matang sa Aktibidad",
      timeAll: "Tanan",
      timeLastHour: "Miaging Oras",
      timeToday: "Karon",
      timeThisWeek: "Kining Semanaha",
      timeThisYear: "Kining Tuiga",
      typeAll: "Tanan",
      typeInfo: "Info",
      typeWarning: "Pahimangno",
      typeError: "Error",
      typeCritical: "Kritikal",
    },
    notifications: {
      title: "Mga Notification",
      subtitle: "Dinhi makita ang mga notification sa system ug importanteng mga alerto.",
      total: "Tibuok Notification:",
      loadFailed:
        "Dili ma-load ang imong mga notification. Susiha ang imong koneksyon ug sulayi pag-usab.",
      markFailed: "Dili ma-mark as read ang mga notification. Palihug sulayi pag-usab.",
      markError: "Dili ma-mark as read. Susiha ang imong koneksyon ug sulayi pag-usab.",
      marking: "Gina-mark...",
      markAsRead: "Mark as Read",
      markAllAsRead: "I-mark tanan as read",
      recent: "Bag-o",
      earlier: "Kaniadto",
      noNotifications: "Walay Notification",
      noNotificationsDesc: "Walay notification para sa napiling mga filter.",
      timeRange: "Sakop sa Oras",
      notificationType: "Matang sa Notification",
      timeAll: "Tanan",
      timeLastHour: "Miaging Oras",
      timeToday: "Karon",
      timeThisWeek: "Kining Semanaha",
      timeThisYear: "Kining Tuiga",
      typeAll: "Tanan",
      typeNormal: "Normal",
      typeAlert: "Alerto",
    },
  },

  shared: {
    close: "Isira",
    signedInAs: "Naka-sign in isip {{username}}",
    notifications: "Mga Notification",
    emptyTitle: "Walay Activity Logs",
    emptyDescription: "Walay aktibidad nga motugma sa mga filter.",
    errorTitle: "Dili ma-load ang data",
    retry: "Sulayi Pag-usab",
    paginationPrev: "Miagi",
    paginationNext: "Sunod",
    paginationPage: "Pahina {{current}} sa {{total}}",
    no: "Dili",
    yes: "Oo",
    cancel: "Cancel",
  },

  media: {
    title: "Pagpili ug Hulagway",
    chooseFromLibrary: "Pagpili gikan sa Library",
    opening: "Giablihan…",
    chooseA11y: "Pagpili gikan sa library",
    chooseHint: "Giablihan ang imong photo library",
    removePhoto: "Tangtangon ang Hulagway",
    removeA11y: "Tangtangon ang hulagway",
    removeHint: "Gitangtang ang karon nga hulagway ug gibalik ang default icon",
    cancelChoiceA11y: "Kanselahon ang pagpili ug hulagway",
    permissionDenied:
      "Kinahanglan sa AdlaWatt ug photo access aron maglakip ug hulagway. Tugoti ang access sa Settings sa imong device, dayon sulayi pag-usab.",
    unreadable: "Dili mabasa kana nga hulagway. Sulayi ug lain.",
    tooBig: "Kana nga hulagway milapas sa 5 MB. Pagpili ug mas gamay.",
    processFailed: "Dili ma-process kana nga hulagway. Sulayi ug lain.",
    libraryFailed: "Dili maablihan ang imong photo library. Sulayi pag-usab.",
  },

  applianceBox: {
    editAppliance: "I-edit ang appliance",
    archiveAppliance: "I-archive ang appliance",
    unarchiveAppliance: "I-unarchive ang appliance",
    deleteAppliance: "Papason ang appliance",
    showOptions: "Ipakita ang mga opsyon sa appliance",
    hideOptions: "Tagoa ang mga opsyon sa appliance",
    deleteQuestion: "Gusto ba nimong papason kini?",
    doNotDelete: "Ayaw papasa ang appliance",
    confirmDelete: "Kumpirmahi ang pagpapasa sa appliance",
    archiveQuestion: "I-archive kini nga appliance?",
    unarchiveQuestion: "I-unarchive kini nga appliance?",
    doNotArchive: "Ayaw i-archive ang appliance",
    doNotUnarchive: "Ayaw i-unarchive ang appliance",
    confirmArchive: "Kumpirmahi ang pag-archive sa appliance",
    confirmUnarchive: "Kumpirmahi ang pag-unarchive sa appliance",
  },

  activityCard: {
    recentActivity: "Bag-ong Aktibidad",
    viewAll: "Tan-awa Tanan",
    viewAllActivity: "Tan-awa ang tanan nga aktibidad",
    fallbackDetails: "Walay detalye sa aktibidad.",
    fallbackTitle: "Aktibidad",
    typeA11y: "Matang: {{label}}",
  },

  notificationCard: {
    fallbackTitle: "Notification",
    fallbackDetails: "Walay detalye sa notification.",
    newTypeA11y: "Bag-o, Matang: {{label}}",
    typeA11y: "Matang: {{label}}",
  },
} as const;

export default ceb;
