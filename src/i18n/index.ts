import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"
import pt from "./locales/pt.json"
import es from "./locales/es.json"

export const SUPPORTED_LANGUAGES = ["en", "pt", "es"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: SupportedLanguage = "en"

const STORAGE_KEY = "metronome-lang"

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export function getStoredLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function setStoredLanguage(lang: SupportedLanguage) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // localStorage unavailable — language choice just won't persist across reloads.
  }
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es },
    },
    lng: getStoredLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
  })

export default i18n
