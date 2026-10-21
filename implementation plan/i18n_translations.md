# AdlaWatt — UI Translations (en / fil / ceb)

Status: **DRAFT — awaiting native review**. Generated from
`src/locales/{en,fil,ceb}.ts`, so every row below is
byte-identical to a shipped string (including `{{var}}`
placeholders — never edit or drop the braces).

Active languages: English `en` (default, source of truth),
Filipino `fil`, Cebuano `ceb` — these three only, no coming-soon rows.

Translation policy: UI chrome translates; proper nouns
(electronics + catalog names, usernames, emails, brand,
units, model terms) and email templates stay as-is. Dates
and numbers localize in format only, never in content.

How to review: reply with corrections per **Key**. Amendments
land in the locale modules first, then this doc is
re-generated and committed together — never edit this file
by hand.

## Common (9 keys)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `common.or` | OR | O | O | Also mirrored as auth.login.dividerOr for the login divider. |
| `common.resendIn` | Resend in {{seconds}}s | Muling ipadala sa {{seconds}}s | Ipadala pag-usab sa {{seconds}}s |  |
| `common.resending` | Resending... | Muling ipinapadala... | Gipadala pag-usab... |  |
| `common.wentWrong` | Something went wrong. Please try again. | May naganap na mali. Pakisubukang muli. | May sayop nga nahitabo. Palihug sulayi pag-usab. |  |
| `common.noConnection` | No connection. Check your internet and try again. | Walang koneksyon. Suriin ang iyong internet at subukang muli. | Walay koneksyon. Susiha ang imong internet ug sulayi pag-usab. |  |
| `common.tooManyRequests` | Too many requests. Please wait a moment and try again. | Masyadong maraming pagtatangka. Maghintay sandali at subukang muli. | Sobra kadaghan ang pagsulay. Paghulat ug sulayi pag-usab. |  |
| `common.confirmationThrottled` | A confirmation email was sent recently. Please wait before requesting another. | Kamakailan ay nagpadala ng confirmation email. Maghintay bago humiling ng panibago. | Bag-o lang nagpadala ug confirmation email. Paghulat sa dili pa mangayo pag-usab. |  |
| `common.authRequired` | No authenticated user found. | Walang naka-authenticate na user. | Walay naka-authenticate nga user. |  |
| `common.accountLoadFailed` | Unable to load your account information. | Hindi ma-load ang impormasyon ng iyong account. | Dili ma-load ang impormasyon sa imong account. |  |

## Validation (14 keys)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `validation.emailRequired` | Please enter your email address. | Pakilagay ang iyong email address. | Palihug isulod ang imong email address. |  |
| `validation.emailInvalid` | Please enter a valid email address. | Pakilagay ang wastong email address. | Palihug isulod ang balido nga email address. |  |
| `validation.usernameRequired` | Please enter a username. | Pakilagay ang username. | Palihug isulod ang username. |  |
| `validation.usernameShort` | Username must be at least 3 characters. | Ang username ay dapat na hindi bababa sa 3 karakter. | Ang username kinahanglan dili mominus sa 3 ka karakter. |  |
| `validation.usernameLong` | Username must not exceed 30 characters. | Ang username ay hindi dapat lumampas sa 30 karakter. | Ang username dili molapas sa 30 ka karakter. |  |
| `validation.usernameChars` | Username can only contain letters, numbers, and underscores. | Ang username ay maaari lamang maglaman ng mga letra, numero, at underscore. | Ang username mahimo lang nga adunay mga letra, numero, ug underscore. |  |
| `validation.passwordShort` | Password must be at least 8 characters. | Ang password ay dapat na hindi bababa sa 8 karakter. | Ang password kinahanglan dili mominus sa 8 ka karakter. |  |
| `validation.passwordLong` | Password must not exceed 72 characters. | Ang password ay hindi dapat lumampas sa 72 karakter. | Ang password dili molapas sa 72 ka karakter. |  |
| `validation.passwordsMismatch` | Passwords do not match. Please check both password fields. | Hindi tugma ang mga password. Pakisuri ang parehong password field. | Dili magtugma ang mga password. Palihug susiha ang duha ka password field. |  |
| `validation.identifierRequired` | Please enter your username or email and password. | Pakilagay ang iyong username o email at password. | Palihug isulod ang imong username o email ug password. |  |
| `validation.identifierEmpty` | Please enter your username or email. | Pakilagay ang iyong username o email. | Palihug isulod ang imong username o email. |  |
| `validation.passwordEmpty` | Please enter your password. | Pakilagay ang iyong password. | Palihug isulod ang imong password. |  |
| `validation.termsRequired` | Please agree to the Terms and Conditions. | Pakisang-ayunan ang Terms and Conditions. | Palihug uyon sa Terms and Conditions. |  |
| `validation.termsRequiredLong` | Please agree to the Terms and Conditions before creating your account. | Pakisang-ayunan ang Terms and Conditions bago likhain ang iyong account. | Palihug uyon sa Terms and Conditions sa dili pa buhaton ang imong account. |  |

## Password Input (14 keys)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `passwordInput.labelPassword` | Password | Password | Password |  |
| `passwordInput.labelNewPassword` | New Password | Bagong Password | Bag-ong Password |  |
| `passwordInput.labelConfirmNewPassword` | Confirm New Password | Kumpirmahin ang Bagong Password | Kumpirmahi ang Bag-ong Password |  |
| `passwordInput.placeholderPassword` | Enter your password | Ilagay ang iyong password | Isulod ang imong password |  |
| `passwordInput.placeholderNewPassword` | Create a password | Lumikha ng password | Pagbuhat ug password |  |
| `passwordInput.placeholderConfirmPassword` | Confirm your password | Kumpirmahin ang iyong password | Kumpirmahi ang imong password |  |
| `passwordInput.placeholderCreateNew` | Create a new password | Lumikha ng bagong password | Pagbuhat ug bag-ong password |  |
| `passwordInput.placeholderConfirmNew` | Confirm your new password | Kumpirmahin ang iyong bagong password | Kumpirmahi ang imong bag-ong password |  |
| `passwordInput.showA11y` | Show password for 5 seconds | Ipakita ang password sa loob ng 5 segundo | Ipakita ang password sulod sa 5 segundos |  |
| `passwordInput.showHint` | Shows password for 5 seconds | Ipinapakita ang password sa loob ng 5 segundo | Nagpakita sa password sulod sa 5 segundos |  |
| `passwordInput.hideA11y` | Hide password, auto-hides in {{seconds}} seconds | Itago ang password, awtomatikong magtatago sa loob ng {{seconds}} segundo | Tagoa ang password, awtomatikong motago sa {{seconds}} ka segundos |  |
| `passwordInput.hideHint` | Password is visible and will hide automatically | Nakikita ang password at awtomatikong magtatago | Makita ang password ug awtomatikong motago |  |
| `passwordInput.visibleLive` | Password visible, hides in {{seconds}} seconds | Nakikitang password, magtatago sa loob ng {{seconds}} segundo | Makita ang password, motago sa {{seconds}} ka segundos |  |
| `passwordInput.visibleHint` | Showing password… hides in {{seconds}}s | Ipinapakita ang password… magtatago sa loob ng {{seconds}}s | Nagpakita sa password… motago sa {{seconds}}s |  |

