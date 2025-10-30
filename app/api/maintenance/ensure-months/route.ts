import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { profileId, months = 12 } = await request.json()

    if (!profileId) return new Response("profileId required", { status: 400 })

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", profileId).single()
    if (!profile) return new Response("Profile not found", { status: 404 })

    const amount = profile.maintenance_charges || 0

    const now = new Date()
    const toInsert: any[] = []
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1

      // check if exists
      const { data: existing } = await supabase
        .from("maintenance_payments")
        .select("id")
        .eq("profile_id", profileId)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle()

      if (!existing) {
        toInsert.push({ profile_id: profileId, year, month, amount, status: "unpaid" })
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("maintenance_payments").insert(toInsert)
    }

    return new Response("ok", { status: 200 })
  } catch (e) {
    console.error("ensure-months error:", e)
    return new Response("error", { status: 500 })
  }
}
