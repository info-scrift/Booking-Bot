import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendWhatsAppMessage } from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-cron-key")
  if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })
  try {
    const { data: rows } = await supabase
      .from("bookings")
      .select("*, profiles:profiles!bookings_profile_id_fkey (name, phone_number)")
      .eq("status", "confirmed")
      .eq("payment_status", "paid")
      .eq("payment_confirmation_sent", false)
      .limit(1000)

    if (!rows || rows.length === 0) return new Response("No booking confirmations to send", { status: 200 })

    for (const row of rows as any[]) {
      // Add snapshot parameters to preserve paid state
      const invoiceLink = `${APP_BASE_URL}/booking-invoice/${row.id}?payment=paid&booking=confirmed`
      const messageLines = [
        `Thank you ${row.profiles?.name || "Resident"}! Your booking payment of Rs. ${Number(
          row.booking_charges,
        ).toLocaleString()} has been received. ✅`,
        `Invoice: ${invoiceLink}`,
        "- Green Three",
      ]
      if (row.profiles?.phone_number) await sendWhatsAppMessage(row.profiles.phone_number, messageLines.join("\n"))

      await supabase
        .from("bookings")
        .update({ payment_confirmation_sent: true, updated_at: new Date().toISOString() })
        .eq("id", row.id)
    }

    return new Response("Booking confirmations sent", { status: 200 })
  } catch (e) {
    console.error("booking-confirmation error:", e)
    return new Response("Error", { status: 500 })
  }
}

export async function GET() {
  return new Response("Use POST", { status: 200 })
}


// import type { NextRequest } from "next/server"
// import { supabase } from "@/lib/supabase"
// import { sendWhatsAppMessage } from "@/lib/twilio"

// const CRON_KEY = process.env.CRON_SECRET
// const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

// export async function POST(request: NextRequest) {
//   const provided = request.headers.get("x-cron-key")
//   if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })
//   try {
//     const { data: rows } = await supabase
//       .from("bookings")
//       .select("*, profiles:profiles!bookings_profile_id_fkey (name, phone_number)")
//       .eq("status", "confirmed")
//       .eq("payment_status", "paid")
//       .eq("payment_confirmation_sent", false)
//       .limit(1000)

//     if (!rows || rows.length === 0) return new Response("No booking confirmations to send", { status: 200 })

//     for (const row of rows as any[]) {
//       const invoiceLink = `${APP_BASE_URL}/booking-invoice/${row.id}`
//       const messageLines = [
//         `Thank you ${row.profiles?.name || "Resident"}! Your booking payment of Rs. ${Number(
//           row.booking_charges,
//         ).toLocaleString()} has been received. ✅`,
//         `Invoice: ${invoiceLink}`,
//         "- Green Three",
//       ]
//       if (row.profiles?.phone_number) await sendWhatsAppMessage(row.profiles.phone_number, messageLines.join("\n"))

//       await supabase
//         .from("bookings")
//         .update({ payment_confirmation_sent: true, updated_at: new Date().toISOString() })
//         .eq("id", row.id)
//     }

//     return new Response("Booking confirmations sent", { status: 200 })
//   } catch (e) {
//     console.error("booking-confirmation error:", e)
//     return new Response("Error", { status: 500 })
//   }
// }

// export async function GET() {
//   return new Response("Use POST", { status: 200 })
// }
