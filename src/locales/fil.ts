// ============================================================
// FILIPINO (draft translations for native review — keys
// mirror en.ts exactly)
// ============================================================

const fil = {
  common: {
    or: "O",
    resendIn: "Muling ipadala sa {{seconds}}s",
    resending: "Muling ipinapadala...",
    wentWrong:
      "May naganap na mali. Pakisubukang muli.",
    noConnection:
      "Walang koneksyon. Suriin ang iyong internet at subukang muli.",
    tooManyRequests:
      "Masyadong maraming pagtatangka. Maghintay sandali at subukang muli.",
    confirmationThrottled:
      "Kamakailan ay nagpadala ng confirmation email. Maghintay bago humiling ng panibago.",
    authRequired: "Walang naka-authenticate na user.",
    accountLoadFailed:
      "Hindi ma-load ang impormasyon ng iyong account.",
  },

  validation: {
    emailRequired: "Pakilagay ang iyong email address.",
    emailInvalid: "Pakilagay ang wastong email address.",
    usernameRequired: "Pakilagay ang username.",
    usernameShort:
      "Ang username ay dapat na hindi bababa sa 3 karakter.",
    usernameLong:
      "Ang username ay hindi dapat lumampas sa 30 karakter.",
    usernameChars:
      "Ang username ay maaari lamang maglaman ng mga letra, numero, at underscore.",
    passwordShort:
      "Ang password ay dapat na hindi bababa sa 8 karakter.",
    passwordLong:
      "Ang password ay hindi dapat lumampas sa 72 karakter.",
    passwordsMismatch:
      "Hindi tugma ang mga password. Pakisuri ang parehong password field.",
    identifierRequired:
      "Pakilagay ang iyong username o email at password.",
    identifierEmpty:
      "Pakilagay ang iyong username o email.",
    passwordEmpty: "Pakilagay ang iyong password.",
    termsRequired:
      "Pakisang-ayunan ang Terms and Conditions.",
    termsRequiredLong:
      "Pakisang-ayunan ang Terms and Conditions bago likhain ang iyong account.",
  },

  passwordInput: {
    labelPassword: "Password",
    labelNewPassword: "Bagong Password",
    labelConfirmNewPassword:
      "Kumpirmahin ang Bagong Password",
    placeholderPassword: "Ilagay ang iyong password",
    placeholderNewPassword: "Lumikha ng password",
    placeholderConfirmPassword:
      "Kumpirmahin ang iyong password",
    placeholderCreateNew: "Lumikha ng bagong password",
    placeholderConfirmNew:
      "Kumpirmahin ang iyong bagong password",
    showA11y: "Ipakita ang password sa loob ng 5 segundo",
    showHint: "Ipinapakita ang password sa loob ng 5 segundo",
    hideA11y:
      "Itago ang password, awtomatikong magtatago sa loob ng {{seconds}} segundo",
    hideHint:
      "Nakikita ang password at awtomatikong magtatago",
    visibleLive:
      "Nakikitang password, magtatago sa loob ng {{seconds}} segundo",
    visibleHint:
      "Ipinapakita ang password… magtatago sa loob ng {{seconds}}s",
  },

  auth: {
    login: {
      title: "Maligayang Pagbabalik",
      subtitle:
        "Mag-sign in upang magpatuloy sa paggamit ng AdlaWatt.",
      identifierLabel: "Username o Email",
      identifierPlaceholder:
        "Ilagay ang iyong username o email",
      forgotPassword: "Nakalimutan ang Password?",
      forgotPasswordLabel: "Nakalimutan ang password",
      forgotPasswordHint:
        "Bawiin ang iyong password sa pamamagitan ng email",
      signIn: "Mag-Sign In",
      signingIn: "Nagsa-sign In...",
      dividerOr: "O",
      continueWithGoogle: "Magpatuloy gamit ang Google",
      connecting: "Kumokonekta...",
      googleA11y: "Magpatuloy gamit ang Google",
      googleHint:
        "Mag-sign in gamit ang iyong Google account",
      invalidCredentials: "Mali ang username o password.",
      signInFailed:
        "Hindi ka namin ma-sign in. Pakisuri ang iyong impormasyon at subukang muli.",
      sessionFailed: "Hindi makalikha ng login session.",
      sessionFailedNow:
        "Hindi makapag-sign in sa ngayon. Pakisubukang muli.",
      emailNotConfirmed:
        "Pakikumpirma ang iyong email address bago mag-sign in. Suriin ang iyong inbox para sa confirmation link.",
      tooManyAttempts:
        "Masyadong maraming pagtatangka sa pag-sign in. Maghintay sandali at subukang muli.",
      googleUnavailable:
        "Hindi available ang Google sign-in sa ngayon. Pakisubukang muli.",
      googleIncomplete:
        "Hindi nakumpleto ang Google sign-in. Pakisubukang muli.",
      googleFailed:
        "Hindi makapag-sign in gamit ang Google sa ngayon. Pakisubukang muli.",
      verifyTitle: "I-verify ang Iyong Email",
      verifySent: "• Naipadala",
      verifyTo: "Para kay:",
      verifyBody:
        "Kailangan ng beripikasyon ang iyong account bago ka makapag-sign in.",
      verifySentFresh:
        "Kakalabas lang namin ng bagong confirmation link. Suriin ang iyong inbox.",
      verifySentRecent:
        "Kamakailan ay nagpadala ng link. Pindutin ang resend sa ibaba kung hindi pa ito dumarating.",
      verifySendFresh:
        "Pindutin ang resend sa ibaba para sa bagong confirmation link.",
      resendConfirmation:
        "Muling ipadala ang confirmation email",
      footerPrompt: "Wala ka pang account?",
      footerAction: "Lumikha ng Account",
      testAdminTitle: "Test admin account (dev only)",
      testAdminHint:
        "Mag-sign in gamit ang mga kredensyal na ito upang masilip ang admin dashboard.",
      testAdminEmailLabel: "Email",
      testAdminUsernameLabel: "Username",
      testAdminPasswordLabel: "Password",
    },

    register: {
      title: "Lumikha ng Account",
      subtitle:
        "Likhain ang iyong AdlaWatt account upang simulan ang pagmomonitor ng iyong enerhiya.",
      usernameLabel: "Username",
      usernamePlaceholder: "Ilagay ang iyong username",
      emailLabel: "Email Address",
      emailPlaceholder: "Ilagay ang iyong email",
      agreePrefix: "Sumasang-ayon ako sa ",
      termsLink: "Terms and Conditions",
      agreeA11y: "Sumang-ayon sa Terms and Conditions",
      openTermsA11y: "Buksan ang Terms and Conditions",
      createAccount: "Lumikha ng Account",
      creatingAccount: "Lumilikha ng Account...",
      accountFailed: "Hindi malikha ang iyong account.",
      accountTaken:
        "Hindi malikha ang iyong account gamit ang mga detalyeng ito. Subukang mag-sign in sa halip.",
      tooManyAttempts:
        "Masyadong maraming pagtatangka. Maghintay sandali at subukang muli.",
      accountNotCreated: "Hindi malikha ang account.",
      accountFailedNow:
        "Hindi malikha ang iyong account. Pakisubukang muli.",
      checkEmailTitle: "Suriin ang iyong email",
      confirmationSent:
        "Nagpadala kami ng confirmation link sa {{email}}. I-click ang link upang i-verify ang iyong account, pagkatapos ay mag-sign in.",
      resendConfirmation:
        "Muling ipadala ang confirmation email",
      continueToSignIn: "Magpatuloy sa Sign In",
      useDifferentEmail: "Gumamit ng ibang email address",
      useDifferentEmailA11y:
        "Gumamit ng ibang email address",
      resendFailed:
        "Hindi muling maipadala ang confirmation email.",
      footerPrompt: "May account ka na?",
      footerAction: "Mag-Sign In",
      googleHint: "Lumikha ng iyong account gamit ang Google",
    },

    forgot: {
      title: "I-reset ang Password",
      subtitleRequest:
        "Ilagay ang email ng iyong account. Padadalhan ka namin ng recovery link.",
      subtitleVerified:
        "Nakumpirma ang iyong email. Magpatuloy sa iyong account o magtakda ng bagong password.",
      emailLabel: "Email Address",
      emailPlaceholder: "Ilagay ang iyong email",
      sendLink: "Ipadala ang Recovery Link",
      sending: "Ipinapadala...",
      sendFailed:
        "Hindi makapagpadala ng recovery email sa ngayon. Pakisubukang muli.",
      recoveryThrottled:
        "Kamakailan ay nagpadala ng recovery email. Maghintay bago humiling ng panibago.",
      recoveryFailed:
        "Hindi makapagpadala ng recovery email sa ngayon. Pakisubukang muli.",
      recoveryLinkBad:
        "Hindi wasto o nag-expire na ang recovery link na ito. Humiling ng bago sa ibaba.",
      recoveryLinkWrong:
        "Hindi ito password recovery link. Humiling ng bagong recovery email sa ibaba.",
      recoveryExpired:
        "Hindi wasto o nag-expire na ang recovery link na ito. Humiling ng bago.",
      recoveryUpdateFailed:
        "Hindi ma-update ang iyong password sa ngayon. Pakisubukang muli.",
      checkEmailTitle: "Suriin ang Iyong Email",
      checkEmailSent: "• Naipadala",
      checkEmailTo: "Para kay:",
      checkEmailInbox: "iyong inbox",
      checkEmailBody:
        "Nagpadala kami ng recovery link. I-tap ito, pagkatapos ay magtakda ng bagong password.",
      resendRecovery: "Muling ipadala ang recovery email",
      checkEmailHint:
        "Hindi natanggap? Suriin ang spam o sumubok ng ibang address.",
      verifyingTitle: "Bine-verify ang Link",
      verifyingBody: "Bine-verify ang iyong recovery link…",
      verifiedTitle: "Nakumpirma ang Email",
      verifiedBody:
        "Matagumpay mong nakumpirma ang iyong email.",
      continueToAccount: "Magpatuloy sa Account",
      showChangeForm:
        "O gusto mo bang palitan ang iyong password?",
      hideChangeForm: "Itago ang mga password field",
      showChangeFormA11y:
        "Ipakita ang form ng pagpapalit ng password",
      hideChangeFormA11y:
        "Itago ang form ng pagpapalit ng password",
      changeFormHint:
        "Inilalantad ang mga bagong password field",
      updatePassword: "I-update ang Password",
      updating: "Ina-update...",
      recoveryEmailSent: "Naipadala ang recovery email",
      verifyingLink: "Bine-verify ang recovery link",
      emailConfirmed: "Nakumpirma ang email",
      footerPrompt: "Naalala mo ang iyong password?",
      footerAction: "Bumalik sa Sign In",
    },

    callback: {
      title: "Kumpirmasyon ng Email",
      subtitle:
        "Kinukumpirma ang email ng iyong AdlaWatt account.",
      oauthTitle: "Google Sign-In",
      oauthSubtitle: "Tinátapos ang iyong Google sign-in.",
      linkInvalid:
        "Hindi wasto o nag-expire na ang confirmation link.",
      linkInvalidResend:
        "Hindi wasto o nag-expire na ang confirmation link na ito. Humiling ng bago mula sa sign-in screen.",
      linkMissing:
        "Dumating ang link na ito nang walang verification code. Kung nire-reset mo ang iyong password, humiling ng bagong recovery link — kung hindi, humiling ng bagong confirmation email.",
      confirmed:
        "Nakumpirma ang iyong email. Dadalhin ka sa iyong dashboard.",
      signedInGoogle:
        "Naka-sign in gamit ang Google. Dadalhin ka sa iyong dashboard.",
      signedIn:
        "Naka-sign in ka. Dadalhin ka sa iyong dashboard.",
      googleIncomplete:
        "Hindi nakumpleto ang Google sign-in. Pakisubukang muli mula sa sign-in screen.",
      continueToDashboard: "Magpatuloy sa Dashboard",
      backToSignIn: "Bumalik sa Sign In",
      goToResetPassword: "Pumunta sa Reset Password",
      footerPrompt: "Kailangan ng bagong account?",
      footerAction: "Lumikha ng Account",
    },
  },

  menu: {
    language: {
      title: "Wika",
      chooseLanguage: "Pumili ng wika",
      current: "Kasalukuyan: {{language}}",
    },
    title: "Menu",
    subtitle: "I-browse at pamahalaan ang iyong AdlaWatt application.",
    accountProfile: "Profile ng Account",
    preferences: "Mga Kagustuhan",
    userManual: "Manwal ng Gumagamit",
    components: "Mga Komponente",
    activityLogs: "Mga Tala ng Aktibidad",
    aboutUs: "Tungkol sa Amin",
    openAccountProfile: "Buksan ang Account Profile",
    openPreferences: "Buksan ang Preferences",
    openUserManual: "Buksan ang User Manual",
    openComponents: "Buksan ang Components",
    openActivityLogs: "Buksan ang Activity Logs",
    openAboutUs: "Buksan ang About Us",
    loadingAccount: "Naglo-load ng impormasyon ng account...",
    username: "Username",
    email: "Email",
    update: "Update",
    enterUsername: "Ilagay ang username",
    enterEmail: "Ilagay ang email",
    currentPassword: "Current Password",
    enterCurrentPassword: "Ilagay ang current password",
    keepCurrentPassword: "Iwang blangko upang panatilihin",
    confirmNewPasswordPlaceholder: "Kumpirmahin ang bagong password",
    cancel: "Cancel",
    submit: "Submit",
    save: "Save",
    saving: "Nagse-save...",
    confirm: "Confirm",
    cancelAccountChanges: "Kanselahin ang mga pagbabago sa account",
    submitAccountChanges: "Isumite ang mga pagbabago sa account",
    cancelPreferences: "Kanselahin ang Preferences",
    savePreferences: "I-save ang Preferences",
    logoutA11y: "Mag-log out",
    exitAppA11y: "Isara ang app",
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
    chooseFontFamily: "Pumili ng font family",
    currentFont: "Kasalukuyan: {{font}}",
    vibration: "Vibration",
    vibrationHint: "Mag-vibrate kapag may mahalagang alerto.",
    reminders: "Reminders",
    remindersHint:
      "Araw-araw na evening review at low-sun advisories bilang phone banners. Gumagana offline.",
    emailNotifications: "Email Notifications",
    emailNotificationsHint:
      "Payagan ang AdlaWatt na magpadala ng mga alerto sa iyong email.",
    confirmChanges: "Kumpirmahin ang mga Pagbabago",
    confirmChangesBody:
      "Ilagay ang iyong current password upang kumpirmahin ang mga pagbabagong ito.",
    accountUpdated: "Na-update ang Account",
    accountUpdatedEmailPending:
      "Na-update ang iyong username. Pakikumpirma ang iyong bagong email address.",
    changesSaved: "Nai-save ang mga Pagbabago",
    changesSavedMessage: "Matagumpay na na-update ang iyong account.",
    noChanges: "Walang ginawang pagbabago sa account.",
    currentPasswordRequired: "Ilagay ang iyong current password.",
    currentPasswordShort:
      "Ang current password ay dapat na hindi bababa sa 8 karakter.",
    updateFailed: "Hindi ma-update ang iyong account.",
    updateFailedNow:
      "Hindi ma-update ang iyong account. Pakisubukang muli.",
    logoutTitle: "Mag-Log Out",
    logoutMessage: "Sigurado ka bang gusto mong mag-sign out?",
    logoutNo: "Hindi",
    logoutYes: "Oo",
    exitTitle: "Lumabas",
    exitMessage: "Pakisarado ang tab na ito upang lumabas sa AdlaWatt.",
    exitWebMessage: "Sigurado ka bang gusto mong lumabas sa AdlaWatt?",
    exitAppTitle: "Isara ang App",
    exitAppMessage: "Isasara ang AdlaWatt. Sigurado ka?",
    exitNo: "Hindi",
    exitYes: "Oo",
    englishName: "English",
  },

  dashboard: {
    home: {
      title: "Dashboard",
      subtitle: "I-monitor ang iyong AdlaWatt system nang real time.",
      applianceRecommendation: "Appliance Recommendation",
      realtimeMonitoring: "Real-Time Monitoring",
      goToApplianceRecommendation: "Pumunta sa Appliance Recommendation",
      offlineBanner:
        "Wala kang koneksyon — huling readings ang ipinapakita.",
      lastUpdated:
        "Huling na-update {{time}}.",
      forecastFailed: "Hindi ma-load ang forecast.",
    },
    about: {
      title: "About Us",
      subtitle: "Alamin ang tungkol sa AdlaWatt at sa layunin nito.",
      tagline:
        "Isang IoT-Based Off-Grid Solar Backup Power System na may Real-Time Energy Monitoring at Appliance Recommendation",
      overview:
        "Ang AdlaWatt ay isang nadadalang off-grid solar backup power system na dinisenyo upang bigyan ang mga sambahayan ng abot-kaya at maaasahang kuryente tuwing may brownout. Kinokolekta ng system ang solar energy gamit ang solar panel, iniimbak ito sa baterya sa loob ng secure na lockable enclosure, at nagbibigay ng backup power sa mga pang-araw-araw na appliance sa pamamagitan ng built-in AC outlet. Sa pamamagitan ng real-time sensors at simpleng mobile application, nakikita ng mga user ang live na battery levels, pumapasok na solar power, konsumo ng enerhiya, at mga safety temperature, habang nakatatanggap ng matatalinong appliance recommendation batay sa natitirang battery capacity. Sa pagsasama ng real-time monitoring at gabay sa enerhiya, binibigyang-kakayahan ng AdlaWatt ang mga pamilya na kontrolin ang kanilang paggamit ng enerhiya, panatilihing ligtas ang mahahalagang device, at magkaroon ng kuryente tuwing blackout.",
      developers: "Mga Developer",
      roleProgrammer: "Programmer",
      roleDocumenter: "Documenter",
      roleDataAnalyst: "Data Analyst",
      dev1Bio:
        "Nagde-develop at nagme-maintain ng software at system firmware, isinasama ang real-time sensor data, kabilang ang battery levels, solar input, at temperature, sa mobile app at nagpo-program ng recommendation algorithms.",
      dev2Bio:
        "Sumusulat ng user manuals, system setup guides, technical documentation, at safety instructions para sa pagpapatakbo ng AdlaWatt hardware at mobile application.",
      dev3Bio:
        "Sinusuri ang pumapasok na sensor telemetry, kabilang ang solar generation patterns, konsumo ng kuryente ng mga appliance, at performance ng baterya, upang i-optimize ang efficiency ng system at paghusayin ang smart appliance recommendations.",
      contactDetails: "Contact Details",
    },
    manual: {
      title: "User Manual",
      subtitle: "Mga gabay sa pagpapatakbo ng iyong AdlaWatt system.",
    },
    appliances: {
      title: "Mga Appliance",
      subtitle: "Pamahalaan at i-monitor ang mga sinusuportahang appliance.",
    },
    components: {
      title: "Mga Komponente",
      subtitle: "I-monitor ang mga component ng AdlaWatt system.",
    },
    analytics: {
      title: "Analytics at Trends",
      subtitle:
        "Suriin ang performance ng system, paggamit ng enerhiya, temperatura, at datos ng appliance sa paglipas ng panahon.",
      sectionBattery: "Baterya",
      sectionSolar: "Solar",
      sectionEnergy: "Enerhiya",
      sectionHealth: "Kalusugan",
      sectionUsage: "Paggamit",
      generateReport: "Generate Report",
      goToGenerateReport: "Pumunta sa Generate Report",
    },
    logs: {
      title: "Activity Logs",
      subtitle: "Dito lilitaw ang aktibidad ng system at mga event ng appliance.",
      total: "Kabuuang Activity Logs:",
      loadFailed:
        "Hindi ma-load ang iyong activity logs. Suriin ang iyong koneksyon at subukang muli.",
      timeRange: "Saklaw ng Oras",
      activityType: "Uri ng Aktibidad",
      timeAll: "Lahat",
      timeLastHour: "Nakaraang Oras",
      timeToday: "Ngayon",
      timeThisWeek: "Linggong Ito",
      timeThisYear: "Taong Ito",
      typeAll: "Lahat",
      typeInfo: "Info",
      typeWarning: "Babala",
      typeError: "Error",
      typeCritical: "Kritikal",
    },
    notifications: {
      title: "Mga Notification",
      subtitle: "Dito lilitaw ang mga notification ng system at mahahalagang alerto.",
      total: "Kabuuang Notification:",
      loadFailed:
        "Hindi ma-load ang iyong mga notification. Suriin ang iyong koneksyon at subukang muli.",
      markFailed: "Hindi ma-mark as read ang mga notification. Pakisubukang muli.",
      markError: "Hindi ma-mark as read. Suriin ang iyong koneksyon at subukang muli.",
      marking: "Mini-mark...",
      markAsRead: "Mark as Read",
      markAllAsRead: "I-mark lahat as read",
      recent: "Kamakailan",
      earlier: "Mas Maaga",
      noNotifications: "Walang Notification",
      noNotificationsDesc: "Walang notification para sa mga napiling filter.",
      timeRange: "Saklaw ng Oras",
      notificationType: "Uri ng Notification",
      timeAll: "Lahat",
      timeLastHour: "Nakaraang Oras",
      timeToday: "Ngayon",
      timeThisWeek: "Linggong Ito",
      timeThisYear: "Taong Ito",
      typeAll: "Lahat",
      typeNormal: "Normal",
      typeAlert: "Alerto",
    },
  },

  shared: {
    close: "Isara",
    signedInAs: "Naka-sign in bilang {{username}}",
    notifications: "Mga Notification",
    emptyTitle: "Walang Activity Logs",
    emptyDescription: "Walang aktibidad na tumutugma sa mga filter.",
    errorTitle: "Hindi ma-load ang data",
    retry: "Subukang Muli",
    paginationPrev: "Nakaraan",
    paginationNext: "Susunod",
    paginationPage: "Pahina {{current}} ng {{total}}",
    no: "Hindi",
    yes: "Oo",
    cancel: "Cancel",
  },

  media: {
    title: "Pumili ng Larawan",
    chooseFromLibrary: "Pumili mula sa Library",
    opening: "Binubuksan…",
    chooseA11y: "Pumili mula sa library",
    chooseHint: "Binubuksan ang iyong photo library",
    removePhoto: "Alisin ang Larawan",
    removeA11y: "Alisin ang larawan",
    removeHint: "Inaalis ang kasalukuyang larawan at ibinabalik ang default icon",
    cancelChoiceA11y: "Kanselahin ang pagpili ng larawan",
    permissionDenied:
      "Kailangan ng AdlaWatt ng photo access upang maglakip ng larawan. Payagan ang access sa Settings ng iyong device, pagkatapos ay subukang muli.",
    unreadable: "Hindi mabasa ang larawang iyon. Sumubok ng iba.",
    tooBig: "Ang larawang iyon ay lumampas sa 5 MB. Pumili ng mas maliit.",
    processFailed: "Hindi ma-process ang larawang iyon. Sumubok ng iba.",
    libraryFailed: "Hindi mabuksan ang iyong photo library. Subukang muli.",
  },

  applianceBox: {
    editAppliance: "I-edit ang appliance",
    archiveAppliance: "I-archive ang appliance",
    unarchiveAppliance: "I-unarchive ang appliance",
    deleteAppliance: "Burahin ang appliance",
    showOptions: "Ipakita ang mga opsyon ng appliance",
    hideOptions: "Itago ang mga opsyon ng appliance",
    deleteQuestion: "Gusto mo ba itong burahin?",
    doNotDelete: "Huwag burahin ang appliance",
    confirmDelete: "Kumpirmahin ang pagbura ng appliance",
    archiveQuestion: "I-archive ang appliance na ito?",
    unarchiveQuestion: "I-unarchive ang appliance na ito?",
    doNotArchive: "Huwag i-archive ang appliance",
    doNotUnarchive: "Huwag i-unarchive ang appliance",
    confirmArchive: "Kumpirmahin ang pag-archive ng appliance",
    confirmUnarchive: "Kumpirmahin ang pag-unarchive ng appliance",
  },

  activityCard: {
    recentActivity: "Kamakailang Aktibidad",
    viewAll: "Tingnan Lahat",
    viewAllActivity: "Tingnan ang lahat ng aktibidad",
    fallbackDetails: "Walang detalye ng aktibidad.",
    fallbackTitle: "Aktibidad",
    typeA11y: "Uri: {{label}}",
  },

  notificationCard: {
    fallbackTitle: "Notification",
    fallbackDetails: "Walang detalye ng notification.",
    newTypeA11y: "Bago, Uri: {{label}}",
    typeA11y: "Uri: {{label}}",
  },
} as const;

export default fil;
