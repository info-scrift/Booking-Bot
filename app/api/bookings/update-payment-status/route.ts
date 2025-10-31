import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendWhatsAppMessage } from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, paymentStatus } = body

    console.log("=== UPDATE BOOKING PAYMENT STATUS ===")
    console.log("Booking ID:", bookingId)
    console.log("Payment Status:", paymentStatus)

    // Validate required fields
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "Booking ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!paymentStatus) {
      return new Response(JSON.stringify({ error: "Payment status is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Validate payment status value
    const allowedStatuses = ["paid", "pending"]
    if (!allowedStatuses.includes(paymentStatus)) {
      return new Response(JSON.stringify({ error: `Payment status must be one of: ${allowedStatuses.join(", ")}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch the booking with profile information
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .eq("id", bookingId)
      .single()

    if (fetchError) {
      console.error("Error fetching booking:", fetchError)
      return new Response(JSON.stringify({ error: `Failed to fetch booking: ${fetchError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Found booking:", booking)

    // Update the booking payment status
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    }

    // Only update payment_confirmation_sent if status is paid
    if (paymentStatus === "paid") {
      updateData.payment_confirmation_sent = true
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating booking:", updateError)
      return new Response(JSON.stringify({ error: `Failed to update booking: ${updateError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Updated booking:", updatedBooking)

    // Send WhatsApp notification if payment is confirmed
    if (paymentStatus === "paid" && booking.profiles?.phone_number) {
      try {
        const invoiceUrl = `${APP_BASE_URL}/booking-invoice/${booking.id}?payment=paid&booking=confirmed`

        const messageLines = [
          "✅ PAYMENT CONFIRMED!",
          "",
          `Your payment of Rs. ${booking.booking_charges.toLocaleString()} has been received.`,
          "",
          `Booking Date: ${formatDate(booking.booking_date)}`,
          `Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`,
          "",
          `📄 View Paid Invoice: ${invoiceUrl}`,
          "",
          "Thank you for your payment!",
          "- Green Three",
        ]

        await sendWhatsAppMessage(booking.profiles.phone_number, messageLines.join("\n"))
        console.log("WhatsApp notification sent successfully")
      } catch (whatsappError) {
        console.error("Error sending WhatsApp notification:", whatsappError)
        // Don't fail the request if WhatsApp fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Booking payment status updated successfully",
        booking: updatedBooking,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}