## Auth — Login (33 keys)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `auth.login.title` | Welcome Back | Maligayang Pagbabalik | Maayong Pagbalik |  |
| `auth.login.subtitle` | Sign in to continue using AdlaWatt. | Mag-sign in upang magpatuloy sa paggamit ng AdlaWatt. | Pag-sign in aron magpadayon sa paggamit sa AdlaWatt. |  |
| `auth.login.identifierLabel` | Username or Email | Username o Email | Username o Email |  |
| `auth.login.identifierPlaceholder` | Enter your username or email | Ilagay ang iyong username o email | Isulod ang imong username o email |  |
| `auth.login.forgotPassword` | Forgot Password? | Nakalimutan ang Password? | Nalimtan ang Password? |  |
| `auth.login.forgotPasswordLabel` | Forgot password | Nakalimutan ang password | Nalimtan ang password |  |
| `auth.login.forgotPasswordHint` | Recover your password via email | Bawiin ang iyong password sa pamamagitan ng email | Bawi-a ang imong password pinaagi sa email |  |
| `auth.login.signIn` | Sign In | Mag-Sign In | Pag-Sign In |  |
| `auth.login.signingIn` | Signing In... | Nagsa-sign In... | Nag-sign In... |  |
| `auth.login.dividerOr` | OR | O | O |  |
| `auth.login.continueWithGoogle` | Continue with Google | Magpatuloy gamit ang Google | Padayon gamit ang Google |  |
| `auth.login.connecting` | Connecting... | Kumokonekta... | Nagkonek... |  |
| `auth.login.googleA11y` | Continue with Google | Magpatuloy gamit ang Google | Padayon gamit ang Google |  |
| `auth.login.googleHint` | Sign in with your Google account | Mag-sign in gamit ang iyong Google account | Pag-sign in gamit ang imong Google account |  |
| `auth.login.invalidCredentials` | The username or password is incorrect. | Mali ang username o password. | Sayop ang username o password. |  |
| `auth.login.signInFailed` | We could not sign you in. Please check your information and try again. | Hindi ka namin ma-sign in. Pakisuri ang iyong impormasyon at subukang muli. | Dili ka namo ma-sign in. Palihug susiha ang imong impormasyon ug sulayi pag-usab. |  |
| `auth.login.sessionFailed` | Unable to create a login session. | Hindi makalikha ng login session. | Dili makabuhat ug login session. |  |
| `auth.login.sessionFailedNow` | Unable to sign in right now. Please try again. | Hindi makapag-sign in sa ngayon. Pakisubukang muli. | Dili makapag-sign in karon. Palihug sulayi pag-usab. |  |
| `auth.login.emailNotConfirmed` | Please confirm your email address before signing in. Check your inbox for the confirmation link. | Pakikumpirma ang iyong email address bago mag-sign in. Suriin ang iyong inbox para sa confirmation link. | Palihug kumpirmahi ang imong email address sa dili pa mag-sign in. Susiha ang imong inbox para sa confirmation link. |  |
| `auth.login.tooManyAttempts` | Too many sign-in attempts. Please wait a moment and try again. | Masyadong maraming pagtatangka sa pag-sign in. Maghintay sandali at subukang muli. | Sobra kadaghan ang pagsulay sa pag-sign in. Paghulat ug sulayi pag-usab. |  |
| `auth.login.googleUnavailable` | Google sign-in is unavailable right now. Please try again. | Hindi available ang Google sign-in sa ngayon. Pakisubukang muli. | Dili available ang Google sign-in karon. Palihug sulayi pag-usab. |  |
| `auth.login.googleIncomplete` | Google sign-in was not completed. Please try again. | Hindi nakumpleto ang Google sign-in. Pakisubukang muli. | Wala mahuman ang Google sign-in. Palihug sulayi pag-usab. |  |
| `auth.login.googleFailed` | Unable to sign in with Google right now. Please try again. | Hindi makapag-sign in gamit ang Google sa ngayon. Pakisubukang muli. | Dili makapag-sign in gamit ang Google karon. Palihug sulayi pag-usab. |  |
| `auth.login.verifyTitle` | Verify Your Email | I-verify ang Iyong Email | I-verify ang Imong Email |  |
| `auth.login.verifySent` | • Sent | • Naipadala | • Napadala |  |
| `auth.login.verifyTo` | To: | Para kay: | Ngadto kang: |  |
| `auth.login.verifyBody` | Your account needs verification before you can sign in. | Kailangan ng beripikasyon ang iyong account bago ka makapag-sign in. | Kinahanglan ug beripikasyon ang imong account sa dili pa ka makapag-sign in. |  |
| `auth.login.verifySentFresh` | We've just sent a fresh confirmation link. Check your inbox. | Kakalabas lang namin ng bagong confirmation link. Suriin ang iyong inbox. | Bag-o lang namo gipadala ug confirmation link. Susiha ang imong inbox. |  |
| `auth.login.verifySentRecent` | A link was sent recently. Tap resend below if it hasn't arrived. | Kamakailan ay nagpadala ng link. Pindutin ang resend sa ibaba kung hindi pa ito dumarating. | Bag-o lang nagpadala ug link. Pindota ang resend sa ubos kung wala pa kini moabot. |  |
| `auth.login.verifySendFresh` | Tap resend below for a new confirmation link. | Pindutin ang resend sa ibaba para sa bagong confirmation link. | Pindota ang resend sa ubos para sa bag-ong confirmation link. |  |
| `auth.login.resendConfirmation` | Resend confirmation email | Muling ipadala ang confirmation email | Ipadala pag-usab ang confirmation email |  |
| `auth.login.footerPrompt` | Don't have an account? | Wala ka pang account? | Wala pa kay account? |  |
| `auth.login.footerAction` | Create Account | Lumikha ng Account | Pagbuhat ug Account |  |

