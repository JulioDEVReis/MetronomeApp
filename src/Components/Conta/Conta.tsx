import { useEffect, useState } from "react"
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

const syncStatusLabel: Record<SyncStatus, string> = {
  idle: "Sem sincronização",
  syncing: "A sincronizar…",
  synced: "Sincronizado",
  error: "Erro ao sincronizar",
}

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
        setError("Sessão expirada — inicia sessão novamente.")
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
        setError(body.error ?? "Não foi possível iniciar o pagamento.")
      }
    } catch {
      setError("Não foi possível iniciar o pagamento.")
    } finally {
      setUpgrading(false)
    }
  }

  if (!configured) {
    return (
      <section className="card">
        <div className="row row--between">
          <strong>Conta</strong>
        </div>
        <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.45 }}>
          Conta e sincronização indisponíveis — configuração em falta neste ambiente. O plano Grátis continua a
          funcionar normalmente, sem login.
        </p>
      </section>
    )
  }

  if (authLoading) {
    return (
      <section className="card">
        <div className="row row--between">
          <strong>Conta</strong>
        </div>
        <p style={{ marginTop: 10, opacity: 0.75 }}>A carregar…</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="card">
        <div className="row row--between">
          <strong>Conta</strong>
          <span className="planPill planPill--free">Grátis</span>
        </div>
        <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.45 }}>
          Inicia sessão para desbloqueares o teu PRO em qualquer aparelho e sincronizares as tuas músicas e
          playlists na nuvem.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <div className="label">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setLinkSent(false)
              }}
              placeholder="tu@exemplo.com"
            />
          </div>
          <button className="btn btn--primary" onClick={handleSignIn} disabled={!email.trim() || sending}>
            {sending ? "A enviar…" : "Enviar link de acesso"}
          </button>
        </div>
        {linkSent && (
          <p style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
            Verifica o teu email — enviámos um link para iniciares sessão.
          </p>
        )}
        {!!error && <div className="error">{error}</div>}
      </section>
    )
  }

  return (
    <section className="card">
      <div className="row row--between">
        <strong>Conta</strong>
        <span className={`planPill ${isPro ? "planPill--pro" : "planPill--free"}`}>
          {proLoading ? "…" : isPro ? "PRO" : "Grátis"}
        </span>
      </div>
      <p style={{ marginTop: 10, opacity: 0.85 }}>{user.email}</p>

      {checkoutCancelled && <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>Pagamento cancelado.</p>}

      {isPro ? (
        <p style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
          Obrigado! Todas as ferramentas estão desbloqueadas neste e em qualquer outro aparelho onde inicies sessão.
        </p>
      ) : (
        <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
          <button className="btn btn--primary" onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? "A abrir pagamento…" : "Tornar-me PRO — €4,99"}
          </button>
          <button className="btn btn--small" onClick={onRefreshPro} disabled={proLoading}>
            Verificar pagamento
          </button>
        </div>
      )}

      {!!error && <div className="error">{error}</div>}

      {conflict && (
        <div className="syncConflict">
          <strong style={{ fontSize: 13 }}>Encontrámos dados na nuvem e neste aparelho</strong>
          <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
            A nuvem tem {conflict.songs.length} música(s) e {conflict.playlists.length} playlist(s) guardadas de
            outro aparelho. Queres usar os dados da nuvem (substitui os deste aparelho) ou manter os locais
            (substitui os da nuvem)?
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn--primary btn--small" onClick={() => onResolveConflict(true)}>
              Usar os da nuvem
            </button>
            <button className="btn btn--small" onClick={() => onResolveConflict(false)}>
              Manter os deste aparelho
            </button>
          </div>
        </div>
      )}

      <div className="row row--between" style={{ marginTop: 12 }}>
        <span style={{ opacity: 0.7, fontSize: 12 }}>{syncStatusLabel[syncStatus]}</span>
        <button className="btn btn--small" onClick={onSignOut}>
          Terminar sessão
        </button>
      </div>
    </section>
  )
}

export default Conta
