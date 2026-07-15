import { useTranslation } from "react-i18next"
import { SUPPORTED_LANGUAGES, setStoredLanguage, type SupportedLanguage } from "../../i18n"

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "EN",
  pt: "PT",
  es: "ES",
}

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  function handleSelect(lang: SupportedLanguage) {
    void i18n.changeLanguage(lang)
    setStoredLanguage(lang)
  }

  return (
    <div className="langSwitcher" role="group" aria-label="Language">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          className={`langSwitcher__btn ${current === lang ? "langSwitcher__btn--active" : ""}`}
          onClick={() => handleSelect(lang)}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitcher
