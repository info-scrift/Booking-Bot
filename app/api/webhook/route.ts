import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Simple in-memory state for testing
const userStates = new Map<string, { step: string; date?: string; slots?: any[] }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData()
    const from = body.get("From") as string
    const messageBody = body.get("Body") as string
    const profileName = body.get("ProfileName") as string

    const phoneNumber = from.replace("whatsapp:", "")

    console.log("WEBHOOK:", { phoneNumber, messageBody })

    const profile = await getOrCreateProfile(phoneNumber, profileName)

    const response = await processMessage(messageBody, profile, phoneNumber)

    console.log("RESPONSE:", response)

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response>
         <Message>${response}</Message>
       </Response>`,
      {
        headers: {
          "Content-Type": "text/xml",
        },
      },
    )
  } catch (error) {
    console.error("WEBHOOK ERROR:", error)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response>
         <Message>Error occurred. Please try again.</Message>
       </Response>`,
      {
        headers: {
          "Content-Type": "text/xml",
        },
      },
    )
  }
}

async function getOrCreateProfile(phoneNumber: string, profileName: string) {
  try {
    let { data: profile, error } = await supabase.from("profiles").select("*").eq("phone_number", phoneNumber).single()

    if (error && error.code === "PGRST116") {
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert([{ phone_number: phoneNumber, name: profileName || null }])
        .select()
        .single()

      if (createError) throw createError
      profile = newProfile
    } else if (error) {
      throw error
    }

    return profile
  } catch (error) {
    console.error("PROFILE ERROR:", error)
    throw error
  }
}

async function processMessage(message: string, profile: any, phoneNumber: string) {
  const trimmedMessage = message.trim()
  const userState = userStates.get(phoneNumber) || { step: "initial" }

  console.log("PROCESSING:", { message: trimmedMessage, step: userState.step })

  if (trimmedMessage.toLowerCase() === "back") {
    userStates.delete(phoneNumber)
    return "Enter the date you want to book (DD-MM-YYYY format):"
  }

  if (userState.step === "waiting_for_slot") {
    return await handleSlotSelection(trimmedMessage, profile, phoneNumber, userState)
  }

  if (isDateFormat(trimmedMessage)) {
    return await handleDateInput(trimmedMessage, profile, phoneNumber)
  }

  return `Hi ${profile.name || "there"}! 

Enter the date you want to book:
Format: DD-MM-YYYY (example: 25-10-2025)`
}

function isDateFormat(message: string) {
  return /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(message)
}

// function parseDate(dateString: string) {
//   try {
//     const cleanDate = dateString.replace(/[/.]/g, "-")
//     const [day, month, year] = cleanDate.split("-").map(Number)

//     if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2024) {
//       return null
//     }

//     const date = new Date(year, month - 1, day)
//     if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
//       return null
//     }

//     return date.toISOString().split("T")[0]
//   } catch (error) {
//     return null
//   }
// }

