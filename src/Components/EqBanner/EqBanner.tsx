import { useTranslation } from "react-i18next"
import "./EqBanner.css"

const EQ_APP_URL = "https://eq.indrumhead.com"

const EqBanner = () => {
  const { t } = useTranslation()

  return (
    <a href={EQ_APP_URL} target="_blank" rel="noopener noreferrer" className="eqBanner">
      <span className="eqBanner__text">{t("eqBanner.text")}</span>
      <span className="eqBanner__cta">{t("eqBanner.cta")} →</span>
    </a>
  )
}

export default EqBanner
