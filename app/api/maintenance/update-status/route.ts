import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendWhatsAppMessage } from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const paymentId = body?.paymentId as string | undefined
    const isPaid = body?.isPaid as boolean | undefined

    if (!paymentId || typeof isPaid !== "boolean") {
      return new Response(JSON.stringify({ error: "Invalid request payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { data: payment, error: fetchError } = await supabase
      .from("maintenance_payments")
      .select(
        `
        *,
        profiles:profiles!maintenance_payments_profile_id_fkey (
          id,
          name,
          phone_number,
          apartment_number
        )
      `,
      )
      .eq("id", paymentId)
      .single()

    if (fetchError || !payment) {
      return new Response(JSON.stringify({ error: "Payment record not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const updates: Record<string, unknown> = {
      status: isPaid ? "paid" : "unpaid",
      updated_at: new Date().toISOString(),
    }

    if (isPaid) {
      updates.paid_date = new Date().toISOString().split("T")[0]
      updates.confirmation_sent = true
      updates.confirmation_sent_at = new Date().toISOString()
    } else {
      updates.paid_date = null
      updates.confirmation_sent = false
      updates.confirmation_sent_at = null
    }

    const { error: updateError } = await supabase.from("maintenance_payments").update(updates).eq("id", paymentId)

    if (updateError) {
      throw updateError
    }

    if (isPaid && payment.profiles?.phone_number) {
      const amount = Number(payment.amount ?? 0).toLocaleString("en-PK")
      const month = new Date(payment.year, payment.month - 1, 1).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
      const invoiceLink = `${APP_BASE_URL}/maintenance-invoice/${payment.id}?snapshot=paid`

      const message = [
        `Hello ${payment.profiles.name || "Resident"},`,
        `Your maintenance payment for ${month} (Rs. ${amount}) has been received and confirmed.`,
        `Thank you for keeping your dues current.`,
        `Invoice: ${invoiceLink}`,
        "- Green Three",
      ].join("\n")

      try {
        await sendWhatsAppMessage(payment.profiles.phone_number, message)
      } catch (notifyError) {
        console.error("Failed to send maintenance payment notification:", notifyError)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Maintenance status update error:", error)
    return new Response(JSON.stringify({ error: "Unable to update maintenance status" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