## Auth — Register (27 keys)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `auth.register.title` | Create Account | Lumikha ng Account | Pagbuhat ug Account |  |
| `auth.register.subtitle` | Create your AdlaWatt account to start monitoring your energy. | Likhain ang iyong AdlaWatt account upang simulan ang pagmomonitor ng iyong enerhiya. | Buhata ang imong AdlaWatt account aron sugdan ang pagmonitor sa imong enerhiya. |  |
| `auth.register.usernameLabel` | Username | Username | Username |  |
| `auth.register.usernamePlaceholder` | Enter your username | Ilagay ang iyong username | Isulod ang imong username |  |
| `auth.register.emailLabel` | Email Address | Email Address | Email Address |  |
| `auth.register.emailPlaceholder` | Enter your email | Ilagay ang iyong email | Isulod ang imong email |  |
| `auth.register.agreePrefix` | I agree to the  | Sumasang-ayon ako sa  | Mouyon ako sa  |  |
| `auth.register.termsLink` | Terms and Conditions | Terms and Conditions | Terms and Conditions |  |
| `auth.register.agreeA11y` | Agree to Terms and Conditions | Sumang-ayon sa Terms and Conditions | Uyon sa Terms and Conditions |  |
| `auth.register.openTermsA11y` | Open Terms and Conditions | Buksan ang Terms and Conditions | Ablihi ang Terms and Conditions |  |
| `auth.register.createAccount` | Create Account | Lumikha ng Account | Pagbuhat ug Account |  |
| `auth.register.creatingAccount` | Creating Account... | Lumilikha ng Account... | Naghimo ug Account... |  |
| `auth.register.accountFailed` | Unable to create your account. | Hindi malikha ang iyong account. | Dili mabuhat ang imong account. |  |
| `auth.register.accountTaken` | Unable to create your account with these details. Try signing in instead. | Hindi malikha ang iyong account gamit ang mga detalyeng ito. Subukang mag-sign in sa halip. | Dili mabuhat ang imong account gamit kini nga mga detalye. Sulayi pag-sign in hinuon. |  |
| `auth.register.tooManyAttempts` | Too many attempts. Please wait a moment and try again. | Masyadong maraming pagtatangka. Maghintay sandali at subukang muli. | Sobra kadaghan ang pagsulay. Paghulat ug sulayi pag-usab. |  |
| `auth.register.accountNotCreated` | Account could not be created. | Hindi malikha ang account. | Dili mabuhat ang account. |  |
| `auth.register.accountFailedNow` | Unable to create your account. Please try again. | Hindi malikha ang iyong account. Pakisubukang muli. | Dili mabuhat ang imong account. Palihug sulayi pag-usab. |  |
| `auth.register.checkEmailTitle` | Check your email | Suriin ang iyong email | Susiha ang imong email |  |
| `auth.register.confirmationSent` | We sent a confirmation link to {{email}}. Click the link to verify your account, then sign in. | Nagpadala kami ng confirmation link sa {{email}}. I-click ang link upang i-verify ang iyong account, pagkatapos ay mag-sign in. | Nagpadala kami ug confirmation link sa {{email}}. I-click ang link aron i-verify ang imong account, dayon pag-sign in. |  |
| `auth.register.resendConfirmation` | Resend confirmation email | Muling ipadala ang confirmation email | Ipadala pag-usab ang confirmation email |  |
| `auth.register.continueToSignIn` | Continue to Sign In | Magpatuloy sa Sign In | Padayon sa Sign In |  |
| `auth.register.useDifferentEmail` | Use a different email address | Gumamit ng ibang email address | Paggamit ug laing email address |  |
| `auth.register.useDifferentEmailA11y` | Use a different email address | Gumamit ng ibang email address | Paggamit ug laing email address |  |
| `auth.register.resendFailed` | Unable to resend confirmation email. | Hindi muling maipadala ang confirmation email. | Dili mapadala pag-usab ang confirmation email. |  |
| `auth.register.footerPrompt` | Already have an account? | May account ka na? | Naana kay account? |  |
| `auth.register.footerAction` | Sign In | Mag-Sign In | Pag-Sign In |  |
| `auth.register.googleHint` | Create your account with Google | Lumikha ng iyong account gamit ang Google | Pagbuhat ug imong account gamit ang Google | Register-specific hint; login uses its own copy. |

## Auth — Forgot Password (38 keys)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `auth.forgot.title` | Reset Password | I-reset ang Password | I-reset ang Password |  |
| `auth.forgot.subtitleRequest` | Enter your account email. We'll send you a recovery link. | Ilagay ang email ng iyong account. Padadalhan ka namin ng recovery link. | Isulod ang email sa imong account. Padad-an ka namo ug recovery link. |  |
| `auth.forgot.subtitleVerified` | Your email is confirmed. Continue to your account or set a new password. | Nakumpirma ang iyong email. Magpatuloy sa iyong account o magtakda ng bagong password. | Nakumpirma ang imong email. Padayon sa imong account o pagbutang ug bag-ong password. |  |
| `auth.forgot.emailLabel` | Email Address | Email Address | Email Address |  |
| `auth.forgot.emailPlaceholder` | Enter your email | Ilagay ang iyong email | Isulod ang imong email |  |
| `auth.forgot.sendLink` | Send Recovery Link | Ipadala ang Recovery Link | Ipadala ang Recovery Link |  |
| `auth.forgot.sending` | Sending... | Ipinapadala... | Gipadala... |  |
| `auth.forgot.sendFailed` | Unable to send a recovery email right now. Please try again. | Hindi makapagpadala ng recovery email sa ngayon. Pakisubukang muli. | Dili makapadala ug recovery email karon. Palihug sulayi pag-usab. |  |
| `auth.forgot.recoveryThrottled` | A recovery email was sent recently. Please wait before requesting another. | Kamakailan ay nagpadala ng recovery email. Maghintay bago humiling ng panibago. | Bag-o lang nagpadala ug recovery email. Paghulat sa dili pa mangayo pag-usab. |  |
| `auth.forgot.recoveryFailed` | Unable to send a recovery email right now. Please try again. | Hindi makapagpadala ng recovery email sa ngayon. Pakisubukang muli. | Dili makapadala ug recovery email karon. Palihug sulayi pag-usab. |  |
| `auth.forgot.recoveryLinkBad` | This recovery link is invalid or has expired. Request a new one below. | Hindi wasto o nag-expire na ang recovery link na ito. Humiling ng bago sa ibaba. | Dili balido o na-expire na kini nga recovery link. Pagpangayo ug bag-o sa ubos. |  |
| `auth.forgot.recoveryLinkWrong` | This link is not a password recovery link. Request a new recovery email below. | Hindi ito password recovery link. Humiling ng bagong recovery email sa ibaba. | Dili kini password recovery link. Pagpangayo ug bag-ong recovery email sa ubos. |  |
| `auth.forgot.recoveryExpired` | This recovery link is invalid or has expired. Request a new one. | Hindi wasto o nag-expire na ang recovery link na ito. Humiling ng bago. | Dili balido o na-expire na kini nga recovery link. Pagpangayo ug bag-o. |  |
| `auth.forgot.recoveryUpdateFailed` | Unable to update your password right now. Please try again. | Hindi ma-update ang iyong password sa ngayon. Pakisubukang muli. | Dili ma-update ang imong password karon. Palihug sulayi pag-usab. |  |
| `auth.forgot.checkEmailTitle` | Check Your Email | Suriin ang Iyong Email | Susiha ang Imong Email |  |
| `auth.forgot.checkEmailSent` | • Sent | • Naipadala | • Napadala |  |
| `auth.forgot.checkEmailTo` | To: | Para kay: | Ngadto kang: |  |
| `auth.forgot.checkEmailInbox` | your inbox | iyong inbox | imong inbox |  |
| `auth.forgot.checkEmailBody` | We sent a recovery link. Tap it, then set a new password. | Nagpadala kami ng recovery link. I-tap ito, pagkatapos ay magtakda ng bagong password. | Nagpadala kami ug recovery link. I-tap kini, dayon pagbutang ug bag-ong password. |  |
| `auth.forgot.resendRecovery` | Resend recovery email | Muling ipadala ang recovery email | Ipadala pag-usab ang recovery email |  |
| `auth.forgot.checkEmailHint` | Didn't get it? Check spam or try a different address. | Hindi natanggap? Suriin ang spam o sumubok ng ibang address. | Wala madawat? Susiha ang spam o sulayi ug laing address. |  |
| `auth.forgot.verifyingTitle` | Verifying Link | Bine-verify ang Link | Gina-verify ang Link |  |
| `auth.forgot.verifyingBody` | Verifying your recovery link… | Bine-verify ang iyong recovery link… | Gina-verify ang imong recovery link… |  |
| `auth.forgot.verifiedTitle` | Email Confirmed | Nakumpirma ang Email | Nakumpirma ang Email |  |
| `auth.forgot.verifiedBody` | You have successfully confirmed your email. | Matagumpay mong nakumpirma ang iyong email. | Malampuson nimong nakumpirma ang imong email. |  |
| `auth.forgot.continueToAccount` | Continue to Account | Magpatuloy sa Account | Padayon sa Account |  |
| `auth.forgot.showChangeForm` | Or you want to change your password? | O gusto mo bang palitan ang iyong password? | O gusto ba nimong usbon ang imong password? |  |
| `auth.forgot.hideChangeForm` | Hide password fields | Itago ang mga password field | Tagoa ang mga password field |  |
| `auth.forgot.showChangeFormA11y` | Show password change form | Ipakita ang form ng pagpapalit ng password | Ipakita ang form sa pag-usab sa password |  |
| `auth.forgot.hideChangeFormA11y` | Hide password change form | Itago ang form ng pagpapalit ng password | Tagoa ang form sa pag-usab sa password |  |
| `auth.forgot.changeFormHint` | Reveals the new password fields | Inilalantad ang mga bagong password field | Nagpakita sa bag-ong mga password field |  |
| `auth.forgot.updatePassword` | Update Password | I-update ang Password | I-update ang Password |  |
| `auth.forgot.updating` | Updating... | Ina-update... | Gina-update... |  |
| `auth.forgot.recoveryEmailSent` | Recovery email sent | Naipadala ang recovery email | Napadala ang recovery email |  |
| `auth.forgot.verifyingLink` | Verifying recovery link | Bine-verify ang recovery link | Gina-verify ang recovery link |  |
| `auth.forgot.emailConfirmed` | Email confirmed | Nakumpirma ang email | Nakumpirma ang email |  |
| `auth.forgot.footerPrompt` | Remembered your password? | Naalala mo ang iyong password? | Nahinumdom ka sa imong password? |  |
| `auth.forgot.footerAction` | Back to Sign In | Bumalik sa Sign In | Balik sa Sign In |  |

