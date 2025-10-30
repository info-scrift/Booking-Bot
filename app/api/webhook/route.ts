
// import type { NextRequest } from "next/server"
// import { supabase } from "@/lib/supabase"
// import { isDateFormat, parseDate, isWorkingDay, getDayName } from "@/lib/dateUtils"

// // Enhanced user state for both booking and complaints
// const userStates = new Map<
//   string,
//   {
//     step: string
//     type?: "booking" | "complaint" | "cancel" | "status"
//     date?: string
//     slots?: any[]
//     complaint?: {
//       category?: string
//       subcategory?: string
//       description?: string
//     }
//     cancelItems?: any[]
//     statusItems?: any[]
//   }
// >()

// export async function POST(request: NextRequest) {
//   try {
//     console.log("=== WEBHOOK CALLED ===")

//     const body = await request.formData()
//     const from = body.get("From") as string
//     const messageBody = body.get("Body") as string
//     const profileName = body.get("ProfileName") as string

//     const phoneNumber = from.replace("whatsapp:", "")
//     console.log("From:", from)
//     console.log("Body:", messageBody)

//     // Check if user is registered and active
//     const profile = await getProfile(phoneNumber)
//     if (!profile) {
//       return new Response(
//         `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You are not a registered user. Please contact the admin to register your number.</Message></Response>`,
//         {
//           status: 200,
//           headers: {
//             "Content-Type": "text/xml; charset=utf-8",
//           },
//         },
//       )
//     }

//     if (!profile.is_active) {
//       return new Response(
//         `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Your account is inactive. Please contact the admin.</Message></Response>`,
//         {
//           status: 200,
//           headers: {
//             "Content-Type": "text/xml; charset=utf-8",
//           },
//         },
//       )
//     }

//     // Process message
//     const response = await processMessage(messageBody, profile, phoneNumber)
//     console.log("Sending response:", response)

//     // Clean the response text
//     const cleanResponse = response
//       .replace(/[^\x20-\x7E\n\r]/g, "")
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/"/g, "&quot;")
//       .replace(/'/g, "&apos;")
//       .trim()

//     const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${cleanResponse}</Message></Response>`

//     console.log("TwiML:", twimlResponse)

//     return new Response(twimlResponse, {
//       status: 200,
//       headers: {
//         "Content-Type": "text/xml; charset=utf-8",
//       },
//     })
//   } catch (error) {
//     console.error("Error:", error)
//     const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error occurred. Please try again.</Message></Response>`
//     return new Response(errorTwiml, {
//       status: 200,
//       headers: {
//         "Content-Type": "text/xml; charset=utf-8",
//       },
//     })
//   }
// }

// export async function GET() {
//   console.log("GET request to webhook")
//   return new Response("Webhook endpoint is working", { status: 200 })
// }

// async function getProfile(phoneNumber: string) {
//   try {
//     console.log("Getting profile for:", phoneNumber)

//     const { data: profile, error } = await supabase
//       .from("profiles")
//       .select("*")
//       .eq("phone_number", phoneNumber)
//       .single()

//     if (error && error.code === "PGRST116") {
//       console.log("Profile not found")
//       return null
//     } else if (error) {
//       console.error("Profile fetch error:", error)
//       return null
//     }

//     console.log("Profile:", profile)
//     return profile
//   } catch (error) {
//     console.error("Profile error:", error)
//     return null
//   }
// }

// async function processMessage(message: string, profile: any, phoneNumber: string) {
//   try {
//     const trimmedMessage = message.trim()

//     const userState = userStates.get(phoneNumber) || { step: "initial" }
//         console.log('userstate is ')
//     console.log(userState)

//     // console.log("Processing:", { message: trimmedMessage, step: userState.step })

//     // Handle back command
//     if (trimmedMessage.toLowerCase() === "back") {
//       return handleBackCommand(phoneNumber, userState, profile)
//     }

//     // Handle menu command
//     if (trimmedMessage.toLowerCase() === "menu") {
//       userStates.delete(phoneNumber)
//       return getMainMenu(profile.name)
//     }

//     // Handle main menu selection
//     if (userState.step === "initial") {
//             console.log('initial main menue called')
//       userState.step = "main_menu"
//       userStates.set(phoneNumber, userState)
//       return getMainMenu(profile.name)
//     }

//     // Handle main menu selection
//     if (userState.step === "main_menu") {
//       console.log('main menue called but not initial')
//       return await handleMainMenu(trimmedMessage, profile, phoneNumber)
//     }

//     // Handle complaint flow
//     if (userState.type === "complaint") {
//       return await handleComplaintFlow(trimmedMessage, profile, phoneNumber, userState)
//     }

//     // Handle booking flow
//     if (userState.type === "booking") {
//       return await handleBookingFlow(trimmedMessage, profile, phoneNumber, userState)
//     }

//     // Handle cancel flow
//     if (userState.type === "cancel") {
//       return await handleCancelFlow(trimmedMessage, profile, phoneNumber, userState)
//     }

//     // Handle status flow
//     if (userState.type === "status") {
//       return await handleStatusFlow(trimmedMessage, profile, phoneNumber, userState)
//     }

//     // Default welcome
//     return getMainMenu(profile.name)
//   } catch (error) {
//     console.error("Process message error:", error)
//     return "Error processing your message. Please try again.\n\nType 'menu' to return to main menu"
//   }
// }


// function handleBackCommand(phoneNumber: string, userState: any, profile: any) {
//   // Go back to previous menu based on current step
//   if (userState.step === "complaint_subcategory") {
//     userState.step = "complaint_category"
//     userStates.set(phoneNumber, userState)
//     return `Please enter the corresponding number to the nature of your complaint:

// 1. Apartment Resident Complaint
// 2. Building Complaint

// Reply with 1 or 2 or type "menu" to return to main menu`
//   } else if (userState.step === "complaint_description") {
//     userState.step = "complaint_subcategory"
//     userStates.set(phoneNumber, userState)
//     return `Please enter the corresponding number to the nature of your complaint:

// 1. Plumbing
// 2. Electric
// 3. Civil
// 4. Other

// Reply with the number (1-4) or type "back" to go to previous menu`
//   } else if (userState.step === "waiting_for_slot") {
//     userState.step = "booking_date"
//     userState.date = undefined
//     userState.slots = undefined
//     userStates.set(phoneNumber, userState)
//     return "Enter the date you want to book (DD-MM-YYYY format). Example: 25-10-2025\n\nType 'menu' to return to main menu"
//   } else if (userState.step === "cancel_selection") {
//     userState.step = "cancel_list"
//     userStates.set(phoneNumber, userState)
//     return userState.cancelItems ? displayCancelOptions(userState.cancelItems) : "No items to cancel."
//   } else if (userState.step === "status_selection") {
//     userState.step = "status_list"
//     userStates.set(phoneNumber, userState)
//     return userState.statusItems ? displayStatusOptions(userState.statusItems) : "No items to check."
//   } else {
//     userStates.delete(phoneNumber)
//     return getMainMenu(profile.name)
//   }
// }

// function getMainMenu(name: string) {
//   return `Hi ${name}! Welcome to Community Management System.

