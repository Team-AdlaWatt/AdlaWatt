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
    pinRequired: "Palihug isulod ang imong TFT PIN.",
    pinNumbersOnly: "Ang TFT PIN kinahanglan mga numero lamang.",
    pinLength: "Ang TFT PIN kinahanglan eksaktong 4 ka digit.",
    pinWeak:
      "Sayon kaayo kini nga TFT PIN. Pili ug laing 4-digit nga PIN.",
    pinMismatch:
      "Dili magtugma ang mga TFT PIN. Palihug susiha ang duha ka PIN field.",
    pinAlreadyUsed:
      "Gigamit na kini nga TFT PIN. Pili ug laing 4-digit nga PIN.",
    pinUnavailable:
      "Walay available nga TFT PIN karon. Palihug sulayi pag-usab.",
  },

  passwordInput: {
    labelPassword: "Password",
    labelNewPassword: "Bag-ong Password",
    labelConfirmNewPassword:
      "Kumpirmahi ang Bag-ong Password",
    labelConfirmPassword: "Kumpirmaha ang Password",
    placeholderPassword: "Isulod ang imong password",
    placeholderNewPassword: "Pagbuhat ug password",
    placeholderConfirmPassword:
      "Kumpirmahi ang imong password",
    placeholderConfirmNewPassword:
      "Isulod ang password aron kumpirmahon",
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

  pin: {
    label: "TFT PIN",
    labelConfirm: "Kumpirmahi ang TFT PIN",
    labelNew: "Bag-ong TFT PIN",
    labelConfirmNew: "Kumpirmahi ang Bag-ong TFT PIN",
    placeholder: "4-digit nga PIN",
    hint: "4 ka digit. Mga numero lamang. Kinahanglan talagsaon.",
    generatedNotice:
      "Adunay PIN na nga namugna para sa imong account. Kumpirmahi ang imong password aron makita kini.",
    infoA11y: "Ipakita ang impormasyon sa TFT PIN",
    infoTitle: "Mahitungod sa imong TFT PIN",
    infoIntro:
      "Ang imong TFT PIN maoy mag-abli sa AdlaWatt dashboard sa display.",
    infoRule1: "Gamita ang eksaktong 4 ka digit.",
    infoRule2: "Mga numero lamang ang gitugotan.",
    infoRule3: "Gitugotan ang nangunang zero.",
    infoRule4: "Kinahanglan talagsaon ang imong PIN.",
    infoRule5: "Dili gitugotan ang balik-balik nga PIN sama sa 8888.",
    infoRule6: "Dili gitugotan ang sunodsunod nga PIN sama sa 1234.",
    gotIt: "Sabot na",
    showA11y: "Ipakita ang TFT PIN sulod sa 5 segundos",
    showHint: "Nagpakita sa TFT PIN sulod sa 5 segundos",
    hideA11y:
      "Tagoa ang TFT PIN, awtomatikong motago sa {{seconds}} ka segundos",
    hideHint: "Makita ang TFT PIN ug awtomatikong motago",
    visibleLive:
      "Makita ang TFT PIN, motago sa {{seconds}} ka segundos",
    reveal: "Ipakita ang PIN",
    hide: "Tagoa ang PIN",
    displayRevealA11y:
      "Ipakita ang TFT PIN human makumpirma ang password",
    displayHideA11y: "Tagoa ang TFT PIN",
    displayHideHint: "Awtomatikong motago ang TFT PIN human sa 5 segundos",
    revealedLive:
      "Makita ang TFT PIN, motago sa {{seconds}} ka segundos",
    revealedHint: "Motago sa 5s",
    privateHint: "Ayaw ipaambit kini nga PIN.",
    notAvailable: "Walay PIN nga available niining device karon.",
    update: "I-update ang PIN",
    updateA11y: "I-update ang TFT PIN",
    passwordBody:
      "Isulod ang imong account password aron magpadayon.",
    passwordInvalid:
      "Sayop ang password. Palihug sulayi pag-usab.",
    masked: "••••",
    confirmRevealTitle:
      "Kumpirmahi ang Password para Ipakita ang PIN",
    confirmUpdateTitle:
      "Kumpirmahi ang Password para I-update ang PIN",
    changeTitle: "Usbon ang TFT PIN?",
    changeBody:
      "Ang pag-usab sa TFT PIN diha-diha dayon mopuli sa daan nga PIN. Ang AdlaWatt display kinahanglang mogamit sa bag-ong PIN.",
    changeCancel: "Kanselahon",
    changeContinue: "Padayon",
    changeCancelA11y: "Kanselahon ang pag-usab sa PIN",
    changeContinueA11y: "Padayon sa pag-usab sa PIN",
    updatedTitle: "Na-update ang PIN",
    updatedMessage: "Nausab na ang imong TFT PIN.",
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

    session: {
      notFoundTitle: "Wala Na Ang Account",
      notFoundBody:
        "Dili na existent ang account nimo. Palihok nga log-in usab.",
      backToSignIn: "Balik sa Sign In",
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
    addDevice: "Pagdugang ug Device",
    openAccountProfile: "Ablihi ang Account Profile",
    openPreferences: "Ablihi ang Preferences",
    openUserManual: "Ablihi ang User Manual",
    openComponents: "Ablihi ang Components",
    openActivityLogs: "Ablihi ang Activity Logs",
    openAboutUs: "Ablihi ang About Us",
    openAddDevice: "Ablihi ang Pagdugang ug Device",
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
    messagePanel: "Mga Giya nga Mensahe",
    messagePanelHint:
      "Magpakita ug mugbo nga tip sa app nga nagpasabot kung unsa ang nahitabo, sama sa abiso sa vibration.",
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

  guidance: {
    vibration: {
      title: "Naay namatikdan nga babala",
      body: "Nag-vibrate ang imong phone aron dili nimo malimtan ang babala.",
      hint: "Mahimo nimong patyon ang vibration sa Preferences.",
      openPreferences: "Ablihi ang Preferences",
      dontShowAgain:
        "Ayaw na ipakita ang mga mensahe nga sama niini",
      closeA11y: "Isira ang mensahe",
    },
  },

  dashboard: {
    common: {
      pullToRefresh: "Biraha paubos para mag-refresh",
      scrollToTop: "Mag-scroll paibabaw",
    },
    addDevice: {
      title: "Pagdugang ug Device",
      subtitle: "Ikonekta ug i-set up ang imong AdlaWatt monitoring device.",
      deviceLabel: "AdlaWatt Device",
      deviceName: "AW-01 ? ESP32-S3",
      bluetoothName: "Bluetooth device: AdlaWatt-AW-01",
      bluetoothHint: "Nangita ug duol nga AdlaWatt device ({{prefix}}). Dili kinahanglan i-pair sa settings sa phone.",
      bluetoothReadyShort: "Andam ang Bluetooth",
      bluetoothNotReadyShort: "Dili andam ang Bluetooth",
      scanSection: "Pangitaa ang Imong Device",
      scanSectionHint: "I-on ang Bluetooth ug tugoti ang permiso, dayon mag-scan sa imong AdlaWatt device.",
      readyToScan: "Andam na ang Bluetooth. Pislita ang Pag-scan ug mga Device aron magpadayon.",
      scanBlocked: "I-on ang Bluetooth ug tugoti ang permiso aron makapag-scan.",
      scan: "Pag-scan ug mga Device",
      scanAgain: "Pag-scan Pag-usab",
      showDevices: "Ipakita ang mga Device",
      scanning: "Nag-scan...",
      scanningHint: "Nangita ug duol nga AdlaWatt device...",
      scanTitle: "Pilia ang Device",
      noDevices: "Walay nakitang device",
      noDevicesDescription:
        "Ipadayon ang imong AdlaWatt device nga naka-on ug duol, dayon sulayi pag-scan pag-usab.",
      noDevicesHint: "Walay nakitang AdlaWatt device. Siguroha nga naka-on ug duol ang device, dayon pislita ang Pag-scan Pag-usab.",
      selectDevice: "Pilia ang Bluetooth device",
      selectedDevice: "Napiling device",
      wifiSection: "Configuration sa Wi-Fi",
      wifiSsid: "Ngalan sa Network (SSID)",
      wifiSsidPlaceholder: "Isulod ang ngalan sa Wi-Fi",
      wifiPassword: "Password sa Wi-Fi",
      wifiPasswordPlaceholder: "Isulod ang password sa Wi-Fi",
      wifiSsidRequired: "Isulod ang ngalan sa imong Wi-Fi.",
      wifiPasswordRequired: "Isulod ang password sa imong Wi-Fi.",
      accountSection: "Account",
      loggedInAs: "Naka-log in isip",
      assignmentCheckingUser: "Gisusi ang imong account...",
      assignmentChecking: "Gikuha ang imong monitoring assignment...",
      assignmentVerified: "Na-verify ang monitoring assignment",
      assignmentMissing:
        "Walay monitoring assignment para sa account niini.",
      assignmentError:
        "Dili ma-verify ang imong monitoring assignment.",
      assignmentSessionExpired:
        "Dili magamit o nahuman na ang imong session. Pag-sign in pag-usab ug sulayi pag-usab.",
      assignmentQueryFailed:
        "Dili makuha ang imong monitoring assignment. Awtomatiko kami mosulay pag-usab.",
      assignmentAmbiguous:
        "Dili matino ang imong monitoring assignment. Palihug kontaka ang suporta.",
      assignmentInvalid:
        "Dili balido ang imong monitoring assignment. Palihug kontaka ang suporta.",
      loginRequired: "Mag-sign in aron mag-configure ug device.",
      send: "Ipadala ang Configuration",
      sending: "Gipapadala...",
      retry: "Sulayi Pag-usab",
      assignmentRetry: "Sulayi pag-usab ang assignment",
      previewTitle: "Preview status",
      previewOpen: "Ablihi ang status preview",
      previewNote: "Preview mode - dili tinuod nga status sa device",
      bluetoothNotReady: "Dili andam ang Bluetooth. I-on kini ug tugoti ang permiso, dayon sulayi pag-usab.",
      turnOnBluetooth: "I-on ang Bluetooth",
      turningOnBluetooth: "Gina-on...",
      openBluetoothSettings: "Ablihi ang Bluetooth Settings",
      openSettings: "Ablihi ang Settings",
      grantPermission: "Tugoti ang Permiso",
      checkingPermissions: "Gisusi...",
      bluetoothEnableDeclined:
        "Wala ma-on ang Bluetooth. I-on kini aron makita ang imong AdlaWatt device.",
      bluetoothIosInstructions:
        "Aron ma-on ang Bluetooth, ablihi ang Control Center o Settings, dayon balik diri.",
      readiness_checking: "Gisusi ang Bluetooth",
      readiness_checking_body:
        "Gisusi ang Bluetooth ug status sa permiso...",
      readiness_unknown: "Gisusi ang Bluetooth",
      readiness_unknown_body:
        "Naghulat sa status sa Bluetooth...",
      readiness_resetting: "Nag-reset ang Bluetooth",
      readiness_resetting_body:
        "Nag-restart ang Bluetooth. Paghulat kadiyot.",
      readiness_unsupported: "Dili suportado ang Bluetooth",
      readiness_unsupported_body:
        "Kini nga device wala nagsuporta sa Bluetooth nga gikinahanglan aron makakonekta sa AdlaWatt.",
      readiness_unauthorized: "Dili magamit ang Bluetooth",
      readiness_unauthorized_body:
        "Dili magamit sa AdlaWatt ang Bluetooth niining device. Susiha ang system settings ug sulayi pag-usab.",
      readiness_poweredOff: "Naka-off ang Bluetooth",
      readiness_poweredOff_body:
        "Gikinahanglan ang Bluetooth aron makit-an ug makonekta ang imong AdlaWatt monitoring device. I-on ang Bluetooth aron magpadayon.",
      readiness_permission_required: "Gikinahanglan ang permiso sa Bluetooth",
      readiness_permission_required_body:
        "Tugoti ang permiso sa Bluetooth aron makit-an ug makakonekta sa AdlaWatt ang imong device.",
      readiness_permission_denied: "Gibalibaran ang permiso sa Bluetooth",
      readiness_permission_denied_body:
        "Gikinahanglan ang permiso sa Bluetooth aron mag-scan sa imong AdlaWatt device. Mahimo nimo kini tugotan ug sulayan pag-usab.",
      readiness_permission_blocked: "Na-block ang permiso sa Bluetooth",
      readiness_permission_blocked_body:
        "Na-block ang permiso sa Bluetooth sa system settings. Ablihi ang Settings aron tugotan kini, dayon balik diri.",
      readiness_ready: "Andam na ang Bluetooth",
      readiness_ready_body:
        "Mahimo na ka mag-scan ug duol nga AdlaWatt device.",
      provisioning: "Gina-set up ang device",
      success: "Malampuson nga natipig ang configuration",
      connectionFailed: "Napakyas ang koneksyon",
      status_idle: "Andam i-configure",
      status_scanning: "Nangita ug device",
      status_connecting: "Nagkonekta sa device",
      status_connected: "Konektado sa AW-01 pinaagi sa Bluetooth",
      status_subscribed: "Andam na ang status notifications sa device",
      status_writing: "Gipapadala ang configuration sa Wi-Fi ug monitor ID sa AW-01",
      status_received: "Nadawat sa device ang configuration",
      status_busy: "Giproseso sa device ang request",
      status_wifi_connected: "Nakakonekta ang device sa Wi-Fi",
      status_wifi_failed: "Napakyas ang koneksyon sa Wi-Fi",
      status_wifi_lost: "Nawala ang koneksyon sa Wi-Fi",
      status_configured: "Malampuson nga natipig ang configuration",
      status_error: "Error sa provisioning",
      status_disconnected: "Nawala ang koneksyon sa Bluetooth",
      status_timeout: "Nag-time out ang setup",
      timeout: "Nag-time out ang setup",
      timeoutBody:
        "Wala mahuman sa device ang setup sulod sa {{seconds}} ka segundo. Ipadayon kini nga naka-on ug duol, unya sulayi pag-usab.",
      validationSsidRequired: "Isulod ang pangalan sa Wi-Fi network.",
      validationSsidTooLong: "Taas kaayo ang pangalan sa Wi-Fi network.",
      validationPasswordTooLong: "Taas kaayo ang password sa Wi-Fi.",
      validationMonitorIdInvalid: "Dili balido ang monitor ID.",
      validationInvalidText: "Adunay dili balido nga karakter sa detalye sa Wi-Fi.",
      errorTitle: "Napakyas ang provisioning",
      errorBody:
        "Dili mahuman sa device ang request. Susiha ang detalye ug sulayi pag-usab.",
      bleWriteNotPermitted:
        "Dili gidawat sa AW-01 kini nga Bluetooth write mode. I-update ang firmware sa device ug sulayi pag-usab.",
      bleTxDescriptorMissing:
        "Nawala ang status notification descriptor sa AW-01. I-update ang firmware sa device ug sulayi pag-usab.",
      bleCharacteristicNotFound:
        "Wala makit-an ang gikinahanglan nga Bluetooth characteristic. Himoa nga duol ang device ug sulayi pag-usab.",
      bleServiceNotFound:
        "Wala makit-an ang Bluetooth service sa AW-01. I-restart ang device ug sulayi pag-usab.",
      bleOperationTimeout:
        "Nag-time out ang Bluetooth operation. Ipadayon nga naka-on ug duol ang device, unya sulayi pag-usab.",
      bleOperationCancelled:
        "Gikansela ang Bluetooth operation. Sulayi pag-usab.",
      bleDisconnected:
        "Nawala ang Bluetooth connection sa pag-setup. Ipadayon nga naka-on ug duol ang device, unya sulayi pag-usab.",
      bleGattError:
        "Gibalibaran sa device ang Bluetooth write. I-update ang firmware sa device ug sulayi pag-usab.",
      permissionDenied:
        "Kinahanglan ang permiso sa Bluetooth aron makita ang device.",
      bluetoothOff: "I-on ang Bluetooth aron magpadayon.",
    },
    home: {
      title: "Dashboard",
      subtitle: "I-monitor ang imong AdlaWatt system nga real time.",
      electronicsRecommendation: "Electronics Recommendation",
      realtimeMonitoring: "Real-Time Monitoring",
      goToElectronicsRecommendation: "Adto sa Electronics Recommendation",
      offlineBanner:
        "Wala kay koneksyon — katapusang readings ang gipakita.",
      deviceOfflineBanner:
        "Offline ang device — katapusang readings ang gipakita.",
      lastUpdated:
        "Katapusang na-update {{time}}.",
      deviceLastSeen:
        "Katapusang nakita {{time}}.",
      deviceLastSeenUnavailable:
        "Dili available ang katapusang nakita.",
      forecastFailed: "Dili ma-load ang forecast.",
    },
    about: {
      title: "About Us",
      subtitle: "Ilaila ang team sa likod sa AdlaWatt.",
      teamName: "Team AdlaWatt",
      teamBio:
        "Ang Team AdlaWatt usa ka grupo sa mga student researchers gikan sa Northern Bukidnon State College nga naa sa likod sa AdlaWatt off-grid solar backup power system. Ang tumong sa team mao ang paghatag sa mga panimalay ug praktikal nga paagi aron mapadayon ang kuryente ug makapabiling may kahibalo panahon sa outage, ug nagtrabaho nga nagkahiusa gikan sa konsepto ug paghimo sa hardware hangtod sa disenyo, pag-develop, ug pag-test sa AdlaWatt mobile application. Simple lang ang ilang tumong: himuon ang backup energy nga mas sayon sabton, mas luwas gamiton, ug maabot sa matag pamilya.",
      developers: "Mga Developer",
      roleProgrammer: "Programmer",
      roleDocumenter: "Documenter",
      roleDataAnalyst: "Data Analyst",
      dev1Bio:
        "Naghimo ug nag-maintain sa AdlaWatt mobile application, gihiusa ang live nga battery, solar, ug temperature data gikan sa mga sensor sa system ngadto sa klaro ug real-time nga kasinatian, ug nag-develop sa recommendation logic nga nagsulti sa mga user kung unsang electronics ang luwas nga mapadagan sa ilang kasamtangang kuryente.",
      dev2Bio:
        "Nagdokumento sa tibuok AdlaWatt system, gikan sa hardware setup ug safety guidance hangtod sa in-app user manual, aron magamit, masabtan, ug mapadayon sa mga user ug sunod nga researchers ang proyekto nga may kasiguruhan.",
      dev3Bio:
        "Nagtuon sa mosulod nga sensor data sa system, gikan sa solar generation ug electronics power draw hangtod sa performance sa baterya, ug gihimong insights kini aron mapalambo ang efficiency sa system ug mapabiling tukma ang electronics recommendations.",
      contactDetails: "Contact Details",
    },
    manual: {
      title: "User Manual",
      subtitle: "Mga giya sa pagpadagan sa imong AdlaWatt system.",
    },
    preferences: {
      title: "Mga Gusto",
      subtitle:
        "Dumalaha sa itsura, pinulongan, alerto, ug notifications.",
    },
    electronics: {
      title: "Mga Electronics",
      subtitle: "Dumalaha ug i-monitor ang gisuportahang mga electronics.",
    },
    components: {
      title: "Mga Komponente",
      subtitle: "I-monitor ang mga component sa AdlaWatt system.",
    },
    analytics: {
      title: "Analytics ug Trends",
      subtitle:
        "Susiha ang solar, paggamit sa load, ug kalihokan sa baterya alang sa napiling sakup.",
      sectionBattery: "Baterya",
      sectionSolar: "Solar",
      sectionEnergy: "Enerhiya",
      sectionHealth: "Panglawas",
      sectionUsage: "Paggamit",
      generateReport: "Generate Report",
      goToGenerateReport: "Adto sa Generate Report",
      reportSavedTitle: "Na-save na ang report",
      reportSavedTo: "Na-save sa",
      reportPreviewTitle: "Preview sa report",
      reportOpenFile: "Ablihi ang file",
      reportDone: "Tapos na",
    },
    logs: {
      title: "Activity Logs",
      subtitle: "Dinhi makita ang aktibidad sa system ug mga event sa electronics.",
      total: "Tibuok Activity Logs:",
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

  electronicsBox: {
    editElectronics: "I-edit ang electronics item",
    archiveElectronics: "I-archive ang electronics item",
    unarchiveElectronics: "I-unarchive ang electronics item",
    deleteElectronics: "Papason ang electronics item",
    showOptions: "Ipakita ang mga opsyon sa electronics",
    hideOptions: "Tagoa ang mga opsyon sa electronics",
    deleteQuestion: "Gusto ba nimong papason kini?",
    doNotDelete: "Ayaw papasa ang electronics item",
    confirmDelete: "Kumpirmahi ang pagpapasa sa electronics item",
    archiveQuestion: "I-archive kini nga electronics item?",
    unarchiveQuestion: "I-unarchive kini nga electronics item?",
    doNotArchive: "Ayaw i-archive ang electronics item",
    doNotUnarchive: "Ayaw i-unarchive ang electronics item",
    confirmArchive: "Kumpirmahi ang pag-archive sa electronics item",
    confirmUnarchive: "Kumpirmahi ang pag-unarchive sa electronics item",
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

  onboarding: {
    skip: "Pasagdan",
    proceed: "Adto sa Dashboard",
    swipeHint: "I-swipe para mosunod",
    page: "Panid {{current}} sa {{total}}",
    welcome: {
      title: "Maayong pag-abot sa AdlaWatt",
      subtitle:
        "Bantayi ang imong solar power, bisan kanus-a.",
    },
    about: {
      title: "Unsa ang AdlaWatt?",
      subtitle:
        "Ang AdlaWatt usa ka off-grid solar backup power monitor. Gisubayan niya ang imong solar, baterya, temperatura, ug output nga adunay real-time data gikan sa imong device.",
    },
    features: {
      title: "Pangunang Bahin",
      bulletDashboard: "Live dashboard nga adunay gauges",
      bulletAlerts: "Smart alerts alang sa delikadong lebel",
      bulletPlanner: "Electronics planner ug mga rekomendasyon",
      bulletLog: "Activity log ug kasaysayan",
    },
    goals: {
      title: "Among mga Katuyoan",
      bulletReliable:
        "Panatilihang kasaligan ang imong backup power",
      bulletBattery:
        "Panalipdan ang baterya gikan sa kadaot",
      bulletWise:
        "Tabang nga gamiton nga maayo ang kuryente",
      bulletLanguages:
        "Sayon para sa tanan — Iningles, Cebuano, Tagalog",
    },
    finish: {
      title: "Andam Na Tanan",
      subtitle: "Ang imong kuryente, sa imong mga kamot.",
    },
  },

  batteryEnergy: {
    title: "Magamit nga enerhiya",
    value: "{{wh}} Wh",
    ofUsable: "sa {{capacity}} Wh nga magamit",
    reserve: "{{wh}} Wh nga protektadong reserve",
    status: {
      normal: "Maayo",
      warning: "Ubos ang enerhiya",
      critical: "Kritikal",
      waiting: "Naghulat sa data",
    },
    selectedLoad:
      "Napili: {{ac}} W AC · {{battery}} W gikan sa baterya",
    liveDraw: "Live draw: {{watts}} W",
    timeRemaining: "Gibanabana nga nahabilin: {{time}}",
  },

  batteryProtection: {
    warningTitle: "Ubos na ang magamit nga enerhiya",
    warningBody:
      "{{wh}} Wh na lang ang nahabilin nga magamit nga enerhiya. Likayi ang pag-on ug bag-ong appliances.",
    criticalTitle:
      "I-unplug ang dili kinahanglan nga electronics",
    criticalBody:
      "Ang magamit nga enerhiya nakaabot na sa {{percent}}%. I-unplug dayon ang tanan nga dili kinahanglan nga load.",
    newLoadTitle:
      "Adunay bag-ong load nga wala nalista",
    newLoadBody:
      "Ang live draw mga {{watts}} W nga mas taas kaysa sa napiling load. Susiha ang mga naka-plug.",
    review: "Susiha ang electronics",
    criticalInstructions:
      "I-unplug tanan nga dili kinahanglan nga appliances, unya susiha ang mga naka-connect nga electronics.",
    recovering:
      "Gisusi ang stable nga load ug magamit nga enerhiya...",
    dismiss: "Sabot na",
    blocked:
      "Gihunong ang bag-ong selection samtang aktibo ang battery protection. Mahimo ka gihapon mokuha ug appliances.",
    closeA11y:
      "Isara ang pahibalo sa battery protection",
    reviewTitle: "Pagsusi sa electronics",
    reviewBody:
      "Kini ang mga appliances nga giihap sa karon nga rekomendasyon.",
    done: "Tapos",
  },

  electronicsModal: {
    checkRecommendation: "Susiha ang Rekomendasyon",
    done: "Tapos",
    saving: "Gi-save...",
    selectAtLeastOne:
      "Pili labing menos usa ka appliance sa dili pa magpadayon.",
    notAdvisableBlocked:
      "Dili kini maayo. Usba ang napili ug susiha pag-usab.",
    detectedHeader:
      "Adunay electronics nga naka-plug, susiha ang rekomendasyon alang sa tukma nga giya.",
    reserveBlocked:
      "Kini nga load mogamit sa tanan nga nahabilin nga magamit nga enerhiya. I-unplug ang usa ka load o usba ang napili sa dili pa magpadayon.",
  },

  recommendationResult: {
    title: "Rekomendasyon",
    status: {
      empty: "Walay napiling electronics",
      waiting: "Naghulat sa data sa baterya",
      blocked: "Kinahanglan i-check ang baterya",
      ready: "Hiniusang rekomendasyon",
    },
    verdict: {
      recommended: "OK gamiton",
      care: "Gamita uban ang pag-amping",
      notRecommended: "Dili maayo gamiton",
      unknown: "Naghulat",
    },
    badgeA11y: "Rekomendasyon: {{label}}",
    reason: {
      empty:
        "Pilia ang electronics aron makita ang rekomendasyon.",
      waiting:
        "Naghulat ug bag-ong pagbasa sa baterya.",
      offline:
        "Naghulat nga ma-online ang device.",
      stale:
        "Daang kaayo ang pagbasa sa baterya. Naghulat ug bag-ong data.",
      blocked:
        "Ang pagbasa sa baterya naa sa gawas sa luwas nga limitasyon.",
      invalidWattage:
        "Usa o daghang wattage ang dili balido.",
      overCap:
        "Ang hiniusang peak load milapas sa luwas nga limitasyon.",
      unsafeVoltage:
        "Ang hiniusang peak load magpaubos sa voltage ubos sa luwas nga lebel.",
      highDrain:
        "Kini nga kombinasyon nagagamit ug daghang magamit nga enerhiya kada oras.",
      care:
        "Magamit uban ang pag-amping — ipagaan ang load.",
      recommended:
        "Luwas gamiton niining lebel sa baterya.",
    },
    remainingBattery:
      "Gitantya nga nahabilin nga magamit nga enerhiya",
    estimatedRuntime:
      "Gitantya nga oras sa paggamit",
    combinedPeak:
      "Hiniusang peak load (kilid sa baterya)",
    currentLoad: "Karon nga load",
    alternativesTitle: "Mas maayong mga kapilian",
    noAlternatives: "Walay alternatibo karon.",
    estimateNote:
      "Ang mga tantya naggamit sa catalog wattage, dili aktuwal nga pag-detect sa appliance.",
  },
} as const;

export default ceb;
