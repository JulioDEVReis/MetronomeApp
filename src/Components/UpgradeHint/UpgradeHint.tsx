import { useTranslation } from "react-i18next"

type UpgradeHintProps = {
  message: string
  onGoToConta: () => void
}

const UpgradeHint = ({ message, onGoToConta }: UpgradeHintProps) => {
  const { t } = useTranslation()
  return (
    <div className="upgradeHint">
      <span>{message}</span>
      <button type="button" className="btn btn--small btn--primary" onClick={onGoToConta}>
        {t("upgradeHint.cta")}
      </button>
    </div>
  )
}

export default UpgradeHint