// Please select an option:
// 1. Register Complaint
// 2. Book Community Hall
// 3. Check Booking/Complaint Status
// 4. Cancel Booking/Complaint
// 5. View My Profile
// 6. Check Maintenance Status

// Reply with the number (1-6)`
// }

// function getProfileInfo(profile: any) {
//   return `Your Profile Information:

// Name: ${profile.name}
// Phone: ${profile.phone_number}
// Apartment: ${profile.apartment_number}
// ${profile.building_block ? `Building: ${profile.building_block}` : ""}
// ${profile.cnic ? `CNIC: ${profile.cnic}` : ""}

// Type 'menu' to return to main menu`
// }

// function getMaintenanceStatus(profile: any) {
//   const status = profile.maintenance_paid ? "PAID" : "UNPAID"
//   const statusEmoji = profile.maintenance_paid ? "✅" : "❌"

//   let response = `Maintenance Status ${statusEmoji}

// Monthly Charges: Rs. ${profile.maintenance_charges}
// Status: ${status}`

//   if (profile.last_payment_date) {
//     response += `\nLast Payment: ${formatDate(profile.last_payment_date)}`
//   }

//   if (!profile.maintenance_paid) {
//     response += `\n\n⚠️ Please pay your maintenance charges to avoid service disruption.`
//   }

//   response += `\n\nType 'menu' to return to main menu`

//   return response
// }

// async function handleComplaintFlow(message: string, profile: any, phoneNumber: string, userState: any) {
//   const choice = message.trim()

//   switch (userState.step) {
//     case "complaint_category":
//       if (choice === "1") {
//         userState.complaint.category = "apartment"
//         userState.step = "complaint_subcategory"
//         userStates.set(phoneNumber, userState)
//         return `Please enter the corresponding number to the nature of your complaint:

// 1. Plumbing
// 2. Electric
// 3. Civil
// 4. Other

// Reply with the number (1-4) or type "back" to go to previous menu`
//       } else if (choice === "2") {
//         userState.complaint.category = "building"
//         userState.step = "complaint_subcategory"
//         userStates.set(phoneNumber, userState)
//         return `Please enter the corresponding number to the nature of your complaint:

// 1. Plumbing
// 2. Electric
// 3. Civil
// 4. Other

// Reply with the number (1-4) or type "back" to go to previous menu`
//       } else {
//         return "Invalid option. Please reply with 1 for Apartment or 2 for Building complaint.\n\nType 'back' to go to previous menu or 'menu' for main menu"
//       }

//     case "complaint_subcategory":
//       const subcategories = ["plumbing", "electric", "civil", "other"]
//       const subcategoryNames = ["Plumbing", "Electric", "Civil", "Other"]

//       const choiceNum = Number.parseInt(choice)
//       if (choiceNum >= 1 && choiceNum <= 4) {
//         userState.complaint.subcategory = subcategories[choiceNum - 1]

//         if (choiceNum === 4) {
//           // Other
//           userState.step = "complaint_description"
//           userStates.set(phoneNumber, userState)
//           return "Please write a short paragraph explaining your complaint:\n\nType 'back' to go to previous menu"
//         } else {
//           // Create complaint directly for predefined categories
//           return await createComplaint(profile, userState, phoneNumber)
//         }
//       } else {
//         return "Invalid option. Please reply with a number from 1-4.\n\nType 'back' to go to previous menu"
//       }

//     case "complaint_description":
//       userState.complaint.description = message
//       return await createComplaint(profile, userState, phoneNumber)

//     default:
//       return "Something went wrong. Type 'menu' to return to main menu."
//   }
// }

// async function createComplaint(profile: any, userState: any, phoneNumber: string) {
//   try {
//     // Generate group key for similar complaints
//     const groupKey = `${userState.complaint.category}_${userState.complaint.subcategory}`

//     // Generate complaint ID
//     const { data: complaintData, error } = await supabase
//       .from("complaints")
//       .insert([
//         {
//           complaint_id: await generateComplaintId(),
//           profile_id: profile.id,
//           category: userState.complaint.category,
//           subcategory: userState.complaint.subcategory,
//           description: userState.complaint.description || null,
//           group_key: groupKey,
//           status: "pending",
//         },
//       ])
//       .select()
//       .single()

//     if (error) {
//       console.error("Complaint creation error:", error)
//       return "Error creating complaint. Please try again.\n\nType 'menu' to return to main menu"
//     }

//     // Clear state
//     userStates.delete(phoneNumber)

//     const categoryText = userState.complaint.category === "apartment" ? "apartment" : "building"
//     const subcategoryText =
//       userState.complaint.subcategory.charAt(0).toUpperCase() + userState.complaint.subcategory.slice(1)

//     if (userState.complaint.subcategory === "other") {
//       return `Thank you, we have delivered your complaint to the respective department.

// Complaint ID: ${complaintData.complaint_id}
// Category: ${categoryText} - ${subcategoryText}

// We will resolve it shortly. Thank you for your patience.

// Type 'menu' to return to main menu`
//     } else {
//       return `Your registered complaint is regarding a ${subcategoryText} issue in your ${categoryText}.

// Complaint ID: ${complaintData.complaint_id}

// Our staff will resolve your complaint shortly.

// Type 'menu' to return to main menu`
//     }
//   } catch (error) {
//     console.error("Create complaint error:", error)
//     return "Error creating complaint. Please try again.\n\nType 'menu' to return to main menu"
//   }
// }

// async function generateComplaintId() {
//   // Simple complaint ID generation
//   const timestamp = Date.now().toString().slice(-6)
//   return `CMP${timestamp}`
// }

// async function handleBookingFlow(message: string, profile: any, phoneNumber: string, userState: any) {
//   // Handle slot selection
//   if (userState.step === "waiting_for_slot") {
//     return await handleSlotSelection(message, profile, phoneNumber, userState)
//   }

//   // Handle date input
//   if (isDateFormat(message)) {
//     return await handleDateInput(message, profile, phoneNumber)
//   }

//   return "Please enter a valid date in DD-MM-YYYY format or type 'back' to return to previous menu or 'menu' for main menu."
// }

// async function handleSlotSelection(message: string, profile: any, phoneNumber: string, userState: any) {
//   try {
//     const slotNumber = Number.parseInt(message)

//     if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > userState.slots.length) {
//       return `Invalid number. Please choose 1-${userState.slots.length} or type "back" to select another date`
//     }

//     const selectedSlot = userState.slots[slotNumber - 1]

//     // Double-check availability before booking
//     const { data: conflictCheck } = await supabase
//       .from("bookings")
//       .select("id")
//       .eq("booking_date", userState.date)
//       .eq("start_time", selectedSlot.start_time)
//       .eq("end_time", selectedSlot.end_time)
//       .eq("status", "confirmed")

//     if (conflictCheck && conflictCheck.length > 0) {
//       return `This slot is already booked. Please choose another slot or type "back" to select another date`
//     }

//     // Calculate payment due date (3 days from booking)
//     const paymentDueDate = new Date()
//     paymentDueDate.setDate(paymentDueDate.getDate() + 3)

//     const { data: booking, error: bookingError } = await supabase
//       .from("bookings")
//       .insert([
//         {
//           profile_id: profile.id,
//           booking_date: userState.date,
//           start_time: selectedSlot.start_time,
//           end_time: selectedSlot.end_time,
//           status: "confirmed",
//           booking_charges: 500, // Default hall booking charge
//           payment_status: "pending",
//           payment_due_date: paymentDueDate.toISOString().split("T")[0],
//         },
//       ])
//       .select()
//       .single()