## Auth — Callback (16 keys)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `auth.callback.title` | Email Confirmation | Kumpirmasyon ng Email | Kumpirmasyon sa Email |  |
| `auth.callback.subtitle` | Confirming your AdlaWatt account email. | Kinukumpirma ang email ng iyong AdlaWatt account. | Gina-kumpirma ang email sa imong AdlaWatt account. |  |
| `auth.callback.oauthTitle` | Google Sign-In | Google Sign-In | Google Sign-In |  |
| `auth.callback.oauthSubtitle` | Finishing your Google sign-in. | Tinátapos ang iyong Google sign-in. | Ginatapos ang imong Google sign-in. |  |
| `auth.callback.linkInvalid` | The confirmation link is invalid or has expired. | Hindi wasto o nag-expire na ang confirmation link. | Dili balido o na-expire na ang confirmation link. |  |
| `auth.callback.linkInvalidResend` | This confirmation link is invalid or has expired. Request a new one from the sign-in screen. | Hindi wasto o nag-expire na ang confirmation link na ito. Humiling ng bago mula sa sign-in screen. | Dili balido o na-expire na kini nga confirmation link. Pagpangayo ug bag-o gikan sa sign-in screen. |  |
| `auth.callback.linkMissing` | This link arrived without its verification code. If you were resetting your password, request a fresh recovery link — otherwise request a new confirmation email. | Dumating ang link na ito nang walang verification code. Kung nire-reset mo ang iyong password, humiling ng bagong recovery link — kung hindi, humiling ng bagong confirmation email. | Miabot kini nga link nga walay verification code. Kung nag-reset ka sa imong password, pagpangayo ug bag-ong recovery link — kung dili, pagpangayo ug bag-ong confirmation email. |  |
| `auth.callback.confirmed` | Your email is confirmed. Taking you to your dashboard. | Nakumpirma ang iyong email. Dadalhin ka sa iyong dashboard. | Nakumpirma ang imong email. Dad-on ka sa imong dashboard. |  |
| `auth.callback.signedInGoogle` | Signed in with Google. Taking you to your dashboard. | Naka-sign in gamit ang Google. Dadalhin ka sa iyong dashboard. | Naka-sign in gamit ang Google. Dad-on ka sa imong dashboard. |  |
| `auth.callback.signedIn` | You are signed in. Taking you to your dashboard. | Naka-sign in ka. Dadalhin ka sa iyong dashboard. | Naka-sign in ka. Dad-on ka sa imong dashboard. |  |
| `auth.callback.googleIncomplete` | Google sign-in was not completed. Please try again from the sign-in screen. | Hindi nakumpleto ang Google sign-in. Pakisubukang muli mula sa sign-in screen. | Wala mahuman ang Google sign-in. Palihug sulayi pag-usab gikan sa sign-in screen. |  |
| `auth.callback.continueToDashboard` | Continue to Dashboard | Magpatuloy sa Dashboard | Padayon sa Dashboard |  |
| `auth.callback.backToSignIn` | Back to Sign In | Bumalik sa Sign In | Balik sa Sign In |  |
| `auth.callback.goToResetPassword` | Go to Reset Password | Pumunta sa Reset Password | Adto sa Reset Password |  |
| `auth.callback.footerPrompt` | Need a new account? | Kailangan ng bagong account? | Kinahanglan ug bag-ong account? |  |
| `auth.callback.footerAction` | Create Account | Lumikha ng Account | Pagbuhat ug Account |  |

## Menu — Language Picker (3 keys)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `menu.language.title` | Language | Wika | Pinulongan |  |
| `menu.language.chooseLanguage` | Choose language | Pumili ng wika | Pagpili ug pinulongan |  |
| `menu.language.current` | Current: {{language}} | Kasalukuyan: {{language}} | Karon: {{language}} |  |

