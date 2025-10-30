import twilio from "twilio"

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER // e.g., 'whatsapp:+14155238886'

function getClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null
  try {
    return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  } catch {
    return null
  }
}

export async function sendWhatsAppMessage(to: string, body: string) {
  console.log('send functionnnnnnnnn')
  // to must be in E.164 format: +123..., and Twilio requires 'whatsapp:' prefix
  const client = getClient()
const from = TWILIO_PHONE_NUMBER?.startsWith("whatsapp:")
  ? TWILIO_PHONE_NUMBER
  : `whatsapp:${TWILIO_PHONE_NUMBER}`
  console.log("Sending WhatsApp:", { from, to, body })


  if (!client || !from) {
    console.log("[Twilio NO-OP] ->", { to, body })
    return { ok: true, sid: "noop" }
  }

  try {
    const msg = await client.messages.create({
      from,
      to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      body,
    })
    return { ok: true, sid: msg.sid }
  } catch (err: any) {
    console.error("Twilio send error:", err?.message || err)
    return { ok: false, error: err?.message || "unknown" }
  }
}