//     if (bookingError) {
//       console.error("Booking error:", bookingError)
//       if (bookingError.code === "23505") {
//         return "This slot was just taken. Please choose another slot or type 'back'"
//       }
//       return "Booking failed. Please try again or type 'back'"
//     }

//     userStates.delete(phoneNumber)

//     return `BOOKING CONFIRMED! ✅

// Date: ${formatDate(userState.date)}
// Time: ${selectedSlot.display}
// Name: ${profile.name}
// Apartment: ${profile.apartment_number}

// 💰 PAYMENT REQUIRED:
// Amount: Rs. 500
// Due Date: ${formatDate(paymentDueDate.toISOString().split("T")[0])}

// ⚠️ Please pay the admin within 3 days or your booking will be cancelled.

// Type 'menu' to return to main menu`
//   } catch (error) {
//     console.error("Slot selection error:", error)
//     return "Error processing selection. Type 'menu' to return to main menu."
//   }
// }

// async function handleDateInput(message: string, profile: any, phoneNumber: string) {
//   try {
//     const parsedDate = parseDate(message)
//     if (!parsedDate) {
//       return "Invalid date format. Please enter a date in DD-MM-YYYY format.\n\nType 'back' to return to previous menu or 'menu' for main menu"
//     }

//     // Check if the date is in the past
//     const today = new Date()
//     const inputDate = new Date(parsedDate + "T00:00:00")
//     const todayString =
//       today.getFullYear() +
//       "-" +
//       String(today.getMonth() + 1).padStart(2, "0") +
//       "-" +
//       String(today.getDate()).padStart(2, "0")

//     if (parsedDate < todayString) {
//       return `Cannot book for past dates. Please select a future date.\n\nType 'back' to return to previous menu or 'menu' for main menu`
//     }

//     // Get booking settings to check working days
//     const { data: settings } = await supabase.from("booking_settings").select("working_days").single()

//     if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
//       const dayName = getDayName(parsedDate)
//       return `Sorry, bookings are not available on ${dayName}s.\n\nPlease select a date from our working days and try again.\n\nType 'back' to return to previous menu or 'menu' for main menu`
//     }

//     // Get existing confirmed bookings for this date
//     const { data: existingBookings } = await supabase
//       .from("bookings")
//       .select("*")
//       .eq("booking_date", parsedDate)
//       .eq("status", "confirmed")

//     const bookingSettings = {
//       start_time: "09:00",
//       end_time: "18:00",
//       slot_duration_minutes: 60,
//     }

//     const slots = generateTimeSlots(bookingSettings, existingBookings || [])

//     if (slots.length === 0) {
//       return `No available slots on ${formatDate(parsedDate)}. All slots are booked.\n\nType 'back' to return to previous menu or 'menu' for main menu`
//     }

//     const userState = userStates.get(phoneNumber) || { step: "initial" }
//     userState.step = "waiting_for_slot"
//     userState.date = parsedDate
//     userState.slots = slots
//     userStates.set(phoneNumber, userState)

//     let response = `Available slots on ${formatDate(parsedDate)} (${getDayName(parsedDate)}):\n\n`

//     slots.forEach((slot, index) => {
//       response += `${index + 1}. ${slot.display}\n`
//     })

//     response +=
//       "\nPlease select a slot number to book.\n\nType 'back' to return to previous menu or 'menu' for main menu"

//     return response
//   } catch (error) {
//     console.error("Date input error:", error)
//     return "Error processing date input. Type 'menu' to return to main menu."
//   }
// }

// async function handleMainMenu(message: string, profile: any, phoneNumber: string) {
//   const choice = message.trim()

//   switch (choice) {
//     case "1":
//       userStates.set(phoneNumber, { step: "complaint_category", type: "complaint", complaint: {} })
//       return `Please enter the corresponding number to the nature of your complaint:

// 1. Apartment Resident Complaint
// 2. Building Complaint

// Reply with 1 or 2 or type "menu" to return to main menu`

//     case "2":
//       userStates.set(phoneNumber, { step: "booking_date", type: "booking" })
//       return "Enter the date you want to book (DD-MM-YYYY format). Example: 25-10-2025\n\nType 'menu' to return to main menu"

//     case "3":
//       return await initializeStatusCheck(profile, phoneNumber)

//     case "4":
//       return await initializeCancelFlow(profile, phoneNumber)

//     case "5":
//       return getProfileInfo(profile)

//     case "6":
//       return getMaintenanceStatus(profile)

//     default:
//       return `Invalid option. Please select:

// 1. Register Complaint
// 2. Book Community Hall
// 3. Check Status
// 4. Cancel Booking/Complaint
// 5. View My Profile
// 6. Check Maintenance Status

// Reply with the number (1-6)`
//   }
// }

// async function initializeStatusCheck(profile: any, phoneNumber: string) {
//   try {
//     // Get recent bookings and complaints
//     const { data: bookings } = await supabase
//       .from("bookings")
//       .select("*")
//       .eq("profile_id", profile.id)
//       .in("status", ["confirmed", "payment_pending"])
//       .order("created_at", { ascending: false })
//       .limit(10)

//     const { data: complaints } = await supabase
//       .from("complaints")
//       .select("*")
//       .eq("profile_id", profile.id)
//       .neq("status", "cancelled")
//       .order("created_at", { ascending: false })
//       .limit(10)

//     const allItems:any = []

//     if (complaints && complaints.length > 0) {
//       complaints.forEach((complaint) => {
//         allItems.push({
//           type: "complaint",
//           id: complaint.complaint_id,
//           display: `${complaint.complaint_id} - ${complaint.status.toUpperCase()}`,
//           data: complaint,
//         })
//       })
//     }

//     if (bookings && bookings.length > 0) {
//       bookings.forEach((booking) => {
//         const paymentStatus = booking.payment_status === "paid" ? "✅" : "💰"
//         allItems.push({
//           type: "booking",
//           id: booking.booking_date,
//           display: `${formatDate(booking.booking_date)} - ${booking.status.toUpperCase()} ${paymentStatus}`,
//           data: booking,
//         })
//       })
//     }

//     if (allItems.length === 0) {
//       return "You have no recent bookings or complaints.\n\nType 'menu' to return to main menu"
//     }

//     userStates.set(phoneNumber, {
//       step: "status_list",
//       type: "status",
//       statusItems: allItems,
//     })

//     return displayStatusOptions(allItems)
//   } catch (error) {
//     console.error("Status check error:", error)
//     return "Error checking status. Please try again.\n\nType 'menu' to return to main menu"
//   }
// }

// function displayStatusOptions(items: any[]) {
//   let response = "Your Recent Items:\n\n"

//   const complaints = items.filter((item) => item.type === "complaint")
//   const bookings = items.filter((item) => item.type === "booking")

//   if (complaints.length > 0) {
//     response += "COMPLAINTS:\n"
//     complaints.forEach((item, index) => {
//       response += `${index + 1}. ${item.display}\n`
//     })
//     response += "\n"
//   }

