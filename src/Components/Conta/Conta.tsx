import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { User } from "@supabase/supabase-js"
import { getSupabase } from "../../lib/supabaseClient"
import type { RemoteData } from "../../lib/cloudStore"

type SyncStatus = "idle" | "syncing" | "synced" | "error"

type ContaProps = {
  configured: boolean
  authLoading: boolean
  user: User | null
  isPro: boolean
  proLoading: boolean
  justCompletedCheckout: boolean
  checkoutCancelled: boolean
  syncStatus: SyncStatus
  conflict: RemoteData | null
  onSignIn: (email: string) => Promise<{ error: string | null }>
  onSignOut: () => void
  onRefreshPro: () => void
  onResolveConflict: (useRemote: boolean) => void
}

const POLL_INTERVAL_MS = 2500
const POLL_MAX_ATTEMPTS = 12

const Conta = ({
  configured,
  authLoading,
  user,
  isPro,
  proLoading,
  justCompletedCheckout,
  checkoutCancelled,
  syncStatus,
  conflict,
  onSignIn,
  onSignOut,
  onRefreshPro,
  onResolveConflict,
}: ContaProps) => {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [error, setError] = useState("")
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    if (!justCompletedCheckout) return
    let attempts = 0
    const interval = window.setInterval(() => {
      attempts++
      onRefreshPro()
      if (attempts >= POLL_MAX_ATTEMPTS) window.clearInterval(interval)
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [justCompletedCheckout, onRefreshPro])

  async function handleSignIn() {
    setError("")
    const trimmed = email.trim()
    if (!trimmed) return
    setSending(true)
    const { error: signInError } = await onSignIn(trimmed)
    setSending(false)
    if (signInError) setError(signInError)
    else setLinkSent(true)
  }

  async function handleUpgrade() {
    setError("")
    const supabase = getSupabase()
    if (!supabase) return
    setUpgrading(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError(t("conta.sessionExpired"))
        return
      }
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      if (res.ok && body.url) {
        window.location.href = body.url
      } else {
        setError(body.error ?? t("conta.paymentError"))
      }
    } catch {
      setError(t("conta.paymentError"))
    } finally {
      setUpgrading(false)
    }
  }

  if (!configured) {
    return (
      <section className="card">
        <div className="row row--between">
          <strong>{t("conta.title")}</strong>
        </div>
        <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.45 }}>
          {t("conta.notConfigured")}
        </p>
      </section>
    )
  }

  if (authLoading) {
    return (
      <section className="card">
        <div className="row row--between">
          <strong>{t("conta.title")}</strong>
        </div>
        <p style={{ marginTop: 10, opacity: 0.75 }}>{t("conta.loading")}</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="card">
        <div className="row row--between">
          <strong>{t("conta.title")}</strong>
          <span className="planPill planPill--free">{t("plan.free")}</span>
        </div>
        <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.45 }}>
          {t("conta.loginPrompt")}
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <div className="label">{t("conta.email")}</div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setLinkSent(false)
              }}
              placeholder={t("conta.emailPlaceholder")}
            />
          </div>
          <button className="btn btn--primary" onClick={handleSignIn} disabled={!email.trim() || sending}>
            {sending ? t("conta.sending") : t("conta.sendMagicLink")}
          </button>
        </div>
        {linkSent && (
          <p style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
            {t("conta.linkSentMessage")}
          </p>
        )}
        {!!error && <div className="error">{error}</div>}
      </section>
    )
  }

  return (
    <section className="card">
      <div className="row row--between">
        <strong>{t("conta.title")}</strong>
        <span className={`planPill ${isPro ? "planPill--pro" : "planPill--free"}`}>
          {proLoading ? "…" : isPro ? t("plan.pro") : t("plan.free")}
        </span>
      </div>
      <p style={{ marginTop: 10, opacity: 0.85 }}>{user.email}</p>

      {checkoutCancelled && <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>{t("conta.checkoutCancelled")}</p>}

      {isPro ? (
        <p style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
          {t("conta.thankYouPro")}
        </p>
      ) : (
        <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
          <button className="btn btn--primary" onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? t("conta.openingPayment") : t("conta.becomePro")}
          </button>
          <button className="btn btn--small" onClick={onRefreshPro} disabled={proLoading}>
            {t("conta.verifyPayment")}
          </button>
        </div>
      )}

      {!!error && <div className="error">{error}</div>}

      {conflict && (
        <div className="syncConflict">
          <strong style={{ fontSize: 13 }}>{t("conta.syncConflictTitle")}</strong>
          <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
            {t("conta.syncConflictBody", { songs: conflict.songs.length, playlists: conflict.playlists.length })}
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn--primary btn--small" onClick={() => onResolveConflict(true)}>
              {t("conta.useCloud")}
            </button>
            <button className="btn btn--small" onClick={() => onResolveConflict(false)}>
              {t("conta.keepLocal")}
            </button>
          </div>
        </div>
      )}

      <div className="row row--between" style={{ marginTop: 12 }}>
        <span style={{ opacity: 0.7, fontSize: 12 }}>{t(`conta.sync.${syncStatus}`)}</span>
        <button className="btn btn--small" onClick={onSignOut}>
          {t("conta.signOut")}
        </button>
      </div>
    </section>
  )
}

export default Conta
