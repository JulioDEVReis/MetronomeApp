type UpgradeHintProps = {
  message: string
  onGoToConta: () => void
}

const UpgradeHint = ({ message, onGoToConta }: UpgradeHintProps) => {
  return (
    <div className="upgradeHint">
      <span>{message}</span>
      <button type="button" className="btn btn--small btn--primary" onClick={onGoToConta}>
        Tornar-me PRO — €4,99
      </button>
    </div>
  )
}

export default UpgradeHint