## Menu — Dashboard (79 keys, Phase 1)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `menu.title` | Menu | Menu | Menu |  |
| `menu.subtitle` | Browse and manage your AdlaWatt application. | I-browse at pamahalaan ang iyong AdlaWatt application. | Tan-awa ug dumalaha ang imong AdlaWatt application. |  |
| `menu.accountProfile` | Account Profile | Profile ng Account | Profile sa Account |  |
| `menu.preferences` | Preferences | Mga Kagustuhan | Mga Kagustuhan |  |
| `menu.userManual` | User Manual | Manwal ng Gumagamit | Manwal sa Gumagamit |  |
| `menu.components` | Components | Mga Komponente | Mga Komponente |  |
| `menu.activityLogs` | Activity Logs | Mga Tala ng Aktibidad | Mga Tala sa Aktibidad |  |
| `menu.aboutUs` | About Us | Tungkol sa Amin | Mahitungod Kanamo |  |
| `menu.openAccountProfile` | Open Account Profile | Buksan ang Account Profile | Ablihi ang Account Profile | a11y |
| `menu.openPreferences` | Open Preferences | Buksan ang Preferences | Ablihi ang Preferences | a11y |
| `menu.openUserManual` | Open User Manual | Buksan ang User Manual | Ablihi ang User Manual | a11y |
| `menu.openComponents` | Open Components | Buksan ang Components | Ablihi ang Components | a11y |
| `menu.openActivityLogs` | Open Activity Logs | Buksan ang Activity Logs | Ablihi ang Activity Logs | a11y |
| `menu.openAboutUs` | Open About Us | Buksan ang About Us | Ablihi ang About Us | a11y |
| `menu.loadingAccount` | Loading account information... | Naglo-load ng impormasyon ng account... | Nag-load sa impormasyon sa account... |  |
| `menu.username` | Username | Username | Username |  |
| `menu.email` | Email | Email | Email |  |
| `menu.update` | Update | Update | Update |  |
| `menu.enterUsername` | Enter username | Ilagay ang username | Isulod ang username | placeholder |
| `menu.enterEmail` | Enter email | Ilagay ang email | Isulod ang email | placeholder |
| `menu.currentPassword` | Current Password | Current Password | Current Password |  |
| `menu.enterCurrentPassword` | Enter current password | Ilagay ang current password | Isulod ang current password | placeholder |
| `menu.keepCurrentPassword` | Leave blank to keep current | Iwang blangko upang panatilihin | Biyai nga blangko aron magpabilin | placeholder |
| `menu.confirmNewPasswordPlaceholder` | Confirm new password | Kumpirmahin ang bagong password | Kumpirmahi ang bag-ong password | placeholder |
| `menu.cancel` | Cancel | Cancel | Cancel |  |
| `menu.submit` | Submit | Submit | Submit |  |
| `menu.save` | Save | Save | Save |  |
| `menu.saving` | Saving... | Nagse-save... | Nag-save... |  |
| `menu.confirm` | Confirm | Confirm | Confirm |  |
| `menu.cancelAccountChanges` | Cancel account changes | Kanselahin ang mga pagbabago sa account | Kanselahon ang mga pagbag-o sa account | a11y |
| `menu.submitAccountChanges` | Submit account changes | Isumite ang mga pagbabago sa account | Isumite ang mga pagbag-o sa account | a11y |
| `menu.cancelPreferences` | Cancel Preferences | Kanselahin ang Preferences | Kanselahon ang Preferences | a11y |
| `menu.savePreferences` | Save Preferences | I-save ang Preferences | I-save ang Preferences | a11y |
| `menu.logoutA11y` | Log out | Mag-log out | Pag-log out | a11y |
| `menu.exitAppA11y` | Exit app | Isara ang app | Isira ang app | a11y |
| `menu.themes` | Themes | Themes | Themes |  |
| `menu.themesA11y` | Themes | Themes | Themes | a11y |
| `menu.themeSystem` | System | System | System | display only; option code stays `system` |
| `menu.themeDark` | Dark | Dark | Dark | display only; option code stays `dark` |
| `menu.themeLight` | Light | Light | Light | display only; option code stays `light` |
| `menu.themeSystemWith` | System ({{mode}}) | System ({{mode}}) | System ({{mode}}) |  |
| `menu.themeOptionA11y` | Theme {{option}} | Theme {{option}} | Theme {{option}} | a11y; option text stays backend-bound |
| `menu.colorBlindMode` | Color Blind Mode | Color Blind Mode | Color Blind Mode |  |
| `menu.colorBlindHint` | Adjust colors for better accessibility. | Ayusin ang mga kulay para sa accessibility. | I-adjust ang mga kolor para sa accessibility. |  |
| `menu.fontSize` | Font Size | Font Size | Font Size |  |
| `menu.fontSmall` | Small | Small | Small | display only |
| `menu.fontMedium` | Medium | Medium | Medium | display only |
| `menu.fontBig` | Big | Big | Big | display only |
| `menu.fontSizeOptionA11y` | Font size {{option}} | Font size {{option}} | Font size {{option}} | a11y |
| `menu.fontFamily` | Font Family | Font Family | Font Family |  |
| `menu.chooseFontFamily` | Choose font family | Pumili ng font family | Pagpili ug font family | a11y |
| `menu.currentFont` | Current: {{font}} | Kasalukuyan: {{font}} | Karon: {{font}} | a11y |
| `menu.vibration` | Vibration | Vibration | Vibration |  |
| `menu.vibrationHint` | Vibrate when important alerts are received. | Mag-vibrate kapag may mahalagang alerto. | Mag-vibrate kung adunay importanteng alerto. |  |
| `menu.emailNotifications` | Email Notifications | Email Notifications | Email Notifications |  |
| `menu.emailNotificationsHint` | Allow AdlaWatt to send alerts and notifications through your email. | Payagan ang AdlaWatt na magpadala ng mga alerto sa iyong email. | Tugoti ang AdlaWatt nga magpadala ug mga alerto sa imong email. |  |
| `menu.confirmChanges` | Confirm Changes | Kumpirmahin ang mga Pagbabago | Kumpirmahi ang mga Pagbag-o |  |
| `menu.confirmChangesBody` | Enter your current password to confirm these account changes. | Ilagay ang iyong current password upang kumpirmahin ang mga pagbabagong ito. | Isulod ang imong current password aron kumpirmahon kini nga mga pagbag-o. |  |
| `menu.accountUpdated` | Account Updated | Na-update ang Account | Na-update ang Account | alert title |
| `menu.accountUpdatedEmailPending` | Your username was updated. Please confirm your new email address. | Na-update ang iyong username. Pakikumpirma ang iyong bagong email address. | Na-update ang imong username. Palihug kumpirmahi ang imong bag-ong email address. | alert fallback |
| `menu.changesSaved` | Changes Saved | Nai-save ang mga Pagbabago | Nai-save ang mga Pagbag-o | alert title |
| `menu.changesSavedMessage` | Your account information has been updated successfully. | Matagumpay na na-update ang iyong account. | Malampuson nga na-update ang imong account. | alert message |
| `menu.noChanges` | No account changes were made. | Walang ginawang pagbabago sa account. | Walay gihimong pagbag-o sa account. | warning |
| `menu.currentPasswordRequired` | Enter your current password. | Ilagay ang iyong current password. | Isulod ang imong current password. | warning |
| `menu.currentPasswordShort` | Current password must be at least 8 characters. | Ang current password ay dapat na hindi bababa sa 8 karakter. | Ang current password kinahanglan dili mominus sa 8 ka karakter. | warning |
| `menu.updateFailed` | Unable to update your account. | Hindi ma-update ang iyong account. | Dili ma-update ang imong account. | warning fallback |
| `menu.updateFailedNow` | Unable to update your account. Please try again. | Hindi ma-update ang iyong account. Pakisubukang muli. | Dili ma-update ang imong account. Palihug sulayi pag-usab. | warning |
| `menu.logoutTitle` | Log Out | Mag-Log Out | Pag-Log Out | alert title + label |
| `menu.logoutMessage` | Are you sure you want to sign out? | Sigurado ka bang gusto mong mag-sign out? | Sigurado ka nga gusto kang mag-sign out? | alert message |
| `menu.logoutNo` | No | Hindi | Dili | alert button |
| `menu.logoutYes` | Yes | Oo | Oo | alert button |
| `menu.exitTitle` | Exit | Lumabas | Gawas | alert title + label |
| `menu.exitMessage` | Please close this tab manually to exit AdlaWatt. | Pakisarado ang tab na ito upang lumabas sa AdlaWatt. | Palihug isira kini nga tab aron mogawas sa AdlaWatt. | alert message |
| `menu.exitWebMessage` | Are you sure you want to exit AdlaWatt? | Sigurado ka bang gusto mong lumabas sa AdlaWatt? | Sigurado ka nga gusto kang mogawas sa AdlaWatt? | alert message |
| `menu.exitAppTitle` | Exit App | Isara ang App | Isira ang App | alert title |
| `menu.exitAppMessage` | AdlaWatt will close. Are you sure? | Isasara ang AdlaWatt. Sigurado ka? | Isira ang AdlaWatt. Sigurado ka? | alert message |
| `menu.exitNo` | No | Hindi | Dili | alert button |
| `menu.exitYes` | Yes | Oo | Oo | alert button |
| `menu.englishName` | English | English | English | fallback label |

