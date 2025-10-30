import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendWhatsAppMessage } from "@/lib/twilio"

const ALLOWED_STATUSES = ["pending", "in-progress", "completed", "cancelled"] as const
type ComplaintStatus = (typeof ALLOWED_STATUSES)[number]

function statusLabel(status: ComplaintStatus) {
  switch (status) {
    case "pending":
      return "Pending"
    case "in-progress":
      return "In Progress"
    case "completed":
      return "Completed"
    case "cancelled":
      return "Cancelled"
    default:
      return status
  }
}

type ComplaintWithProfiles = {
  id: string
  complaint_id: string
  status: ComplaintStatus
  category: string
  subcategory: string
  description: string
  profile_id: string
  profiles: { name: string; phone_number: string }[] // array from Supabase
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const complaintId = body?.complaintId as string | undefined
    const status = body?.status as ComplaintStatus | undefined

    if (!complaintId || !status || !ALLOWED_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid request payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { data: complaint, error: fetchError } = await supabase
      .from("complaints")
      .select(
        `
        id,
        complaint_id,
        status,
        category,
        subcategory,
        description,
        profile_id,
        profiles:profiles!complaints_profile_id_fkey (name, phone_number)
      `
      )
      .eq("id", complaintId)
      .single<ComplaintWithProfiles>()

    if (fetchError || !complaint) {
      return new Response(JSON.stringify({ error: "Complaint not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ✅ Normalize array → single profile object
    const profile = complaint.profiles?.[0]

    const { error: updateError } = await supabase
      .from("complaints")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", complaintId)

    if (updateError) throw updateError

    if (profile?.phone_number) {
      const messageLines = [
        `Hello ${profile.name || "Resident"},`,
        `The status of your complaint ${complaint.complaint_id} has been updated to ${statusLabel(status)}.`,
      ]

      if (status === "completed") {
        messageLines.push("We appreciate your patience. Let us know if anything else comes up.")
      } else if (status === "in-progress") {
        messageLines.push("Our team is working on it and will keep you informed.")
      } else if (status === "cancelled") {
        messageLines.push("If this cancellation was unexpected, reply to this message and we will assist you.")
      }

      messageLines.push("- Green Three")

      try {
        await sendWhatsAppMessage(profile.phone_number, messageLines.join("\n"))
      } catch (notifyError) {
        console.error("Failed to send complaint status notification:", notifyError)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Complaint status update error:", error)
    return new Response(JSON.stringify({ error: "Unable to update complaint status" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}



// import type { NextRequest } from "next/server"
// import { supabase } from "@/lib/supabase"
// import { sendWhatsAppMessage } from "@/lib/twilio"


// const ALLOWED_STATUSES = ["pending", "in-progress", "completed", "cancelled"] as const
// type ComplaintStatus = (typeof ALLOWED_STATUSES)[number]

// function statusLabel(status: ComplaintStatus) {
//   switch (status) {
//     case "pending":
//       return "Pending"
//     case "in-progress":
//       return "In Progress"
//     case "completed":
//       return "Completed"
//     case "cancelled":
//       return "Cancelled"
//     default:
//       return status
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const complaintId = body?.complaintId as string | undefined
//     const status = body?.status as ComplaintStatus | undefined

//     if (!complaintId || !status || !ALLOWED_STATUSES.includes(status)) {
//       return new Response(JSON.stringify({ error: "Invalid request payload" }), {
//         status: 400,
//         headers: { "Content-Type": "application/json" },
//       })
//     }

//     const { data: complaint, error: fetchError } = await supabase
//       .from("complaints")
//       .select(
//         `
//         id,
//         complaint_id,
//         status,
//         category,
//         subcategory,
//         description,
//         profile_id,
//         profiles:profiles!complaints_profile_id_fkey (name, phone_number)
//       `,
//       )
//       .eq("id", complaintId)
//       .single()

//     if (fetchError || !complaint) {
//       return new Response(JSON.stringify({ error: "Complaint not found" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       })
//     }

//     const { error: updateError } = await supabase
//       .from("complaints")
//       .update({ status, updated_at: new Date().toISOString() })
//       .eq("id", complaintId)

//     if (updateError) {
//       throw updateError
//     }

//     if (complaint.profiles?.phone_number) {
//       const messageLines = [
//         `Hello ${complaint.profiles?.name || "Resident"},`,
//         `The status of your complaint ${complaint.complaint_id} has been updated to ${statusLabel(status)}.`,
//       ]

//       if (status === "completed") {
//         messageLines.push("We appreciate your patience. Let us know if anything else comes up.")
//       } else if (status === "in-progress") {
//         messageLines.push("Our team is working on it and will keep you informed.")
//       } else if (status === "cancelled") {
//         messageLines.push("If this cancellation was unexpected, reply to this message and we will assist you.")
//       }

//       messageLines.push("- Green Three")

//       try {
//         await sendWhatsAppMessage(complaint.profiles.phone_number, messageLines.join("\n"))
//       } catch (notifyError) {
//         console.error("Failed to send complaint status notification:", notifyError)
//       }
//     }

//     return new Response(JSON.stringify({ success: true }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     })
//   } catch (error) {
//     console.error("Complaint status update error:", error)
//     return new Response(JSON.stringify({ error: "Unable to update complaint status" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     })
//   }
// }
