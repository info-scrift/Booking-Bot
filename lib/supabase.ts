import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  phone_number: string
  name: string | null
  created_at: string
  updated_at: string
}

export type BookingSettings = {
  id: string
  start_time: string
  end_time: string
  slot_duration_minutes: number
  working_days: number[]
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  profile_id: string
  booking_date: string
  start_time: string
  end_time: string
  status: "confirmed" | "cancelled"
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type TimeSlot = {
  start_time: string
  end_time: string
  is_available: boolean
  display_text: string
}