## Dashboard — Home (6 keys, Phase 1)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `dashboard.home.title` | Dashboard | Dashboard | Dashboard |  |
| `dashboard.home.subtitle` | Monitor your AdlaWatt system in real time. | I-monitor ang iyong AdlaWatt system nang real time. | I-monitor ang imong AdlaWatt system nga real time. |  |
| `dashboard.home.applianceRecommendation` | Electronics Recommendation | Electronics Recommendation | Electronics Recommendation |  |
| `dashboard.home.realtimeMonitoring` | Real-Time Monitoring | Real-Time Monitoring | Real-Time Monitoring |  |
| `dashboard.home.goToApplianceRecommendation` | Go to Electronics Recommendation | Pumunta sa Electronics Recommendation | Adto sa Electronics Recommendation | a11y |
| `dashboard.home.forecastFailed` | Could not load the forecast. | Hindi ma-load ang forecast. | Dili ma-load ang forecast. | error fallback |
| `dashboard.home.offlineBanner` | You're offline — showing last readings. | Wala kang koneksyon — huling readings ang ipinapakita. | Wala kay koneksyon — katapusang readings ang gipakita. | offline banner |
| `dashboard.home.lastUpdated` | Last updated {{time}}. | Huling na-update {{time}}. | Katapusang na-update {{time}}. | offline banner |

## Shared (13 keys, Phase 1–2)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `shared.close` | Close | Isara | Isira | a11y |
| `shared.signedInAs` | Signed in as {{username}} | Naka-sign in bilang {{username}} | Naka-sign in isip {{username}} | a11y; username stays as-is |
| `shared.notifications` | Notifications | Mga Notification | Mga Notification | a11y |
| `shared.emptyTitle` | No Activity Logs | Walang Activity Logs | Walay Activity Logs | default prop |
| `shared.emptyDescription` | No activities match the selected filters. | Walang aktibidad na tumutugma sa mga filter. | Walay aktibidad nga motugma sa mga filter. | default prop |
| `shared.errorTitle` | Couldn't load data | Hindi ma-load ang data | Dili ma-load ang data |  |
| `shared.retry` | Try Again | Subukang Muli | Sulayi Pag-usab |  |
| `shared.paginationPrev` | Prev | Nakaraan | Miagi | Phase 2 |
| `shared.paginationNext` | Next | Susunod | Sunod | Phase 2 |
| `shared.paginationPage` | Page {{current}} of {{total}} | Pahina {{current}} ng {{total}} | Pahina {{current}} sa {{total}} | Phase 2 |
| `shared.no` | No | Hindi | Dili | Phase 2; confirm buttons |
| `shared.yes` | Yes | Oo | Oo | Phase 2; confirm buttons |
| `shared.cancel` | Cancel | Cancel | Cancel | Phase 2 |

## Media Picker (14 keys, Phase 2)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `media.title` | Choose Photo | Pumili ng Larawan | Pagpili ug Hulagway |  |
| `media.chooseFromLibrary` | Choose from Library | Pumili mula sa Library | Pagpili gikan sa Library |  |
| `media.opening` | Opening… | Binubuksan… | Giablihan… |  |
| `media.chooseA11y` | Choose from library | Pumili mula sa library | Pagpili gikan sa library | a11y |
| `media.chooseHint` | Opens your photo library | Binubuksan ang iyong photo library | Giablihan ang imong photo library | a11y hint |
| `media.removePhoto` | Remove Photo | Alisin ang Larawan | Tangtangon ang Hulagway |  |
| `media.removeA11y` | Remove photo | Alisin ang larawan | Tangtangon ang hulagway | a11y |
| `media.removeHint` | Removes the current photo and restores the default icon | Inaalis ang kasalukuyang larawan at ibinabalik ang default icon | Gitangtang ang karon nga hulagway ug gibalik ang default icon | a11y hint |
| `media.cancelChoiceA11y` | Cancel photo choice | Kanselahin ang pagpili ng larawan | Kanselahon ang pagpili ug hulagway | a11y |
| `media.permissionDenied` | AdlaWatt needs photo access to attach a picture. Allow access in your device Settings, then try again. | Kailangan ng AdlaWatt ng photo access upang maglakip ng larawan. Payagan ang access sa Settings ng iyong device, pagkatapos ay subukang muli. | Kinahanglan sa AdlaWatt ug photo access aron maglakip ug hulagway. Tugoti ang access sa Settings sa imong device, dayon sulayi pag-usab. |  |
| `media.unreadable` | Could not read that photo. Try another one. | Hindi mabasa ang larawang iyon. Sumubok ng iba. | Dili mabasa kana nga hulagway. Sulayi ug lain. |  |
| `media.tooBig` | That photo is over 5 MB. Choose a smaller one. | Ang larawang iyon ay lumampas sa 5 MB. Pumili ng mas maliit. | Kana nga hulagway milapas sa 5 MB. Pagpili ug mas gamay. | 5 MB stays in sync with MAX_PHOTO_BYTES |
| `media.processFailed` | Could not process that photo. Try another one. | Hindi ma-process ang larawang iyon. Sumubok ng iba. | Dili ma-process kana nga hulagway. Sulayi ug lain. |  |
| `media.libraryFailed` | Could not open your photo library. Try again. | Hindi mabuksan ang iyong photo library. Subukang muli. | Dili maablihan ang imong photo library. Sulayi pag-usab. |  |

