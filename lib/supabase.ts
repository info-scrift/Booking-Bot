// import { createClient } from "@supabase/supabase-js"

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// export type Profile = {
//   id: string
//   phone_number: string
//   name: string | null
//   created_at: string
//   updated_at: string
// }

// export type BookingSettings = {
//   id: string
//   start_time: string
//   end_time: string
//   slot_duration_minutes: number
//   working_days: number[]
//   created_at: string
//   updated_at: string
// }

// export type Booking = {
//   id: string
//   profile_id: string
//   booking_date: string
//   start_time: string
//   end_time: string
//   status: "confirmed" | "cancelled"
//   created_at: string
//   updated_at: string
//   profiles?: Profile
// }

// export type TimeSlot = {
//   start_time: string
//   end_time: string
//   is_available: boolean
//   display_text: string
// }




// import { createClient } from "@supabase/supabase-js"

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// export type Profile = {
//   id: string
//   phone_number: string
//   name: string | null
//   created_at: string
//   updated_at: string
// }

// export type BookingSettings = {
//   id: string
//   start_time: string
//   end_time: string
//   slot_duration_minutes: number
//   working_days: number[]
//   created_at: string
//   updated_at: string
// }

// export type Booking = {
//   id: string
//   profile_id: string
//   booking_date: string
//   start_time: string
//   end_time: string
//   status: "confirmed" | "cancelled"
//   created_at: string
//   updated_at: string
//   profiles?: Profile
// }

// export type Complaint = {
//   id: string
//   complaint_id: string
//   profile_id: string
//   category: "apartment" | "building"
//   subcategory: string
//   description: string | null
//   status: "pending" | "in-progress" | "completed" | "cancelled"
//   created_at: string
//   updated_at: string
//   profiles?: Profile
// }

// export type TimeSlot = {
//   start_time: string
//   end_time: string
//   is_available: boolean
//   display_text: string
// }



// import { createClient } from "@supabase/supabase-js"

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// export type Profile = {
//   id: string
//   phone_number: string
//   name: string
//   cnic: string | null
//   apartment_number: string
//   building_block: string | null
//   is_active: boolean
//   maintenance_charges: number
//   maintenance_paid: boolean
//   last_payment_date: string | null
//   created_at: string
//   updated_at: string
// }

// export type BookingSettings = {
//   id: string
//   start_time: string
//   end_time: string
//   slot_duration_minutes: number
//   working_days: number[]
//   created_at: string
//   updated_at: string
// }

// export type Booking = {
//   id: string
//   profile_id: string
//   booking_date: string
//   start_time: string
//   end_time: string
//   status: "confirmed" | "cancelled" | "payment_pending"
//   booking_charges: number
//   payment_status: "pending" | "paid"
//   payment_due_date: string | null
//   created_at: string
//   updated_at: string
//   profiles?: Profile
// }

// export type Complaint = {
//   id: string
//   complaint_id: string
//   profile_id: string
//   category: "apartment" | "building"
//   subcategory: string
//   description: string | null
//   status: "pending" | "in-progress" | "completed" | "cancelled"
//   group_key: string | null
//   created_at: string
//   updated_at: string
//   profiles?: Profile
// }

// export type GroupedComplaint = {
//   group_key: string
//   category: string
//   subcategory: string
//   description: string | null
//   status: string
//   count: number
//   latest_date: string
//   complaints: Complaint[]
// }

// export type TimeSlot = {
//   start_time: string
//   end_time: string
//   is_available: boolean
//   display_text: string
// }




// import { createClient } from "@supabase/supabase-js"

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// export type Profile = {
//   id: string
//   phone_number: string
//   name: string
//   cnic: string | null
//   apartment_number: string
//   building_block: string | null
//   is_active: boolean
//   maintenance_charges: number
//   maintenance_paid: boolean
//   last_payment_date: string | null
//   created_at: string
//   updated_at: string
// }

// export type BookingSettings = {
//   id: string
//   start_time: string
//   end_time: string
//   slot_duration_minutes: number
//   working_days: number[]
//   created_at: string
//   updated_at: string
// }

// export type Booking = {
//   id: string
//   profile_id: string
//   booking_date: string
//   start_time: string
//   end_time: string
//   status: "confirmed" | "cancelled" | "payment_pending" | string
//   booking_charges: number
//   payment_status: "pending" | "paid" | string
//   payment_due_date: string | null
//   reminder_last_sent_at?: string | null
//   payment_confirmation_sent?: boolean
//   created_at: string
//   updated_at: string
//   profiles?: Profile
// }

// export type Complaint = {
//   id: string
//   complaint_id: string
//   profile_id: string
//   category: "apartment" | "building"
//   subcategory: string
//   description: string | null
//   status: "pending" | "in-progress" | "completed" | "cancelled"
//   group_key: string | null
//   created_at: string
//   updated_at: string
//   profiles?: Profile
// }

// export type GroupedComplaint = {
//   group_key: string
//   category: string
//   subcategory: string
//   description: string | null
//   status: string
//   count: number
//   latest_date: string
//   complaints: Complaint[]
// }

// export type TimeSlot = {
//   start_time: string
//   end_time: string
//   is_available: boolean
//   display_text: string
// }

// export type MaintenancePayment = {
//   id: string
//   profile_id: string
//   year: number
//   month: number
//   amount: number
//   status: "paid" | "unpaid" | "overdue"
//   paid_date: string | null
//   reminder_last_sent_at: string | null
//   confirmation_sent: boolean
//   confirmation_sent_at: string | null
//   created_at: string
//   updated_at: string
// }


import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  phone_number: string
  name: string
  cnic: string | null
  apartment_number: string
  is_active: boolean
  maintenance_charges: number
  maintenance_paid: boolean
  last_payment_date: string | null
  created_at: string
  updated_at: string
}

export type BookingSettings = {
  id: string
  start_time: string
  end_time: string
  slot_duration_minutes: number
  working_days: number[]
  booking_charges: number
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  profile_id: string
  booking_date: string
  start_time: string
  end_time: string
  status: "confirmed" | "cancelled" | "payment_pending" | string
  booking_charges: number
  payment_status: "pending" | "paid" | string
  reminder_last_sent_at?: string | null
  payment_confirmation_sent?: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type Complaint = {
  id: string
  complaint_id: string
  profile_id: string
  category: "apartment" | "building"
  subcategory: string
  description: string | null
  status: "pending" | "in-progress" | "completed" | "cancelled"
  group_key: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type GroupedComplaint = {
  group_key: string
  category: string
  subcategory: string
  description: string | null
  status: string
  count: number
  latest_date: string
  complaints: Complaint[]
}

export type TimeSlot = {
  start_time: string
  end_time: string
  is_available: boolean
  display_text: string
}

export type MaintenancePayment = {
  id: string
  profile_id: string
  year: number
  month: number
  amount: number
  status: "paid" | "unpaid"
  paid_date: string | null
  reminder_last_sent_at: string | null
  confirmation_sent: boolean
  confirmation_sent_at: string | null
  created_at: string
  updated_at: string
  payment_reference?:string
}