//   if (bookings.length > 0) {
//     response += "BOOKINGS:\n"
//     const startIndex = complaints.length
//     bookings.forEach((item, index) => {
//       response += `${startIndex + index + 1}. ${item.display}\n`
//     })
//     response += "\n"
//   }

//   response += "Select a number to view details or type 'menu' to return to main menu"

//   return response
// }

// async function handleStatusFlow(message: string, profile: any, phoneNumber: string, userState: any) {
//   const choice = Number.parseInt(message.trim())

//   if (userState.step === "status_list") {
//     if (isNaN(choice) || choice < 1 || choice > userState.statusItems.length) {
//       return `Invalid selection. Please choose 1-${userState.statusItems.length} or type 'menu' for main menu`
//     }

//     const selectedItem = userState.statusItems[choice - 1]

//     if (selectedItem.type === "complaint") {
//       const complaint = selectedItem.data
//       let response = `Complaint Details: ${complaint.complaint_id}

// Category: ${complaint.category} - ${complaint.subcategory}
// Status: ${complaint.status.toUpperCase()}
// Created: ${formatDateTime(complaint.created_at)}`

//       if (complaint.description) {
//         response += `\n\nDescription:\n${complaint.description}`
//       }

//       response += `\n\nType 'menu' to return to main menu`
//       userStates.delete(phoneNumber)
//       return response
//     } else if (selectedItem.type === "booking") {
//       const booking = selectedItem.data
//       const paymentStatus = booking.payment_status === "paid" ? "PAID ✅" : "PENDING 💰"
//       let response = `Booking Details: ${formatDate(booking.booking_date)}

// Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}
// Status: ${booking.status.toUpperCase()}
// Payment: ${paymentStatus}
// Amount: Rs. ${booking.booking_charges}`

//       if (booking.payment_due_date && booking.payment_status === "pending") {
//         response += `\nPayment Due: ${formatDate(booking.payment_due_date)}`
//       }

//       response += `\nCreated: ${formatDateTime(booking.created_at)}`
//       response += `\n\nType 'menu' to return to main menu`
//       userStates.delete(phoneNumber)
//       return response
//     }
//   }

//   return "Invalid selection. Type 'menu' to return to main menu"
// }

// async function initializeCancelFlow(profile: any, phoneNumber: string) {
//   try {
//     // Get active bookings and complaints
//     const { data: bookings } = await supabase
//       .from("bookings")
//       .select("*")
//       .eq("profile_id", profile.id)
//       .eq("status", "confirmed")
//       .gte("booking_date", new Date().toISOString().split("T")[0])
//       .order("booking_date", { ascending: true })

//     const { data: complaints } = await supabase
//       .from("complaints")
//       .select("*")
//       .eq("profile_id", profile.id)
//       .in("status", ["pending", "in-progress"])
//       .order("created_at", { ascending: false })

//     const allItems = []

//     if (complaints && complaints.length > 0) {
//       complaints.forEach((complaint) => {
//         allItems.push({
//           type: "complaint",
//           id: complaint.id,
//           display: `${complaint.complaint_id} - ${complaint.subcategory}`,
//           data: complaint,
//         })
//       })
//     }

//     if (bookings && bookings.length > 0) {
//       bookings.forEach((booking) => {
//         allItems.push({
//           type: "booking",
//           id: booking.id,
//           display: `${formatDate(booking.booking_date)} at ${formatTime(booking.start_time)}`,
//           data: booking,
//         })
//       })
//     }

//     if (allItems.length === 0) {
//       return "You have no active bookings or complaints to cancel.\n\nType 'menu' to return to main menu"
//     }

//     userStates.set(phoneNumber, {
//       step: "cancel_list",
//       type: "cancel",
//       cancelItems: allItems,
//     })

//     return displayCancelOptions(allItems)
//   } catch (error) {
//     console.error("Cancel options error:", error)
//     return "Error getting cancellation options. Please try again.\n\nType 'menu' to return to main menu"
//   }
// }

// function displayCancelOptions(items: any[]) {
//   let response = "Items you can cancel:\n\n"

//   const complaints = items.filter((item) => item.type === "complaint")
//   const bookings = items.filter((item) => item.type === "booking")

//   if (complaints.length > 0) {
//     response += "COMPLAINTS:\n"
//     complaints.forEach((item, index) => {
//       response += `${index + 1}. ${item.display}\n`
//     })
//     response += "\n"
//   }

//   if (bookings.length > 0) {
//     response += "BOOKINGS:\n"
//     const startIndex = complaints.length
//     bookings.forEach((item, index) => {
//       response += `${startIndex + index + 1}. ${item.display}\n`
//     })
//     response += "\n"
//   }

//   response += "Select a number to cancel or type 'menu' to return to main menu"

//   return response
// }

// async function handleCancelFlow(message: string, profile: any, phoneNumber: string, userState: any) {
//   const choice = Number.parseInt(message.trim())

//   if (userState.step === "cancel_list") {
//     if (isNaN(choice) || choice < 1 || choice > userState.cancelItems.length) {
//       return `Invalid selection. Please choose 1-${userState.cancelItems.length} or type 'menu' for main menu`
//     }

//     const selectedItem = userState.cancelItems[choice - 1]

//     userState.step = "cancel_confirmation"
//     userState.selectedItem = selectedItem
//     userStates.set(phoneNumber, userState)

//     if (selectedItem.type === "complaint") {
//       return `Are you sure you want to cancel this complaint?

// ${selectedItem.data.complaint_id} - ${selectedItem.data.subcategory}
// Status: ${selectedItem.data.status}

// Reply 'YES' to confirm cancellation or 'NO' to go back`
//     } else if (selectedItem.type === "booking") {
//       return `Are you sure you want to cancel this booking?

// Date: ${formatDate(selectedItem.data.booking_date)}
// Time: ${formatTime(selectedItem.data.start_time)} - ${formatTime(selectedItem.data.end_time)}
// Amount: Rs. ${selectedItem.data.booking_charges}

// Reply 'YES' to confirm cancellation or 'NO' to go back`
//     }
//   } else if (userState.step === "cancel_confirmation") {
//     const response = message.trim().toLowerCase()

//     if (response === "yes") {
//       return await processCancellation(userState.selectedItem, phoneNumber)
//     } else if (response === "no") {
//       userState.step = "cancel_list"
//       userStates.set(phoneNumber, userState)
//       return displayCancelOptions(userState.cancelItems)
//     } else {
//       return "Please reply 'YES' to confirm cancellation or 'NO' to go back"
//     }
//   }

//   return "Invalid selection. Type 'menu' to return to main menu"
// }

// async function processCancellation(item: any, phoneNumber: string) {
//   try {
//     if (item.type === "complaint") {
//       const { error } = await supabase
//         .from("complaints")
//         .update({ status: "cancelled", updated_at: new Date().toISOString() })
//         .eq("id", item.id)

//       if (error) {
//         return "Error cancelling complaint. Please try again.\n\nType 'menu' to return to main menu"
//       } else {
//         userStates.delete(phoneNumber)
//         return `Complaint ${item.data.complaint_id} has been cancelled successfully.\n\nType 'menu' to return to main menu`
//       }
//     } else if (item.type === "booking") {
//       const { error } = await supabase
//         .from("bookings")
//         .update({ status: "cancelled", updated_at: new Date().toISOString() })
//         .eq("id", item.id)