## Electronics Box (15 keys, Phase 2)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `applianceBox.editAppliance` | Edit electronics item | I-edit ang electronics item | I-edit ang electronics item | a11y |
| `applianceBox.archiveAppliance` | Archive electronics item | I-archive ang electronics item | I-archive ang electronics item | a11y |
| `applianceBox.unarchiveAppliance` | Unarchive electronics item | I-unarchive ang electronics item | I-unarchive ang electronics item | a11y |
| `applianceBox.deleteAppliance` | Delete electronics item | Burahin ang electronics item | Papason ang electronics item | a11y |
| `applianceBox.showOptions` | Show electronics options | Ipakita ang mga opsyon ng electronics | Ipakita ang mga opsyon sa electronics | a11y |
| `applianceBox.hideOptions` | Hide electronics options | Itago ang mga opsyon ng electronics | Tagoa ang mga opsyon sa electronics | a11y |
| `applianceBox.deleteQuestion` | You want to delete this? | Gusto mo ba itong burahin? | Gusto ba nimong papason kini? |  |
| `applianceBox.doNotDelete` | Do not delete electronics item | Huwag burahin ang electronics item | Ayaw papasa ang electronics item | a11y |
| `applianceBox.confirmDelete` | Confirm delete electronics item | Kumpirmahin ang pagbura ng electronics item | Kumpirmahi ang pagpapasa sa electronics item | a11y |
| `applianceBox.archiveQuestion` | Archive this electronics item? | I-archive ang electronics item na ito? | I-archive kini nga electronics item? |  |
| `applianceBox.unarchiveQuestion` | Unarchive this electronics item? | I-unarchive ang electronics item na ito? | I-unarchive kini nga electronics item? |  |
| `applianceBox.doNotArchive` | Do not archive electronics item | Huwag i-archive ang electronics item | Ayaw i-archive ang electronics item | a11y |
| `applianceBox.doNotUnarchive` | Do not unarchive electronics item | Huwag i-unarchive ang electronics item | Ayaw i-unarchive ang electronics item | a11y |
| `applianceBox.confirmArchive` | Confirm archive electronics item | Kumpirmahin ang pag-archive ng electronics item | Kumpirmahi ang pag-archive sa electronics item | a11y |
| `applianceBox.confirmUnarchive` | Confirm unarchive electronics item | Kumpirmahin ang pag-unarchive ng electronics item | Kumpirmahi ang pag-unarchive sa electronics item | a11y |

## Activity Card (6 keys, Phase 2)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `activityCard.recentActivity` | Recent Activity | Kamakailang Aktibidad | Bag-ong Aktibidad |  |
| `activityCard.viewAll` | View All | Tingnan Lahat | Tan-awa Tanan |  |
| `activityCard.viewAllActivity` | View all activity | Tingnan ang lahat ng aktibidad | Tan-awa ang tanan nga aktibidad | a11y |
| `activityCard.fallbackDetails` | No activity details available. | Walang detalye ng aktibidad. | Walay detalye sa aktibidad. | fallback |
| `activityCard.fallbackTitle` | Activity | Aktibidad | Aktibidad | fallback |
| `activityCard.typeA11y` | Type {{label}} | Uri: {{label}} | Matang: {{label}} | a11y; label stays backend-bound |

## Notification Card (4 keys, Phase 2)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `notificationCard.fallbackTitle` | Notification | Notification | Notification | fallback |
| `notificationCard.fallbackDetails` | No notification details available. | Walang detalye ng notification. | Walay detalye sa notification. | fallback |
| `notificationCard.newTypeA11y` | New, Type {{label}} | Bago, Uri: {{label}} | Bag-o, Matang: {{label}} | a11y; label stays backend-bound |
| `notificationCard.typeA11y` | Type {{label}} | Uri: {{label}} | Matang: {{label}} | a11y; label stays backend-bound |

## Dashboard — About (14 keys, Phase 2)

Names, contact values stay as-is.

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `dashboard.about.title` | About Us | About Us | About Us |  |
| `dashboard.about.subtitle` | Learn more about AdlaWatt and its purpose. | Alamin ang tungkol sa AdlaWatt at sa layunin nito. | Pagkat-on bahin sa AdlaWatt ug sa katuyoan niini. |  |
| `dashboard.about.tagline` | An IoT-Based Off-Grid Solar Backup Power System with Real-Time Energy Monitoring and Electronics Recommendation | Isang IoT-Based Off-Grid Solar Backup Power System na may Real-Time Energy Monitoring at Electronics Recommendation | Usa ka IoT-Based Off-Grid Solar Backup Power System nga adunay Real-Time Energy Monitoring ug Electronics Recommendation |  |
| `dashboard.about.overview` | AdlaWatt is a transportable, off-grid solar backup power system … maintain power during blackouts. | Ang AdlaWatt ay isang nadadalang off-grid solar backup power system … magkaroon ng kuryente tuwing blackout. | Ang AdlaWatt usa ka madalang off-grid solar backup power system … magpabilin ang kuryente panahon sa blackout. | long paragraph; see locale modules for full text |
| `dashboard.about.developers` | Developers | Mga Developer | Mga Developer |  |
| `dashboard.about.roleProgrammer` | Programmer | Programmer | Programmer |  |
| `dashboard.about.roleDocumenter` | Documenter | Documenter | Documenter |  |
| `dashboard.about.roleDataAnalyst` | Data Analyst | Data Analyst | Data Analyst |  |
| `dashboard.about.dev1Bio` | Develops and maintains software and system firmware … | Nagde-develop at nagme-maintain ng software at system firmware … | Nag-develop ug nag-maintain sa software ug system firmware … | see locale modules |
| `dashboard.about.dev2Bio` | Authors user manuals, system setup guides … | Sumusulat ng user manuals, system setup guides … | Nagsulat ug user manuals, system setup guides … | see locale modules |
| `dashboard.about.dev3Bio` | Analyzes incoming sensor telemetry … | Sinusuri ang pumapasok na sensor telemetry … | Nag-analisar sa mosulod nga sensor telemetry … | see locale modules |
| `dashboard.about.contactDetails` | Contact Details | Contact Details | Contact Details |  |

`dashboard.manual.*` (2 keys): `title` User Manual, `subtitle` Guides for operating your AdlaWatt system. (fil/ceb in modules)

## Dashboard — Activity Logs (15 keys, Phase 2)

Codes stay backend-bound; labels map for display. Dates localize in format only (`en-US`/`fil-PH`/`ceb-PH`).

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `dashboard.logs.title` | Activity Logs | Activity Logs | Activity Logs |  |
| `dashboard.logs.subtitle` | System activity and electronics events will appear here. | Dito lilitaw ang aktibidad ng system at mga event ng electronics. | Dinhi makita ang aktibidad sa system ug mga event sa electronics. |  |
| `dashboard.logs.total` | Total Activity Logs: | Kabuuang Activity Logs: | Tibuok Activity Logs: |  |
| `dashboard.logs.loadFailed` | We couldn't load your activity logs. Check your connection and try again. | Hindi ma-load ang iyong activity logs. Suriin ang iyong koneksyon at subukang muli. | Dili ma-load ang imong activity logs. Susiha ang imong koneksyon ug sulayi pag-usab. | thrown error |
| `dashboard.logs.timeRange` | Time Range | Saklaw ng Oras | Sakop sa Oras |  |
| `dashboard.logs.activityType` | Activity Type | Uri ng Aktibidad | Matang sa Aktibidad |  |
| `dashboard.logs.timeAll` | All | Lahat | Tanan | display map |
| `dashboard.logs.timeLastHour` | Last Hour | Nakaraang Oras | Miaging Oras | display map |
| `dashboard.logs.timeToday` | Today | Ngayon | Karon | display map |
| `dashboard.logs.timeThisWeek` | This Week | Linggong Ito | Kining Semanaha | display map |
| `dashboard.logs.timeThisYear` | This Year | Taong Ito | Kining Tuiga | display map |
| `dashboard.logs.typeAll` | All | Lahat | Tanan | display map |
| `dashboard.logs.typeInfo` | Info | Info | Info | display map |
| `dashboard.logs.typeWarning` | Warning | Babala | Pahimangno | display map |
| `dashboard.logs.typeError` | Error | Error | Error | display map |
| `dashboard.logs.typeCritical` | Critical | Kritikal | Kritikal | display map |

