import type { IncomingMessage, ServerResponse } from "node:http"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

// Vercel must not pre-parse the body: Stripe's signature check needs the
// exact raw bytes it sent.
export const config = { api: { bodyParser: false } }

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405
    res.end("Método não permitido.")
    return
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    res.statusCode = 500
    res.end("Configuração em falta no servidor.")
    return
  }

  const stripe = new Stripe(stripeSecretKey)
  const signature = req.headers["stripe-signature"]
  const rawBody = await readRawBody(req)

  let event: Stripe.Event
  try {
    if (!signature || Array.isArray(signature)) throw new Error("Assinatura em falta.")
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    res.statusCode = 400
    res.end(`Falha na verificação da assinatura: ${err instanceof Error ? err.message : "erro desconhecido"}`)
    return
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id ?? session.metadata?.supabase_user_id ?? null

    if (userId) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
      await supabaseAdmin.from("entitlements").upsert(
        {
          user_id: userId,
          app: "metronome",
          is_pro: true,
          purchased_at: new Date().toISOString(),
          stripe_session_id: session.id,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,app" },
      )
    }
  }

  res.statusCode = 200
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify({ received: true }))
}