//       if (error) {
//         return "Error cancelling booking. Please try again.\n\nType 'menu' to return to main menu"
//       } else {
//         userStates.delete(phoneNumber)
//         return `Booking for ${formatDate(item.data.booking_date)} has been cancelled successfully.\n\nType 'menu' to return to main menu`
//       }
//     }
//   } catch (error) {
//     console.error("Cancellation error:", error)
//     return "Error processing cancellation. Please try again.\n\nType 'menu' to return to main menu"
//   }
// }

// function generateTimeSlots(settings: any, existingBookings: any[]) {
//   const slots = []
//   const startHour = Number.parseInt(settings.start_time.split(":")[0])
//   const endHour = Number.parseInt(settings.end_time.split(":")[0])
//   const durationHours = Math.floor(settings.slot_duration_minutes / 60)

//   for (let hour = startHour; hour < endHour; hour += durationHours) {
//     const nextHour = hour + durationHours
//     if (nextHour > endHour) break

//     const startTime = `${hour.toString().padStart(2, "0")}:00:00`
//     const endTime = `${nextHour.toString().padStart(2, "0")}:00:00`

//     // Check if this slot is booked (only show available slots)
//     const isBooked = existingBookings.some(
//       (booking) => booking.start_time === startTime && booking.end_time === endTime,
//     )

//     // Only add available slots to the list
//     if (!isBooked) {
//       slots.push({
//         start_time: startTime,
//         end_time: endTime,
//         is_available: true,
//         display: `${formatTimeDisplay(hour)} - ${formatTimeDisplay(nextHour)}`,
//       })
//     }
//   }

//   return slots
// }

// function formatTimeDisplay(hour: number) {
//   if (hour === 0) return "12:00 AM"
//   if (hour < 12) return `${hour}:00 AM`
//   if (hour === 12) return "12:00 PM"
//   return `${hour - 12}:00 PM`
// }

// function formatTime(timeString: string) {
//   const [hours, minutes] = timeString.split(":")
//   const hour = Number.parseInt(hours)
//   const ampm = hour >= 12 ? "PM" : "AM"
//   const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
//   return `${displayHour}:${minutes} ${ampm}`
// }

// function formatDate(dateString: string) {
//   const date = new Date(dateString + "T00:00:00")
//   return date.toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   })
// }

// function formatDateTime(dateString: string) {
//   return new Date(dateString).toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   })
// }



import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { isDateFormat, parseDate, isWorkingDay, getDayName } from "@/lib/dateUtils"

// Enhanced user state for both booking and complaints
const userStates = new Map<
  string,
  {
    step: string
    type?: "booking" | "complaint" | "cancel" | "status"
    date?: string
    slots?: any[]
    complaint?: {
      category?: string
      subcategory?: string
      description?: string
    }
    cancelItems?: any[]
    statusItems?: any[]
  }
>()

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK CALLED ===")

    const body = await request.formData()
    const from = body.get("From") as string
    const messageBody = body.get("Body") as string
    const profileName = body.get("ProfileName") as string

    const phoneNumber = from.replace("whatsapp:", "")
    console.log("From:", from)
    console.log("Body:", messageBody)

    // Check if user is registered and active
    const profile = await getProfile(phoneNumber)
    if (!profile) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You are not a registered user. Please contact the admin to register your number.</Message></Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
        },
      )
    }

    if (!profile.is_active) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Your account is inactive. Please contact the admin.</Message></Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
        },
      )
    }

    // Process message
    const response = await processMessage(messageBody, profile, phoneNumber)
    console.log("Sending response:", response)

    // Clean the response text
    const cleanResponse = response?.replace(/[^\x20-\x7E\n\r]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .trim()

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${cleanResponse}</Message></Response>`

    console.log("TwiML:", twimlResponse)

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("Error:", error)
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error occurred. Please try again.</Message></Response>`
    return new Response(errorTwiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    })
  }
}

export async function GET() {
  console.log("GET request to webhook")
  return new Response("Webhook endpoint is working", { status: 200 })
}

async function getProfile(phoneNumber: string) {
  try {
    console.log("Getting profile for:", phoneNumber)

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single()

    if (error && error.code === "PGRST116") {
      console.log("Profile not found")
      return null
    } else if (error) {
      console.error("Profile fetch error:", error)
      return null
    }

    console.log("Profile:", profile)
    return profile
  } catch (error) {
    console.error("Profile error:", error)
    return null
  }
}