function parseDate(dateString: string) {
  try {
    const cleanDate = dateString.replace(/[/.]/g, "-")
    const [day, month, year] = cleanDate.split("-").map(Number)

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2024) {
      return null
    }

    const date = new Date(year, month - 1, day)

    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return null
    }

    // Return yyyy-mm-dd based on local date components, no ISO string
    const yyyy = date.getFullYear()
    const mm = (date.getMonth() + 1).toString().padStart(2, "0")
    const dd = date.getDate().toString().padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`

  } catch (error) {
    return null
  }
}


async function handleDateInput(dateString: string, profile: any, phoneNumber: string) {
  try {
    console.log("HANDLING DATE:", dateString)

    const parsedDate = parseDate(dateString)
    if (!parsedDate) {
      return "Invalid date format. Please use DD-MM-YYYY (example: 25-10-2025)"
    }

    // Check if past date
    const today = new Date().toISOString().split("T")[0]
    if (parsedDate < today) {
      return "Cannot book past dates. Please enter a future date:"
    }

    // Check if weekend
    const dayOfWeek = new Date(parsedDate + "T00:00:00").getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "Weekend booking not available. Please enter a weekday date (Monday-Friday):"
    }

    // Get settings
    const { data: settings, error: settingsError } = await supabase.from("booking_settings").select("*").single()

    if (settingsError) {
      console.error("SETTINGS ERROR:", settingsError)
      return "System error. Please try again later."
    }

    console.log("SETTINGS:", settings)

    // Get existing bookings for this specific date
    const { data: existingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("booking_date", parsedDate)
      .eq("status", "confirmed")

    if (bookingsError) {
      console.error("BOOKINGS ERROR:", bookingsError)
      return "Error checking availability. Please try again."
    }

    console.log("EXISTING BOOKINGS FOR", parsedDate, ":", existingBookings)

    // Generate time slots and check availability
    const slots = generateTimeSlots(settings, existingBookings || [])
    const availableSlots = slots.filter((slot) => slot.is_available)

    console.log("ALL SLOTS:", slots)
    console.log("AVAILABLE SLOTS:", availableSlots)

    if (availableSlots.length === 0) {
      return `${formatDate(parsedDate)} is fully booked. All time slots are taken. Please choose another date:`
    }

    // Store state
    userStates.set(phoneNumber, {
      step: "waiting_for_slot",
      date: parsedDate,
      slots: availableSlots,
    })

    // Build response
    let response = `Available slots for ${formatDate(parsedDate)}:\n\n`
    availableSlots.forEach((slot, index) => {
      response += `${index + 1}. ${slot.display}\n`
    })
    response += `\nReply with slot number (1-${availableSlots.length})`
    response += `\nType "back" to change date`

    return response
  } catch (error) {
    console.error("DATE INPUT ERROR:", error)
    return "Error processing date. Please try again:"
  }
}

async function handleSlotSelection(message: string, profile: any, phoneNumber: string, userState: any) {
  try {
    console.log("HANDLING SLOT SELECTION:", message)
    console.log("USER STATE:", userState)

    const slotNumber = Number.parseInt(message)

    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > userState.slots.length) {
      return `Invalid slot number. Please choose 1-${userState.slots.length} or type "back"`
    }

    const selectedSlot = userState.slots[slotNumber - 1]
    console.log("SELECTED SLOT:", selectedSlot)

    // Double-check if this exact date+time slot is still available
    const { data: conflictCheck, error: conflictError } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", userState.date)
      .eq("start_time", selectedSlot.start_time)
      .eq("end_time", selectedSlot.end_time)
      .eq("status", "confirmed")

    if (conflictError) {
      console.error("CONFLICT CHECK ERROR:", conflictError)
      return "Error checking availability. Please try again or type 'back'"
    }

    console.log("CONFLICT CHECK:", conflictCheck)

    if (conflictCheck && conflictCheck.length > 0) {
      return `❌ This time slot is already booked!

Someone else just booked ${selectedSlot.display} on ${formatDate(userState.date)}.

Please choose another slot or type "back" to change date.`
    }

    // Create booking with date AND time
    const bookingData = {
      profile_id: profile.id,
      booking_date: userState.date,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      status: "confirmed",
    }

    console.log("CREATING BOOKING:", bookingData)

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([bookingData])
      .select()
      .single()

    if (bookingError) {
      console.error("BOOKING ERROR:", bookingError)

      // Check if it's a unique constraint violation (duplicate booking)
      if (bookingError.code === "23505") {
        return `❌ This time slot is already booked!

${selectedSlot.display} on ${formatDate(userState.date)} was just taken by someone else.

Please choose another slot or type "back" to change date.`
      }

      return "Booking failed. Please try again or type 'back'"
    }

    console.log("BOOKING CREATED:", booking)

    // Clear state
    userStates.delete(phoneNumber)

    return `✅ BOOKING CONFIRMED!

📅 Date: ${formatDate(userState.date)}
🕐 Time: ${selectedSlot.display}
👤 Name: ${profile.name || "N/A"}
📱 Phone: ${profile.phone_number}

Your session is booked for ${formatDate(userState.date)} at ${selectedSlot.display}.

Thank you!`
  } catch (error) {
    console.error("SLOT SELECTION ERROR:", error)
    return "Error processing selection. Type 'back' to start over."
  }
}

function generateTimeSlots(settings: any, existingBookings: any[]) {
  const slots = []
  const startHour = Number.parseInt(settings.start_time.split(":")[0])
  const endHour = Number.parseInt(settings.end_time.split(":")[0])
  const durationHours = Math.floor(settings.slot_duration_minutes / 60)

  console.log("GENERATING SLOTS:", { startHour, endHour, durationHours })

  for (let hour = startHour; hour < endHour; hour += durationHours) {
    const nextHour = hour + durationHours
    if (nextHour > endHour) break

    const startTime = `${hour.toString().padStart(2, "0")}:00:00`
    const endTime = `${nextHour.toString().padStart(2, "0")}:00:00`

    // Check if this exact time slot is already booked
    const isBooked = existingBookings.some(
      (booking) => booking.start_time === startTime && booking.end_time === endTime,
    )

    console.log("SLOT CHECK:", { startTime, endTime, isBooked })

    slots.push({
      start_time: startTime,
      end_time: endTime,
      is_available: !isBooked,
      display: `${formatTimeDisplay(hour)} - ${formatTimeDisplay(nextHour)}`,
    })
  }

  console.log("GENERATED SLOTS:", slots)
  return slots
}

function formatTimeDisplay(hour: number) {
  if (hour === 0) return "12:00 AM"
  if (hour < 12) return `${hour}:00 AM`
  if (hour === 12) return "12:00 PM"
  return `${hour - 12}:00 PM`
}

function formatDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