## Dashboard — Notifications (24 keys, Phase 2)

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `dashboard.notifications.title` | Notifications | Mga Notification | Mga Notification |  |
| `dashboard.notifications.subtitle` | System notifications and important alerts will appear here. | Dito lilitaw ang mga notification ng system at mahahalagang alerto. | Dinhi makita ang mga notification sa system ug importanteng mga alerto. |  |
| `dashboard.notifications.total` | Total Notifications: | Kabuuang Notification: | Tibuok Notification: |  |
| `dashboard.notifications.loadFailed` | We couldn't load your notifications. Check your connection and try again. | Hindi ma-load ang iyong mga notification. Suriin ang iyong koneksyon at subukang muli. | Dili ma-load ang imong mga notification. Susiha ang imong koneksyon ug sulayi pag-usab. | thrown error |
| `dashboard.notifications.markFailed` | Couldn't mark notifications as read. Please try again. | Hindi ma-mark as read ang mga notification. Pakisubukang muli. | Dili ma-mark as read ang mga notification. Palihug sulayi pag-usab. | fallback |
| `dashboard.notifications.markError` | Couldn't mark as read. Check your connection and try again. | Hindi ma-mark as read. Suriin ang iyong koneksyon at subukang muli. | Dili ma-mark as read. Susiha ang imong koneksyon ug sulayi pag-usab. |  |
| `dashboard.notifications.marking` | Marking... | Mini-mark... | Gina-mark... |  |
| `dashboard.notifications.markAsRead` | Mark as Read | Mark as Read | Mark as Read |  |
| `dashboard.notifications.markAllAsRead` | Mark all as read | I-mark lahat as read | I-mark tanan as read | a11y |
| `dashboard.notifications.recent` | Recent | Kamakailan | Bag-o |  |
| `dashboard.notifications.earlier` | Earlier | Mas Maaga | Kaniadto |  |
| `dashboard.notifications.noNotifications` | No Notifications | Walang Notification | Walay Notification |  |
| `dashboard.notifications.noNotificationsDesc` | No notifications found for the selected filters. | Walang notification para sa mga napiling filter. | Walay notification para sa napiling mga filter. |  |
| `dashboard.notifications.timeRange` | Time Range | Saklaw ng Oras | Sakop sa Oras |  |
| `dashboard.notifications.notificationType` | Notification Type | Uri ng Notification | Matang sa Notification |  |
| `dashboard.notifications.timeAll` … `timeThisYear` | All / Last Hour / Today / This Week / This Year | Lahat / Nakaraang Oras / Ngayon / Linggong Ito / Taong Ito | Tanan / Miaging Oras / Karon / Kining Semanaha / Kining Tuiga | display maps |
| `dashboard.notifications.typeAll` | All | Lahat | Tanan | display map |
| `dashboard.notifications.typeNormal` | Normal | Normal | Normal | display map |
| `dashboard.notifications.typeAlert` | Alert | Alerto | Alerto | display map |

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `shared.close` | Close | Isara | Isira | a11y |
| `shared.signedInAs` | Signed in as {{username}} | Naka-sign in bilang {{username}} | Naka-sign in isip {{username}} | a11y; username stays as-is |
| `shared.notifications` | Notifications | Mga Notification | Mga Notification | a11y |
| `shared.emptyTitle` | No Activity Logs | Walang Activity Logs | Walay Activity Logs | default prop |
| `shared.emptyDescription` | No activities match the selected filters. | Walang aktibidad na tumutugma sa mga filter. | Walay aktibidad nga motugma sa mga filter. | default prop |
| `shared.errorTitle` | Couldn't load data | Hindi ma-load ang data | Dili ma-load ang data |  |
| `shared.retry` | Try Again | Subukang Muli | Sulayi Pag-usab |  |

## Dashboard — Electronics / Components / Analytics headers

| Key | English | Filipino | Cebuano | Notes |
|---|---|---|---|---|
| `dashboard.electronics.title` | Electronics | Mga Electronics | Mga Electronics |  |
| `dashboard.electronics.subtitle` | Manage and monitor supported electronics. | Pamahalaan at i-monitor ang mga sinusuportahang electronics. | Dumalaha ug i-monitor ang gisuportahang mga electronics. |  |
| `dashboard.components.title` | Components | Mga Komponente | Mga Komponente |  |
| `dashboard.components.subtitle` | Monitor AdlaWatt system components. | I-monitor ang mga component ng AdlaWatt system. | I-monitor ang mga component sa AdlaWatt system. |  |
| `dashboard.analytics.title` | Analytics & Trends | Analytics at Trends | Analytics ug Trends |  |
| `dashboard.analytics.subtitle` | Analyze system performance, energy usage, temperature, and electronics data over time. | Suriin ang performance ng system, paggamit ng enerhiya, temperatura, at datos ng electronics sa paglipas ng panahon. | Susiha ang performance sa system, paggamit sa enerhiya, temperatura, ug datos sa electronics sa paglabay sa panahon. |  |
| `dashboard.analytics.sectionBattery` | Battery | Baterya | Baterya | section header |
| `dashboard.analytics.sectionSolar` | Solar | Solar | Solar | section header |
| `dashboard.analytics.sectionEnergy` | Energy | Enerhiya | Enerhiya | section header |
| `dashboard.analytics.sectionHealth` | Health | Kalusugan | Panglawas | section header |
| `dashboard.analytics.sectionUsage` | Usage | Paggamit | Paggamit | section header |

## Backend-bound (stays English by policy, Phase 1)

- DB status enums: `Online`/`Offline`, `Charging`/`Discharging`/`Idle`, `Safe`/`Unsafe`, solar/temperature statuses — compared with `===` and written by ESP32/cron.
- Log/notification types: `info`/`warning`/`error`/`critical`, stored activity-log titles, email badge `ALERT`/`NORMAL`.
- Proper nouns: electronics/catalog names, usernames, emails, brand, units (`W`, `V`, `°C`).
- Option codes: theme `system`/`light`/`dark`, font-size codes; only display labels translate.
- `themeLabel()` helper output stays English (feeds activity-log rows).

## Out of scope (stay English by policy)

- Stored activity-log content (database rows, not UI copy)
- Terms and Conditions legal text (requires legal review, not translation review)
- Transactional email templates (spam-filter sensitive)
- `updateAccount` messages (Menu surface — phase 2 dashboard extraction)
