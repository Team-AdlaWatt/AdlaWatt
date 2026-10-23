import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  loadLanguageSetting,
  saveLanguageSetting,
  type AppLanguage,
} from "@/services/settings";
import ceb from "@/locales/ceb";
import en from "@/locales/en";
import fil from "@/locales/fil";

// ============================================================
// I18N (v1: English / Filipino / Cebuano)
// ============================================================
//
// Default language is always English; the user switches
// manually in Menu > Language and the choice persists.
// react-i18next re-renders translated screens on change, so
// no reload is ever needed. Services (no hooks) use the
// default i18n.t() at call time — always current.
//
// Translation policy: UI chrome translates; proper nouns
// (electronics + catalog names, usernames, emails, brand,
// units, model terms) and email templates stay as-is.
// ============================================================

export const ACTIVE_LANGUAGES: {
  code: AppLanguage;
  label: string;
}[] = [
  { code: "en", label: "English" },
  { code: "ceb", label: "Cebuano (Bisaya)" },
  { code: "fil", label: "Tagalog" },
];

// Supported languages are English, Cebuano (Bisaya) and Tagalog only.

export type { AppLanguage };

let initialized = false;
let initPromise: Promise<void> | null = null;

async function initI18n(): Promise<void> {
  if (initialized) {
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    let saved: AppLanguage = "en";

    try {
      saved = await loadLanguageSetting();
    } catch {
      saved = "en";
    }

    // eslint-disable-next-line import/no-named-as-default-member -- use() is the documented i18next plugin API, not the React hook
    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        fil: { translation: fil },
        ceb: { translation: ceb },
      },
      lng: saved,
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      returnEmptyString: false,
    });

    initialized = true;
  })();

  await initPromise;
}

// Fire-and-forget at module load so translation is ready
// (default English paints instantly) before screens mount;
// the saved language applies itself when loaded.
void initI18n();

export async function setAppLanguage(
  code: AppLanguage,
): Promise<void> {
  await initI18n();
  // eslint-disable-next-line import/no-named-as-default-member -- changeLanguage() is the documented instance method, not a bare named export
  await i18n.changeLanguage(code);
  await saveLanguageSetting(code);
}

export function getAppLanguage(): AppLanguage {
  const current = i18n.language;

  return current === "fil" || current === "ceb"
    ? current
    : "en";
}

export default i18n;