async function processMessage(message: string, profile: any, phoneNumber: string) {
  try {
    const trimmedMessage = message.trim()
    const userState = userStates.get(phoneNumber) || { step: "initial" }

    console.log("Processing:", { message: trimmedMessage, step: userState.step })

    // Handle back command
    if (trimmedMessage.toLowerCase() === "back") {
      return handleBackCommand(phoneNumber, userState, profile)
    }

    // Handle menu command
    if (trimmedMessage.toLowerCase() === "menu") {
      userStates.delete(phoneNumber)
      return getMainMenu(profile.name)
    }

    // Handle main menu selection
    if (userState.step === "initial" || userState.step === "main_menu") {
      return await handleMainMenu(trimmedMessage, profile, phoneNumber)
    }

    // Handle complaint flow
    if (userState.type === "complaint") {
      return await handleComplaintFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle booking flow
    if (userState.type === "booking") {
      return await handleBookingFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle cancel flow
    if (userState.type === "cancel") {
      return await handleCancelFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Handle status flow
    if (userState.type === "status") {
      return await handleStatusFlow(trimmedMessage, profile, phoneNumber, userState)
    }

    // Default welcome
    return getMainMenu(profile.name)
  } catch (error) {
    console.error("Process message error:", error)
    return "Error processing your message. Please try again.\n\nType 'menu' to return to main menu"
  }
}

function handleBackCommand(phoneNumber: string, userState: any, profile: any) {
  // Go back to previous menu based on current step
  if (userState.step === "complaint_subcategory") {
    userState.step = "complaint_category"
    userStates.set(phoneNumber, userState)
    return `Please enter the corresponding number to the nature of your complaint:

1. Apartment Resident Complaint
2. Building Complaint

Reply with 1 or 2 or type "menu" to return to main menu`
  } else if (userState.step === "complaint_description") {
    userState.step = "complaint_subcategory"
    userStates.set(phoneNumber, userState)
    return `Please enter the corresponding number to the nature of your complaint:

1. Plumbing
2. Electric
3. Civil
4. Other

Reply with the number (1-4) or type "back" to go to previous menu`
  } else if (userState.step === "waiting_for_slot") {
    userState.step = "booking_date"
    userState.date = undefined
    userState.slots = undefined
    userStates.set(phoneNumber, userState)
    return "Enter the date you want to book (DD-MM-YYYY format). Example: 25-10-2025\n\nType 'menu' to return to main menu"
  } else if (userState.step === "cancel_selection") {
    userState.step = "cancel_list"
    userStates.set(phoneNumber, userState)
    return userState.cancelItems ? displayCancelOptions(userState.cancelItems) : "No items to cancel."
  } else if (userState.step === "status_selection") {
    userState.step = "status_list"
    userStates.set(phoneNumber, userState)
    return userState.statusItems ? displayStatusOptions(userState.statusItems) : "No items to check."
  } else {
    userStates.delete(phoneNumber)
    return getMainMenu(profile.name)
  }
}

function getMainMenu(name: string) {
  // return `Hi ${name}! Welcome to Community Management System.
  return `Hi! Welcome to Community Management System.

Please select a valid option from 1-6:
1. Register Complaint
2. Book Community Hall
3. Check Status
4. Cancel Booking/Complaint
5. View My Profile
6. Check Maintenance Status

Reply with the number (1-6)`
}

function getProfileInfo(profile: any) {
  return `Your Profile Information:

Name: ${profile.name}
Phone: ${profile.phone_number}
Apartment: ${profile.apartment_number}
${profile.building_block ? `Building: ${profile.building_block}` : ""}
${profile.cnic ? `CNIC: ${profile.cnic}` : ""}

Type 'menu' to return to main menu`
}

function getMaintenanceStatus(profile: any) {
  const status = profile.maintenance_paid ? "PAID" : "UNPAID"
  const statusEmoji = profile.maintenance_paid ? "✅" : "❌"

  let response = `Maintenance Status ${statusEmoji}

Monthly Charges: Rs. ${profile.maintenance_charges}
Status: ${status}`

  if (profile.last_payment_date) {
    response += `\nLast Payment: ${formatDate(profile.last_payment_date)}`
  }

  if (!profile.maintenance_paid) {
    response += `\n\n⚠️ Please pay your maintenance charges to avoid service disruption.`
  }

  response += `\n\nType 'menu' to return to main menu`

  return response
}

async function handleComplaintFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  const choice = message.trim()

  switch (userState.step) {
    case "complaint_category":
      if (choice === "1") {
        userState.complaint.category = "apartment"
        userState.step = "complaint_subcategory"
        userStates.set(phoneNumber, userState)
        return `Please enter the corresponding number to the nature of your complaint:

1. Plumbing
2. Electric
3. Civil
4. Other

Reply with the number (1-4) or type "back" to go to previous menu`
      } else if (choice === "2") {
        userState.complaint.category = "building"
        userState.step = "complaint_subcategory"
        userStates.set(phoneNumber, userState)
        return `Please enter the corresponding number to the nature of your complaint:

1. Plumbing
2. Electric
3. Civil
4. Other

Reply with the number (1-4) or type "back" to go to previous menu`
      } else {
        return "Invalid option. Please reply with 1 for Apartment or 2 for Building complaint.\n\nType 'back' to go to previous menu or 'menu' for main menu"
      }

    case "complaint_subcategory":
      const subcategories = ["plumbing", "electric", "civil", "other"]
      const subcategoryNames = ["Plumbing", "Electric", "Civil", "Other"]

      const choiceNum = Number.parseInt(choice)
      if (choiceNum >= 1 && choiceNum <= 4) {
        userState.complaint.subcategory = subcategories[choiceNum - 1]

        if (choiceNum === 4) {
          // Other
          userState.step = "complaint_description"
          userStates.set(phoneNumber, userState)
          return "Please write a short paragraph explaining your complaint:\n\nType 'back' to go to previous menu"
        } else {
          // Create complaint directly for predefined categories
          return await createComplaint(profile, userState, phoneNumber)
        }
      } else {
        return "Invalid option. Please reply with a number from 1-4.\n\nType 'back' to go to previous menu"
      }

    case "complaint_description":
      userState.complaint.description = message
      return await createComplaint(profile, userState, phoneNumber)

    default:
      return "Something went wrong. Type 'menu' to return to main menu."
  }
}

async function createComplaint(profile: any, userState: any, phoneNumber: string) {
  try {
    // Generate group key for similar complaints
    const groupKey = `${userState.complaint.category}_${userState.complaint.subcategory}`

    // Generate complaint ID
    const { data: complaintData, error } = await supabase
      .from("complaints")
      .insert([
        {
          complaint_id: await generateComplaintId(),
          profile_id: profile.id,
          category: userState.complaint.category,
          subcategory: userState.complaint.subcategory,
          description: userState.complaint.description || null,
          group_key: groupKey,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Complaint creation error:", error)
      return "Error creating complaint. Please try again.\n\nType 'menu' to return to main menu"
    }

    // Clear state
    userStates.delete(phoneNumber)

    const categoryText = userState.complaint.category === "apartment" ? "apartment" : "building"
    const subcategoryText =
      userState.complaint.subcategory.charAt(0).toUpperCase() + userState.complaint.subcategory.slice(1)

    if (userState.complaint.subcategory === "other") {
      return `Thank you, we have delivered your complaint to the respective department.

Complaint ID: ${complaintData.complaint_id}
Category: ${categoryText} - ${subcategoryText}

We will resolve it shortly. Thank you for your patience.

Type 'menu' to return to main menu`
    } else {
      return `Your registered complaint is regarding a ${subcategoryText} issue in your ${categoryText}.

Complaint ID: ${complaintData.complaint_id}

Our staff will resolve your complaint shortly.

Type 'menu' to return to main menu`
    }
  } catch (error) {
    console.error("Create complaint error:", error)
    return "Error creating complaint. Please try again.\n\nType 'menu' to return to main menu"
  }
}

async function generateComplaintId() {
  // Simple complaint ID generation
  const timestamp = Date.now().toString().slice(-6)
  return `CMP${timestamp}`
}

async function handleBookingFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  // Handle slot selection
  if (userState.step === "waiting_for_slot") {
    return await handleSlotSelection(message, profile, phoneNumber, userState)
  }

  // Handle date input
  if (isDateFormat(message)) {
    return await handleDateInput(message, profile, phoneNumber)
  }

  return "Please enter a valid date in DD-MM-YYYY format or type 'back' to return to previous menu or 'menu' for main menu."
}

async function handleSlotSelection(message: string, profile: any, phoneNumber: string, userState: any) {
  try {
    const slotNumber = Number.parseInt(message)

    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > userState.slots.length) {
      return `Invalid number. Please choose 1-${userState.slots.length} or type "back" to select another date`
    }

    const selectedSlot = userState.slots[slotNumber - 1]

    // Double-check availability before booking
    const { data: conflictCheck } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", userState.date)
      .eq("start_time", selectedSlot.start_time)
      .eq("end_time", selectedSlot.end_time)
      .eq("status", "confirmed")

    if (conflictCheck && conflictCheck.length > 0) {
      return `This slot is already booked. Please choose another slot or type "back" to select another date`
    }

    // Calculate payment due date (3 days from booking)
    const paymentDueDate = new Date()
    paymentDueDate.setDate(paymentDueDate.getDate() + 3)

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([
        {
          profile_id: profile.id,
          booking_date: userState.date,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          status: "confirmed",
          booking_charges: 500, // Default hall booking charge
          payment_status: "pending",
          payment_due_date: paymentDueDate.toISOString().split("T")[0],
        },
      ])
      .select()
      .single()

    if (bookingError) {
      console.error("Booking error:", bookingError)
      if (bookingError.code === "23505") {
        return "This slot was just taken. Please choose another slot or type 'back'"
      }
      return "Booking failed. Please try again or type 'back'"
    }

    userStates.delete(phoneNumber)

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const invoiceUrl = `${baseUrl}/booking-invoice/${booking.id}?payment=pending&booking=confirmed`

    return `BOOKING CONFIRMED! ✅

Date: ${formatDate(userState.date)}
Time: ${selectedSlot.display}
Name: ${profile.name}
Apartment: ${profile.apartment_number}

💰 PAYMENT REQUIRED:
Amount: Rs. 500
Due Date: ${formatDate(paymentDueDate.toISOString().split("T")[0])}

⚠️ Please pay the admin within 3 days or your booking will be cancelled.
View Invoice: ${invoiceUrl}

Type 'menu' to return to main menu`
  } catch (error) {
    console.error("Slot selection error:", error)
    return "Error processing selection. Type 'menu' to return to main menu."
  }
}

async function handleDateInput(message: string, profile: any, phoneNumber: string) {
  try {
    const parsedDate = parseDate(message)
    if (!parsedDate) {
      return "Invalid date format. Please enter a date in DD-MM-YYYY format.\n\nType 'back' to return to previous menu or 'menu' for main menu"
    }

    // Check if the date is in the past
    const today = new Date()
    const inputDate = new Date(parsedDate + "T00:00:00")
    const todayString =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0")

    if (parsedDate < todayString) {
      return `Cannot book for past dates. Please select a future date.\n\nType 'back' to return to previous menu or 'menu' for main menu`
    }

    // Get booking settings to check working days
    const { data: settings } = await supabase.from("booking_settings").select("working_days").single()

    if (settings && !isWorkingDay(parsedDate, settings.working_days)) {
      const dayName = getDayName(parsedDate)
      return `Sorry, bookings are not available on ${dayName}s.\n\nPlease select a date from our working days and try again.\n\nType 'back' to return to previous menu or 'menu' for main menu`
    }

    // Get existing confirmed bookings for this date
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", parsedDate)
      .eq("status", "confirmed")

    const bookingSettings = {
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 60,
    }

    const slots = generateTimeSlots(bookingSettings, existingBookings || [])

    if (slots.length === 0) {
      return `No available slots on ${formatDate(parsedDate)}. All slots are booked.\n\nType 'back' to return to previous menu or 'menu' for main menu`
    }

    const userState = userStates.get(phoneNumber) || { step: "initial" }
    userState.step = "waiting_for_slot"
    userState.date = parsedDate
    userState.slots = slots
    userStates.set(phoneNumber, userState)

    let response = `Available slots on ${formatDate(parsedDate)} (${getDayName(parsedDate)}):\n\n`

    slots.forEach((slot, index) => {
      response += `${index + 1}. ${slot.display}\n`
    })

    response +=
      "\nPlease select a slot number to book.\n\nType 'back' to return to previous menu or 'menu' for main menu"

    return response
  } catch (error) {
    console.error("Date input error:", error)
    return "Error processing date input. Type 'menu' to return to main menu."
  }
}

async function handleMainMenu(message: string, profile: any, phoneNumber: string) {
  const choice = message.trim()

  switch (choice) {
    case "1":
      userStates.set(phoneNumber, { step: "complaint_category", type: "complaint", complaint: {} })
      return `Please enter the corresponding number to the nature of your complaint:

1. Apartment Resident Complaint
2. Building Complaint

Reply with 1 or 2 or type "menu" to return to main menu`

    case "2":
      userStates.set(phoneNumber, { step: "booking_date", type: "booking" })
      return "Enter the date you want to book (DD-MM-YYYY format). Example: 25-10-2025\n\nType 'menu' to return to main menu"

    case "3":
      return await initializeStatusCheck(profile, phoneNumber)

    case "4":
      return await initializeCancelFlow(profile, phoneNumber)

    case "5":
      return getProfileInfo(profile)

    case "6":
      return getMaintenanceStatus(profile)

    default:
        return `Hi! Welcome to Community Management System.

Please select a valid option from 1-6:
1. Register Complaint
2. Book Community Hall
3. Check Status
4. Cancel Booking/Complaint
5. View My Profile
6. Check Maintenance Status

Reply with the number (1-6)`
      
//       return `Invalid option. Please select:

// 1. Register Complaint
// 2. Book Community Hall
// 3. Check Status
// 4. Cancel Booking/Complaint
// 5. View My Profile
// 6. Check Maintenance Status

// Reply with the number (1-6)`
  }
}

async function initializeStatusCheck(profile: any, phoneNumber: string) {
  try {
    // Get recent bookings and complaints
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("profile_id", profile.id)
      .in("status", ["confirmed", "payment_pending"])
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: complaints } = await supabase
      .from("complaints")
      .select("*")
      .eq("profile_id", profile.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(10)

    const allItems:any = []

    if (complaints && complaints.length > 0) {
      complaints.forEach((complaint) => {
        allItems.push({
          type: "complaint",
          id: complaint.complaint_id,
          display: `${complaint.complaint_id} - ${complaint.status.toUpperCase()}`,
          data: complaint,
        })
      })
    }

    if (bookings && bookings.length > 0) {
      bookings.forEach((booking) => {
        const paymentStatus = booking.payment_status === "paid" ? "✅" : "💰"
        allItems.push({
          type: "booking",
          id: booking.booking_date,
          display: `${formatDate(booking.booking_date)} - ${booking.status.toUpperCase()} ${paymentStatus}`,
          data: booking,
        })
      })
    }

    if (allItems.length === 0) {
      return "You have no recent bookings or complaints.\n\nType 'menu' to return to main menu"
    }

    userStates.set(phoneNumber, {
      step: "status_list",
      type: "status",
      statusItems: allItems,
    })

    return displayStatusOptions(allItems)
  } catch (error) {
    console.error("Status check error:", error)
    return "Error checking status. Please try again.\n\nType 'menu' to return to main menu"
  }
}

function displayStatusOptions(items: any[]) {
  let response = "Your Recent Items:\n\n"

  const complaints = items.filter((item) => item.type === "complaint")
  const bookings = items.filter((item) => item.type === "booking")

  if (complaints.length > 0) {
    response += "COMPLAINTS:\n"
    complaints.forEach((item, index) => {
      response += `${index + 1}. ${item.display}\n`
    })
    response += "\n"
  }

  if (bookings.length > 0) {
    response += "BOOKINGS:\n"
    const startIndex = complaints.length
    bookings.forEach((item, index) => {
      response += `${startIndex + index + 1}. ${item.display}\n`
    })
    response += "\n"
  }

  response += "Select a number to view details or type 'menu' to return to main menu"

  return response
}

async function handleStatusFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  const choice = Number.parseInt(message.trim())

  if (userState.step === "status_list") {
    if (isNaN(choice) || choice < 1 || choice > userState.statusItems.length) {
      return `Invalid selection. Please choose 1-${userState.statusItems.length} or type 'menu' for main menu`
    }

    const selectedItem = userState.statusItems[choice - 1]

    if (selectedItem.type === "complaint") {
      const complaint = selectedItem.data
      let response = `Complaint Details: ${complaint.complaint_id}

Category: ${complaint.category} - ${complaint.subcategory}
Status: ${complaint.status.toUpperCase()}
Created: ${formatDateTime(complaint.created_at)}`

      if (complaint.description) {
        response += `\n\nDescription:\n${complaint.description}`
      }

      response += `\n\nType 'menu' to return to main menu`
      userStates.delete(phoneNumber)
      return response
    } else if (selectedItem.type === "booking") {
      const booking = selectedItem.data
      const paymentStatus = booking.payment_status === "paid" ? "PAID ✅" : "PENDING 💰"
      let response = `Booking Details: ${formatDate(booking.booking_date)}

Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}
Status: ${booking.status.toUpperCase()}
Payment: ${paymentStatus}
Amount: Rs. ${booking.booking_charges}`

      if (booking.payment_due_date && booking.payment_status === "pending") {
        response += `\nPayment Due: ${formatDate(booking.payment_due_date)}`
      }

      response += `\nCreated: ${formatDateTime(booking.created_at)}`
      response += `\n\nType 'menu' to return to main menu`
      userStates.delete(phoneNumber)
      return response
    }
  }

  return "Invalid selection. Type 'menu' to return to main menu"
}

async function initializeCancelFlow(profile: any, phoneNumber: string) {
  try {
    // Get active bookings and complaints
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("status", "confirmed")
      .gte("booking_date", new Date().toISOString().split("T")[0])
      .order("booking_date", { ascending: true })

    const { data: complaints } = await supabase
      .from("complaints")
      .select("*")
      .eq("profile_id", profile.id)
      .in("status", ["pending", "in-progress"])
      .order("created_at", { ascending: false })

    const allItems:any = []

    if (complaints && complaints.length > 0) {
      complaints.forEach((complaint) => {
        allItems.push({
          type: "complaint",
          id: complaint.id,
          display: `${complaint.complaint_id} - ${complaint.subcategory}`,
          data: complaint,
        })
      })
    }

    if (bookings && bookings.length > 0) {
      bookings.forEach((booking) => {
        allItems.push({
          type: "booking",
          id: booking.id,
          display: `${formatDate(booking.booking_date)} at ${formatTime(booking.start_time)}`,
          data: booking,
        })
      })
    }

    if (allItems.length === 0) {
      return "You have no active bookings or complaints to cancel.\n\nType 'menu' to return to main menu"
    }

    userStates.set(phoneNumber, {
      step: "cancel_list",
      type: "cancel",
      cancelItems: allItems,
    })

    return displayCancelOptions(allItems)
  } catch (error) {
    console.error("Cancel options error:", error)
    return "Error getting cancellation options. Please try again.\n\nType 'menu' to return to main menu"
  }
}

function displayCancelOptions(items: any[]) {
  let response = "Items you can cancel:\n\n"

  const complaints = items.filter((item) => item.type === "complaint")
  const bookings = items.filter((item) => item.type === "booking")

  if (complaints.length > 0) {
    response += "COMPLAINTS:\n"
    complaints.forEach((item, index) => {
      response += `${index + 1}. ${item.display}\n`
    })
    response += "\n"
  }

  if (bookings.length > 0) {
    response += "BOOKINGS:\n"
    const startIndex = complaints.length
    bookings.forEach((item, index) => {
      response += `${startIndex + index + 1}. ${item.display}\n`
    })
    response += "\n"
  }

  response += "Select a number to cancel or type 'menu' to return to main menu"

  return response
}

async function handleCancelFlow(message: string, profile: any, phoneNumber: string, userState: any) {
  const choice = Number.parseInt(message.trim())

  if (userState.step === "cancel_list") {
    if (isNaN(choice) || choice < 1 || choice > userState.cancelItems.length) {
      return `Invalid selection. Please choose 1-${userState.cancelItems.length} or type 'menu' for main menu`
    }

    const selectedItem = userState.cancelItems[choice - 1]

    userState.step = "cancel_confirmation"
    userState.selectedItem = selectedItem
    userStates.set(phoneNumber, userState)

    if (selectedItem.type === "complaint") {
      return `Are you sure you want to cancel this complaint?

${selectedItem.data.complaint_id} - ${selectedItem.data.subcategory}
Status: ${selectedItem.data.status}

Reply 'YES' to confirm cancellation or 'NO' to go back`
    } else if (selectedItem.type === "booking") {
      return `Are you sure you want to cancel this booking?

Date: ${formatDate(selectedItem.data.booking_date)}
Time: ${formatTime(selectedItem.data.start_time)} - ${formatTime(selectedItem.data.end_time)}
Amount: Rs. ${selectedItem.data.booking_charges}

Reply 'YES' to confirm cancellation or 'NO' to go back`
    }
  } else if (userState.step === "cancel_confirmation") {
    const response = message.trim().toLowerCase()

    if (response === "yes") {
      return await processCancellation(userState.selectedItem, phoneNumber)
    } else if (response === "no") {
      userState.step = "cancel_list"
      userStates.set(phoneNumber, userState)
      return displayCancelOptions(userState.cancelItems)
    } else {
      return "Please reply 'YES' to confirm cancellation or 'NO' to go back"
    }
  }

  return "Invalid selection. Type 'menu' to return to main menu"
}

async function processCancellation(item: any, phoneNumber: string) {
  try {
    if (item.type === "complaint") {
      const { error } = await supabase
        .from("complaints")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", item.id)

      if (error) {
        return "Error cancelling complaint. Please try again.\n\nType 'menu' to return to main menu"
      } else {
        userStates.delete(phoneNumber)
        return `Complaint ${item.data.complaint_id} has been cancelled successfully.\n\nType 'menu' to return to main menu`
      }
    } else if (item.type === "booking") {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", item.id)

      if (error) {
        return "Error cancelling booking. Please try again.\n\nType 'menu' to return to main menu"
      } else {
        userStates.delete(phoneNumber)
        return `Booking for ${formatDate(item.data.booking_date)} has been cancelled successfully.\n\nType 'menu' to return to main menu`
      }
    }
  } catch (error) {
    console.error("Cancellation error:", error)
    return "Error processing cancellation. Please try again.\n\nType 'menu' to return to main menu"
  }
}

function generateTimeSlots(settings: any, existingBookings: any[]) {
  const slots = []
  const startHour = Number.parseInt(settings.start_time.split(":")[0])
  const endHour = Number.parseInt(settings.end_time.split(":")[0])
  const durationHours = Math.floor(settings.slot_duration_minutes / 60)

  for (let hour = startHour; hour < endHour; hour += durationHours) {
    const nextHour = hour + durationHours
    if (nextHour > endHour) break

    const startTime = `${hour.toString().padStart(2, "0")}:00:00`
    const endTime = `${nextHour.toString().padStart(2, "0")}:00:00`

    // Check if this slot is booked (only show available slots)
    const isBooked = existingBookings.some(
      (booking) => booking.start_time === startTime && booking.end_time === endTime,
    )

    // Only add available slots to the list
    if (!isBooked) {
      slots.push({
        start_time: startTime,
        end_time: endTime,
        is_available: true,
        display: `${formatTimeDisplay(hour)} - ${formatTimeDisplay(nextHour)}`,
      })
    }
  }

  return slots
}

function formatTimeDisplay(hour: number) {
  if (hour === 0) return "12:00 AM"
  if (hour < 12) return `${hour}:00 AM`
  if (hour === 12) return "12:00 PM"
  return `${hour - 12}:00 PM`
}

function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

function formatDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
