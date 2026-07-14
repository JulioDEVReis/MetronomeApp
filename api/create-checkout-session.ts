import type { IncomingMessage, ServerResponse } from "node:http"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(body))
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Método não permitido." })
    return
  }

  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) {
    sendJson(res, 401, { error: "Sessão inválida." })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRICE_ID
  const appBaseUrl = process.env.APP_BASE_URL || process.env.VITE_APP_URL

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !priceId || !appBaseUrl) {
    sendJson(res, 500, { error: "Configuração em falta no servidor." })
    return
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    sendJson(res, 401, { error: "Sessão inválida." })
    return
  }

  const stripe = new Stripe(stripeSecretKey)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userData.user.id,
      metadata: { supabase_user_id: userData.user.id, app: "metronome" },
      success_url: `${appBaseUrl}/?checkout=success`,
      cancel_url: `${appBaseUrl}/?checkout=cancelled`,
    })
    sendJson(res, 200, { url: session.url })
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Não foi possível iniciar o pagamento." })
  }
}
