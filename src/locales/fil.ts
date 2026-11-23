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
    labelConfirmPassword: "Kumpirmahin ang Password",
    placeholderPassword: "Ilagay ang iyong password",
    placeholderNewPassword: "Lumikha ng password",
    placeholderConfirmPassword:
      "Kumpirmahin ang iyong password",
    placeholderConfirmNewPassword:
      "Ilagay ang password para kumpirmahin",
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

    session: {
      notFoundTitle: "Wala Na Ang Account",
      notFoundBody:
        "Hindi na umiiral ang account mo. Mangyaring mag-sign in muli.",
      backToSignIn: "Bumalik sa Sign In",
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
    addDevice: "Magdagdag ng Device",
    openAccountProfile: "Buksan ang Account Profile",
    openPreferences: "Buksan ang Preferences",
    openUserManual: "Buksan ang User Manual",
    openComponents: "Buksan ang Components",
    openActivityLogs: "Buksan ang Activity Logs",
    openAboutUs: "Buksan ang About Us",
    openAddDevice: "Buksan ang Magdagdag ng Device",
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
    messagePanel: "Mga Gabay na Mensahe",
    messagePanelHint:
      "Magpakita ng maiikling tip sa app na nagpapaliwanag kung ano ang nangyayari, tulad ng abiso sa vibration.",
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

  guidance: {
    vibration: {
      title: "May nakita kaming babala",
      body: "Nag-vibrate ang iyong phone para hindi mo makalimutan ang babala.",
      hint: "Maaari mong patayin ang vibration sa Preferences.",
      openPreferences: "Buksan ang Preferences",
      dontShowAgain:
        "Huwag nang ipakita ang mga mensaheng tulad nito",
      closeA11y: "Isara ang mensahe",
    },
  },

  dashboard: {
    common: {
      pullToRefresh: "Hilahin pababa para mag-refresh",
      scrollToTop: "Mag-scroll pataas",
    },
    addDevice: {
      title: "Magdagdag ng Device",
      subtitle: "Ikonekta at i-set up ang iyong AdlaWatt monitoring device.",
      boundTitle: "Nakakonekta na ang device",
      boundBody:
        "Naka-bind ang device na ito sa iyong account. I-disconnect ito bago magdagdag ng ibang device.",
      disconnect: "I-disconnect ang Device",
      disconnecting: "Ibinidisconnect...",
      releasePending:
        "Naipadala na ang request sa pag-disconnect. Hintayin ang kumpirmasyon ng device.",
      releaseSuccess: "Matagumpay na na-disconnect ang device.",
      releaseFailed: "Hindi ma-disconnect ang device. Subukang muli.",
      bindingNote:
        "Bawat device ay maaaring konektado sa isang monitoring account.",
      releaseConfirmTitle: "I-disconnect ang device?",
      releaseConfirmBody:
        "Panatilihing malapit at naka-on ang device para makumpleto ang pag-disconnect.",
      cancel: "Kanselahin",
      deviceLabel: "AdlaWatt Device",
      deviceName: "AW-01 ? ESP32-S3",
      bluetoothName: "Bluetooth device: AdlaWatt-AW-01",
      bluetoothHint: "Naghahanap ng malapit na AdlaWatt device ({{prefix}}). Hindi mo kailangang i-pair sa settings ng phone.",
      bluetoothReadyShort: "Handa ang Bluetooth",
      bluetoothNotReadyShort: "Hindi handa ang Bluetooth",
      scanSection: "Hanapin ang Iyong Device",
      scanSectionHint: "I-on ang Bluetooth at payagan ang permission, pagkatapos ay mag-scan para sa iyong AdlaWatt device.",
      readyToScan: "Handa na ang Bluetooth. Pindutin ang Mag-scan ng Devices para magpatuloy.",
      scanBlocked: "I-on ang Bluetooth at payagan ang permission para makapag-scan.",
      scan: "Mag-scan ng Devices",
      scanAgain: "Mag-scan Muli",
      showDevices: "Ipakita ang Devices",
      scanning: "Nag-scan...",
      scanningHint: "Naghahanap ng malapit na AdlaWatt device...",
      scanTitle: "Pumili ng Device",
      noDevices: "Walang natagpuang device",
      noDevicesDescription:
        "Panatilihing naka-on at malapit ang iyong AdlaWatt device, pagkatapos ay subukang mag-scan muli.",
      noDevicesHint: "Walang nakitang AdlaWatt device. Siguraduhing naka-on at malapit ang device, pagkatapos ay pindutin ang Mag-scan Muli.",
      selectDevice: "Pumili ng Bluetooth device",
      selectedDevice: "Napiling device",
      wifiSection: "Configuration ng Wi-Fi",
      wifiSsid: "Pangalan ng Network (SSID)",
      wifiSsidPlaceholder: "Ilagay ang pangalan ng Wi-Fi",
      wifiPassword: "Password ng Wi-Fi",
      wifiPasswordPlaceholder: "Ilagay ang password ng Wi-Fi",
      wifiSsidRequired: "Ilagay ang pangalan ng iyong Wi-Fi.",
      wifiPasswordRequired: "Ilagay ang password ng iyong Wi-Fi.",
      accountSection: "Account",
      loggedInAs: "Naka-log in bilang",
      assignmentCheckingUser: "Sinusuri ang iyong account...",
      assignmentChecking: "Kinukuha ang iyong monitoring assignment...",
      assignmentVerified: "Na-verify ang monitoring assignment",
      assignmentMissing:
        "Walang monitoring assignment para sa account na ito.",
      assignmentError:
        "Hindi ma-verify ang iyong monitoring assignment.",
      assignmentSessionExpired:
        "Hindi available o nag-expire na ang iyong session. Mag-sign in muli at subukang muli.",
      assignmentQueryFailed:
        "Hindi makuha ang iyong monitoring assignment. Awtomatiko kaming magreresubay.",
      assignmentAmbiguous:
        "Hindi matukoy ang iyong monitoring assignment. Makipag-ugnayan sa suporta.",
      assignmentInvalid:
        "Hindi wasto ang iyong monitoring assignment. Makipag-ugnayan sa suporta.",
      loginRequired: "Mag-sign in para mag-configure ng device.",
      send: "Ipadala ang Configuration",
      sending: "Ipinapadala...",
      retry: "Subukang Muli",
      assignmentRetry: "Subukang muli ang assignment",
      routeErrorTitle:
        "Hindi maipakita ang screen na ito.",
      routeErrorBody:
        "Subukang muli. Kung magpapatuloy ang problema, muling buksan ang app.",
      routeErrorRetry: "Subukang Muli",
      previewTitle: "Preview status",
      previewOpen: "Buksan ang status preview",
      previewNote: "Preview mode - hindi tunay na status ng device",
      bluetoothNotReady: "Hindi handa ang Bluetooth. I-on ito at payagan ang permission, pagkatapos ay subukang muli.",
      turnOnBluetooth: "I-on ang Bluetooth",
      turningOnBluetooth: "Ini-on...",
      openBluetoothSettings: "Buksan ang Bluetooth Settings",
      openSettings: "Buksan ang Settings",
      grantPermission: "Payagan ang Permission",
      checkingPermissions: "Sinusuri...",
      bluetoothEnableDeclined:
        "Hindi na-on ang Bluetooth. I-on ito para mahanap ang iyong AdlaWatt device.",
      bluetoothIosInstructions:
        "Para i-on ang Bluetooth, buksan ang Control Center o Settings, pagkatapos ay bumalik dito.",
      readiness_checking: "Sinusuri ang Bluetooth",
      readiness_checking_body:
        "Sinusuri ang Bluetooth at status ng permission...",
      readiness_unknown: "Sinusuri ang Bluetooth",
      readiness_unknown_body:
        "Naghihintay ng status ng Bluetooth...",
      readiness_resetting: "Nagre-reset ang Bluetooth",
      readiness_resetting_body:
        "Nagre-restart ang Bluetooth. Maghintay sandali.",
      readiness_unsupported: "Hindi suportado ang Bluetooth",
      readiness_unsupported_body:
        "Hindi sinusuportahan ng device na ito ang Bluetooth na kailangan para kumonekta sa AdlaWatt.",
      readiness_unauthorized: "Hindi magamit ang Bluetooth",
      readiness_unauthorized_body:
        "Hindi magamit ng AdlaWatt ang Bluetooth sa device na ito. Suriin ang system settings at subukang muli.",
      readiness_poweredOff: "Naka-off ang Bluetooth",
      readiness_poweredOff_body:
        "Kailangan ang Bluetooth para mahanap at makonekta ang iyong AdlaWatt monitoring device. I-on ang Bluetooth para magpatuloy.",
      readiness_permission_required: "Kailangan ang permission sa Bluetooth",
      readiness_permission_required_body:
        "Payagan ang Bluetooth permission para mahanap at makonekta ng AdlaWatt ang iyong device.",
      readiness_permission_denied: "Tinanggihan ang permission sa Bluetooth",
      readiness_permission_denied_body:
        "Kailangan ang Bluetooth permission para mag-scan ng iyong AdlaWatt device. Maaari mo itong payagan at subukang muli.",
      readiness_permission_blocked: "Naka-block ang permission sa Bluetooth",
      readiness_permission_blocked_body:
        "Naka-block ang Bluetooth permission sa system settings. Buksan ang Settings para payagan ito, pagkatapos ay bumalik dito.",
      readiness_ready: "Handa na ang Bluetooth",
      readiness_ready_body:
        "Maaari ka nang mag-scan ng malapit na AdlaWatt device.",
      provisioning: "Sine-set up ang device",
      success: "Matagumpay na na-save ang configuration",
      connectionFailed: "Nabigo ang koneksyon",
      status_idle: "Handang i-configure",
      status_scanning: "Nagha-hanap ng device",
      status_connecting: "Kumukonekta sa device",
      status_connected: "Nakonekta sa AW-01 sa pamamagitan ng Bluetooth",
      status_subscribed: "Handa na ang status notifications ng device",
      status_writing: "Ipinapadala ang configuration ng Wi-Fi at monitor ID sa AW-01",
      status_received: "Natanggap ng device ang configuration",
      status_busy: "Pinoproseso ng device ang request",
      status_wifi_connected: "Nakakonekta ang device sa Wi-Fi",
      status_wifi_failed: "Nabigo ang koneksyon sa Wi-Fi",
      status_wifi_lost: "Nawala ang koneksyon sa Wi-Fi",
      status_configured: "Matagumpay na na-save ang configuration",
      status_error: "Error sa provisioning",
      status_disconnected: "Nawala ang koneksyon sa Bluetooth",
      status_timeout: "Nag-time out ang pag-setup",
      timeout: "Nag-time out ang pag-setup",
      timeoutBody:
        "Hindi natapos ng device ang pag-setup sa loob ng {{seconds}} segundo. Panatilihing naka-on at malapit ito, pagkatapos ay subukan muli.",
      validationSsidRequired: "Maglagay ng pangalan ng Wi-Fi network.",
      validationSsidTooLong: "Masyadong mahaba ang pangalan ng Wi-Fi network.",
      validationPasswordTooLong: "Masyadong mahaba ang password ng Wi-Fi.",
      validationMonitorIdInvalid: "Invalid ang monitor ID.",
      validationInvalidText: "May invalid na character ang detalye ng Wi-Fi.",
      errorTitle: "Nabigo ang provisioning",
      errorBody:
        "Hindi natapos ng device ang request. Suriin ang detalye at subukang muli.",
      bleWriteNotPermitted:
        "Hindi tinatanggap ng AW-01 ang Bluetooth write mode na ito. I-update ang firmware ng device at subukang muli.",
      bleTxDescriptorMissing:
        "Nawawala ang status notification descriptor ng AW-01. I-update ang firmware ng device at subukang muli.",
      bleCharacteristicNotFound:
        "Hindi natagpuan ang kinakailangang Bluetooth characteristic. Panatilihing malapit ang device at subukang muli.",
      bleServiceNotFound:
        "Hindi natagpuan ang Bluetooth service ng AW-01. I-restart ang device at subukang muli.",
      bleOperationTimeout:
        "Nag-time out ang Bluetooth operation. Panatilihing naka-on at malapit ang device, pagkatapos ay subukang muli.",
      bleOperationCancelled:
        "Kinansela ang Bluetooth operation. Subukang muli.",
      bleDisconnected:
        "Nawala ang Bluetooth connection habang sine-set up. Panatilihing naka-on at malapit ang device, pagkatapos ay subukang muli.",
      bleGattError:
        "Tinanggihan ng device ang Bluetooth write. I-update ang firmware ng device at subukang muli.",
      permissionDenied:
        "Kailangan ang pahintulot sa Bluetooth para hanapin ang device.",
      bluetoothOff: "I-on ang Bluetooth para magpatuloy.",
    },
    home: {
      title: "Dashboard",
      subtitle: "I-monitor ang iyong AdlaWatt system nang real time.",
      electronicsRecommendation: "Electronics Recommendation",
      realtimeMonitoring: "Real-Time Monitoring",
      goToElectronicsRecommendation: "Pumunta sa Electronics Recommendation",
      offlineBanner:
        "Wala kang koneksyon — huling readings ang ipinapakita.",
      deviceOfflineBanner:
        "Offline ang device — huling readings ang ipinapakita.",
      lastUpdated:
        "Huling na-update {{time}}.",
      deviceLastSeen:
        "Huling nakita {{time}}.",
      deviceLastSeenUnavailable:
        "Hindi available ang huling nakita.",
      forecastFailed: "Hindi ma-load ang forecast.",
    },
    about: {
      title: "About Us",
      subtitle: "Kilalanin ang team sa likod ng AdlaWatt.",
      teamName: "Team AdlaWatt",
      teamBio:
        "Ang Team AdlaWatt ay isang grupo ng student researchers mula sa Northern Bukidnon State College na nasa likod ng AdlaWatt off-grid solar backup power system. Layunin ng team na bigyan ang mga sambahayan ng praktikal na paraan upang mapanatili ang kuryente at manatiling may alam tuwing may outage, at magkakasamang nagtrabaho mula sa konsepto at pagbuo ng hardware hanggang sa disenyo, pag-develop, at pag-test ng AdlaWatt mobile application. Simple lamang ang kanilang layunin: gawing mas madaling maintindihan, mas ligtas gamitin, at abot-kaya ng bawat pamilya ang backup energy.",
      developers: "Mga Developer",
      roleProgrammer: "Programmer",
      roleDocumenter: "Documenter",
      roleDataAnalyst: "Data Analyst",
      dev1Bio:
        "Bumubuo at nagme-maintain ng AdlaWatt mobile application, isinasama ang live na battery, solar, at temperature data mula sa mga sensor ng system tungo sa malinaw at real-time na karanasan, at nagde-develop ng recommendation logic na nagsasabi sa mga user kung aling electronics ang kayang patakbuhin nang ligtas ng kanilang kasalukuyang kuryente.",
      dev2Bio:
        "Nagdodokumento ng buong AdlaWatt system, mula sa hardware setup at safety guidance hanggang sa in-app user manual, upang magamit, maintindihan, at mapagpatuloy ng mga user at susunod na researchers ang proyekto nang may kumpiyansa.",
      dev3Bio:
        "Pinag-aaralan ang pumapasok na sensor data ng system, mula sa solar generation at electronics power draw hanggang sa performance ng baterya, at ginagawang insights ang mga ito upang mapabuti ang efficiency ng system at mapanatiling tumpak ang electronics recommendations.",
      contactDetails: "Contact Details",
    },
    manual: {
      title: "User Manual",
      subtitle: "Mga gabay sa pagpapatakbo ng iyong AdlaWatt system.",
    },
    preferences: {
      title: "Mga Kagustuhan",
      subtitle:
        "Pamahalaan ang itsura, wika, alerto, at notifications.",
    },
    electronics: {
      title: "Mga Electronics",
      subtitle: "Pamahalaan at i-monitor ang mga sinusuportahang electronics.",
    },
    components: {
      title: "Mga Komponente",
      subtitle: "I-monitor ang mga component ng AdlaWatt system.",
    },
    analytics: {
      title: "Analytics at Trends",
      subtitle:
        "Suriin ang solar, paggamit ng load, at aktibidad ng baterya para sa napiling saklaw.",
      sectionBattery: "Baterya",
      sectionSolar: "Solar",
      sectionEnergy: "Enerhiya",
      sectionHealth: "Kalusugan",
      sectionUsage: "Paggamit",
      generateReport: "Generate Report",
      goToGenerateReport: "Pumunta sa Generate Report",
      reportSavedTitle: "Nai-save na ang report",
      reportSavedTo: "Nai-save sa",
      reportPreviewTitle: "Preview ng report",
      reportOpenFile: "Buksan ang file",
      reportDone: "Tapos na",
    },
    logs: {
      title: "Activity Logs",
      subtitle: "Dito lilitaw ang aktibidad ng system at mga event ng electronics.",
      total: "Kabuuang Activity Logs:",
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

  electronicsBox: {
    editElectronics: "I-edit ang electronics item",
    archiveElectronics: "I-archive ang electronics item",
    unarchiveElectronics: "I-unarchive ang electronics item",
    deleteElectronics: "Burahin ang electronics item",
    showOptions: "Ipakita ang mga opsyon ng electronics",
    hideOptions: "Itago ang mga opsyon ng electronics",
    deleteQuestion: "Gusto mo ba itong burahin?",
    doNotDelete: "Huwag burahin ang electronics item",
    confirmDelete: "Kumpirmahin ang pagbura ng electronics item",
    archiveQuestion: "I-archive ang electronics item na ito?",
    unarchiveQuestion: "I-unarchive ang electronics item na ito?",
    doNotArchive: "Huwag i-archive ang electronics item",
    doNotUnarchive: "Huwag i-unarchive ang electronics item",
    confirmArchive: "Kumpirmahin ang pag-archive ng electronics item",
    confirmUnarchive: "Kumpirmahin ang pag-unarchive ng electronics item",
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

  onboarding: {
    skip: "Laktawan",
    proceed: "Pumunta sa Dashboard",
    swipeHint: "I-swipe para magpatuloy",
    page: "Pahina {{current}} ng {{total}}",
    welcome: {
      title: "Maligayang pagdating sa AdlaWatt",
      subtitle:
        "Kilalanin ang iyong solar power, anumang oras.",
    },
    about: {
      title: "Ano ang AdlaWatt?",
      subtitle:
        "Ang AdlaWatt ay isang off-grid solar backup power monitor. Sinusubaybayan nito ang iyong solar, baterya, temperatura, at output nang may real-time na datos mula sa iyong device.",
    },
    features: {
      title: "Mga Pangunahing Tampok",
      bulletDashboard: "Live dashboard na may mga gauge",
      bulletAlerts:
        "Matalinong alerto para sa mapanganib na antas",
      bulletPlanner:
        "Electronics planner at mga rekomendasyon",
      bulletLog: "Activity log at kasaysayan",
    },
    goals: {
      title: "Ang Aming Mga Layunin",
      bulletReliable:
        "Panatilihing maaasahan ang iyong backup power",
      bulletBattery:
        "Protektahan ang baterya laban sa pinsala",
      bulletWise:
        "Matulungan kang gamitin nang wasto ang enerhiya",
      bulletLanguages:
        "Madali para sa lahat — English, Cebuano, Tagalog",
    },
    finish: {
      title: "Handa Ka Na",
      subtitle: "Ang iyong power, nasa iyong mga kamay.",
    },
  },

  batteryEnergy: {
    title: "Magagamit na enerhiya",
    value: "{{wh}} Wh",
    ofUsable: "ng {{capacity}} Wh na magagamit",
    reserve: "{{wh}} Wh na protektadong reserve",
    status: {
      normal: "Normal",
      warning: "Mababa ang enerhiya",
      critical: "Kritikal",
      waiting: "Naghihintay ng data",
    },
    selectedLoad:
      "Napili: {{ac}} W AC · {{battery}} W mula sa baterya",
    liveDraw: "Live draw: {{watts}} W",
    timeRemaining: "Tantyang natitira: {{time}}",
  },

  batteryProtection: {
    warningTitle: "Mababa na ang magagamit na enerhiya",
    warningBody:
      "{{wh}} Wh na lang ang natitirang magagamit na enerhiya. Iwasang mag-on ng bagong appliances.",
    criticalTitle:
      "I-unplug ang hindi kinakailangang electronics",
    criticalBody:
      "Ang magagamit na enerhiya ay nasa {{percent}}% na lang. I-unplug agad ang lahat ng hindi mahalagang load.",
    newLoadTitle:
      "May natukoy na hindi nalistang load",
    newLoadBody:
      "Ang live draw ay humigit-kumulang {{watts}} W na mas mataas kaysa sa napiling load. Suriin ang mga naka-plug.",
    review: "Suriin ang electronics",
    criticalInstructions:
      "I-unplug ang lahat ng hindi mahalagang appliances, pagkatapos ay suriin ang mga naka-connect na electronics.",
    recovering:
      "Sinusuri ang stable na load at magagamit na enerhiya...",
    dismiss: "Gets ko",
    blocked:
      "Hintay muna ang bagong selection habang aktibo ang battery protection. Pwede mo pa ring tanggalin ang appliances.",
    closeA11y:
      "Isara ang abiso ng battery protection",
    reviewTitle: "Pagsusuri sa electronics",
    reviewBody:
      "Ito ang mga appliances na kasama sa kasalukuyang rekomendasyon.",
    done: "Tapos",
  },

  electronicsModal: {
    checkRecommendation: "Suriin ang Rekomendasyon",
    done: "Tapos",
    saving: "Sinisave...",
    selectAtLeastOne:
      "Pumili ng kahit isang appliance bago magpatuloy.",
    notAdvisableBlocked:
      "Hindi ito kanais-nais. Baguhin ang napili at suriin muli.",
    detectedHeader:
      "May electronics na naka-plug, tingnan ang rekomendasyon para sa tamang gabay.",
    reserveBlocked:
      "Uubusin ng load na ito ang natitirang magagamit na enerhiya. I-unplug ang isang load o baguhin ang napili bago magpatuloy.",
  },

  recommendationResult: {
    title: "Rekomendasyon",
    status: {
      empty: "Walang napiling electronics",
      waiting: "Naghihintay ng data ng baterya",
      blocked: "Kailangang i-check ang baterya",
      ready: "Pinagsamang rekomendasyon",
    },
    verdict: {
      recommended: "OK gamitin",
      care: "Gamitin nang may pag-iingat",
      notRecommended: "Hindi inirerekomenda",
      unknown: "Naghihintay",
    },
    badgeA11y: "Rekomendasyon: {{label}}",
    reason: {
      empty:
        "Pumili ng electronics para makita ang rekomendasyon.",
      waiting:
        "Naghihintay ng bagong pagbasa ng baterya.",
      offline:
        "Naghihintay na mag-online ang device.",
      stale:
        "Too old ang pagbasa ng baterya. Naghihintay ng bagong data.",
      blocked:
        "Nasa labas ng ligtas na limitasyon ang pagbasa ng baterya.",
      invalidWattage:
        "May invalid na wattage value.",
      overCap:
        "Lumampas sa ligtas na limitasyon ang pinagsamang peak load.",
      unsafeVoltage:
        "Ibaba ng pinagsamang peak load ang voltage sa ibaba ng ligtas na antas.",
      highDrain:
        "Gumagamit ng sobrang usable energy kada oras ang kombinasyong ito.",
      care:
        "Pwede gamitin nang may pag-iingat — i-lighten ang load.",
      recommended:
        "Ligtas gamitin sa antas ng bateryang ito.",
    },
    remainingBattery:
      "Tinantyang natitirang magagamit na enerhiya",
    estimatedRuntime:
      "Tinantyang oras ng paggamit",
    combinedPeak:
      "Pinagsamang peak load (panig ng baterya)",
    currentLoad: "Kasalukuyang load",
    alternativesTitle: "Mas mahusay na mga opsyon",
    noAlternatives:
      "Walang available na alternatibo sa ngayon.",
    estimateNote:
      "Gumagamit ng catalog wattage ang mga tantya, hindi live na pag-detect ng appliance.",
  },
} as const;

export default fil;
