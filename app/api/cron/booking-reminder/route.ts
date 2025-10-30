import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendWhatsAppMessage } from "@/lib/twilio"

const CRON_KEY = process.env.CRON_SECRET
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00")
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`
}

function daysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - created.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-cron-key")
  if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })

  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles:profiles!bookings_profile_id_fkey ( id, name, phone_number )
      `,
      )
      .eq("status", "confirmed")
      .eq("payment_status", "pending")
      .limit(1000)

    if (!bookings || bookings.length === 0) {
      return new Response("No booking reminders to send", { status: 200 })
    }

    for (const b of bookings as any[]) {
      if (!b.created_at) continue

      const daysSince = daysSinceCreation(b.created_at)
      const invoiceLink = `${APP_BASE_URL}/booking-invoice/${b.id}?payment=pending&booking=confirmed`

      // Day 0 (same day as creation): Don't send reminder
      // if (daysSince === 0) {
      //   continue
      // }

      // Day 3+: Cancel the booking
      if (daysSince >= 3) {
        await supabase
          .from("bookings")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", b.id)

        const cancelLines = [
          `Your booking on ${fmtDate(b.booking_date)} (${fmtTime(b.start_time)} - ${fmtTime(b.end_time)}) has been cancelled due to non-payment within 3 days of booking.`,
          `Invoice: ${invoiceLink}`,
          "- Green Three",
        ]
        if (b.profiles?.phone_number) {
          await sendWhatsAppMessage(b.profiles.phone_number, cancelLines.join("\n"))
        }
        continue
      }

      // Day 1 or Day 2: Send reminder
      const today = new Date().toISOString().slice(0, 10)
      const sentToday = b.reminder_last_sent_at && b.reminder_last_sent_at.slice(0, 10) === today
      if (sentToday) continue

      const reminderLines = [
        `Reminder: Please pay Rs. ${Number(b.booking_charges).toLocaleString()} for your booking on ${fmtDate(
          b.booking_date,
        )} (${fmtTime(b.start_time)} - ${fmtTime(b.end_time)}).`,
        `Payment is due within 3 days of booking. Day ${daysSince} of 3.`,
        `Invoice: ${invoiceLink}`,
        "- Green Three",
      ]
      if (b.profiles?.phone_number) {
        await sendWhatsAppMessage(b.profiles.phone_number, reminderLines.join("\n"))
      }

      await supabase
        .from("bookings")
        .update({ reminder_last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", b.id)
    }

    return new Response("Booking reminders processed", { status: 200 })
  } catch (e) {
    console.error("booking-reminder error:", e)
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

// function fmtDate(d: string) {
//   const dt = new Date(d + "T00:00:00")
//   return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
// }
// function fmtTime(t: string) {
//   const [h, m] = t.split(":").map(Number)
//   const ampm = h >= 12 ? "PM" : "AM"
//   const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
//   return `${hh}:${String(m).padStart(2, "0")} ${ampm}`
// }
// function addDaysISOString(iso: string, days: number) {
//   const d = new Date(iso)
//   d.setDate(d.getDate() + days)
//   return d.toISOString()
// }
// function todayStr() {
//   const d = new Date()
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
// }

// export async function POST(request: NextRequest) {
//   const provided = request.headers.get("x-cron-key")
//   if (CRON_KEY && provided !== CRON_KEY) return new Response("Unauthorized", { status: 401 })

//   try {
//     const { data: bookings } = await supabase
//       .from("bookings")
//       .select(
//         `
//         *,
//         profiles:profiles!bookings_profile_id_fkey ( id, name, phone_number )
//       `,
//       )
//       .eq("status", "confirmed")
//       .eq("payment_status", "pending")
//       .limit(1000)

//     if (!bookings || bookings.length === 0) {
//       return new Response("No booking reminders to send", { status: 200 })
//     }

//     const today = todayStr()

//     for (const b of bookings as any[]) {
//       if (!b.created_at) continue
//       const invoiceLink = `${APP_BASE_URL}/booking-invoice/${b.id}?payment=pending&booking=confirmed`
//       const due = addDaysISOString(b.created_at, 3).slice(0, 10)

//       if (today > due) {
//         await supabase
//           .from("bookings")
//           .update({ status: "cancelled", updated_at: new Date().toISOString() })
//           .eq("id", b.id)

//         const cancelLines = [
//           `Your booking on ${fmtDate(b.booking_date)} (${fmtTime(b.start_time)} - ${fmtTime(b.end_time)}) has been cancelled due to non-payment within 3 days of booking.`,
//           `Invoice: ${invoiceLink}`,
//           "- Green Three",
//         ]
//         if (b.profiles?.phone_number) await sendWhatsAppMessage(b.profiles.phone_number, cancelLines.join("\n"))
//         continue
//       }

//       const sentToday = b.reminder_last_sent_at && b.reminder_last_sent_at.slice(0, 10) === today
//       if (sentToday) continue

//       const reminderLines = [
//         `Reminder: Please pay Rs. ${Number(b.booking_charges).toLocaleString()} for your booking on ${fmtDate(
//           b.booking_date,
//         )} (${fmtTime(b.start_time)} - ${fmtTime(b.end_time)}).`,
//         "Payment is due within 3 days of booking.",
//         `Invoice: ${invoiceLink}`,
//         "- Green Three",
//       ]
//       if (b.profiles?.phone_number) await sendWhatsAppMessage(b.profiles.phone_number, reminderLines.join("\n"))

//       await supabase
//         .from("bookings")
//         .update({ reminder_last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
//         .eq("id", b.id)
//     }

//     return new Response("Booking reminders processed", { status: 200 })
//   } catch (e) {
//     console.error("booking-reminder error:", e)
//     return new Response("Error", { status: 500 })
//   }
// }

// export async function GET() {
//   return new Response("Use POST", { status: 200 })
// }
