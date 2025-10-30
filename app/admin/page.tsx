"use client"

import { useState, useEffect, useMemo } from "react"
import {
  supabase,
  type BookingSettings,
  type Booking,
  type Complaint,
  type Profile,
  type GroupedComplaint,
} from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Users,
  Settings,
  X,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Eye,
  CreditCard,
  UserPlus,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Search,
  Filter,
  BarChart3,
  Bell,
  Send,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { formatDateForDisplay } from "@/lib/time-utils"
import Link from "next/link"
import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"

export default function AdminPanel() {
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [groupedComplaints, setGroupedComplaints] = useState<GroupedComplaint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [complaintStatusFilter, setComplaintStatusFilter] = useState("all")
  const [maintenanceFilter, setMaintenanceFilter] = useState("all")
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null)
  const [updatingComplaintId, setUpdatingComplaintId] = useState<string | null>(null)
  const [sendingBookingReminder, setSendingBookingReminder] = useState(false)
  const [sendingMaintenanceReminder, setSendingMaintenanceReminder] = useState(false)

  // Settings form state
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [slotDuration, setSlotDuration] = useState(60)
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [bookingCharges, setBookingCharges] = useState(500)

  // New user form state
  const [newUser, setNewUser] = useState({
    name: "",
    phone_number: "",
    cnic: "",
    apartment_number: "",
    maintenance_charges: 5000,
  })

  // PDF export state
  const [residentsPeriod, setResidentsPeriod] = useState<Period>("all")
  const [bookingsPeriod, setBookingsPeriod] = useState<Period>("all")
  const [complaintsPeriod, setComplaintsPeriod] = useState<Period>("all")

  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles()])
    setLoading(false)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles()])
    setRefreshing(false)
    toast({
      title: "Data Refreshed",
      description: "All data has been updated successfully",
    })
  }

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("booking_settings").select("*").single()

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch booking settings",
        variant: "destructive",
      })
    } else {
      setSettings(data)
      setStartTime(data.start_time.substring(0, 5))
      setEndTime(data.end_time.substring(0, 5))
      setSlotDuration(data.slot_duration_minutes)
      setWorkingDays(data.working_days)
      setBookingCharges(data.booking_charges || 500)
    }
  }

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: true })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive",
      })
    } else {
      setBookings(data || [])
    }
  }

  const fetchComplaints = async () => {
    const { data, error } = await supabase
      .from("complaints")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch complaints",
        variant: "destructive",
      })
    } else {
      setComplaints(data || [])
      groupComplaintsByType(data || [])
    }
  }

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("apartment_number", { ascending: true })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profiles",
        variant: "destructive",
      })
    } else {
      setProfiles(data || [])
    }
  }

  const groupComplaintsByType = (complaintsData: Complaint[]) => {
    const grouped = complaintsData.reduce(
      (acc, complaint) => {
        const key = complaint.group_key || `${complaint.category}_${complaint.subcategory}`

        if (!acc[key]) {
          acc[key] = {
            group_key: key,
            category: complaint.category,
            subcategory: complaint.subcategory,
            description: complaint.description,
            status: complaint.status,
            count: 0,
            latest_date: complaint.created_at,
            complaints: [],
          }
        }

        acc[key].complaints.push(complaint)
        acc[key].count++

        if (new Date(complaint.created_at) > new Date(acc[key].latest_date)) {
          acc[key].latest_date = complaint.created_at
          acc[key].status = complaint.status
        }

        return acc
      },
      {} as Record<string, GroupedComplaint>,
    )

    setGroupedComplaints(Object.values(grouped))
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    const { error } = await supabase
      .from("booking_settings")
      .update({
        start_time: startTime + ":00",
        end_time: endTime + ":00",
        slot_duration_minutes: slotDuration,
        working_days: workingDays,
        booking_charges: bookingCharges,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
      fetchSettings()
    }
    setSaving(false)
  }

  const addNewUser = async () => {
    if (!newUser.name || !newUser.phone_number || !newUser.apartment_number) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const { error } = await supabase.from("profiles").insert([
      {
        ...newUser,
        phone_number: newUser.phone_number.startsWith("+") ? newUser.phone_number : `+${newUser.phone_number}`,
      },
    ])

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add user: " + error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "User added successfully",
      })
      setNewUser({
        name: "",
        phone_number: "",
        cnic: "",
        apartment_number: "",
        maintenance_charges: 5000,
      })
      setIsAddUserOpen(false)
      fetchProfiles()
    }
  }

  const updateMaintenanceStatus = async (profileId: string, isPaid: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        maintenance_paid: isPaid,
        last_payment_date: isPaid ? new Date().toISOString().split("T")[0] : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update maintenance status",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Maintenance status updated successfully",
      })
      fetchProfiles()
    }
  }

  const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
    setUpdatingComplaintId(complaintId)
    try {
      const response = await fetch("/api/complaints/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId, status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to update complaint status")
      }

      toast({
        title: "Success",
        description:
          newStatus === "completed"
            ? "Complaint marked as completed and the resident has been notified."
            : "Complaint status updated successfully.",
      })
      fetchComplaints()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update complaint status",
        variant: "destructive",
      })
    } finally {
      setUpdatingComplaintId(null)
    }
  }

  const updateBookingPaymentStatus = async (bookingId: string, paymentStatus: string) => {
    setUpdatingPaymentId(bookingId)
    try {
      const response = await fetch("/api/bookings/update-payment-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, paymentStatus }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to update payment status")
      }

      toast({
        title: "Success",
        description:
          paymentStatus === "paid"
            ? "Payment marked as paid and resident has been notified with invoice link."
            : "Payment status updated successfully.",
      })
      fetchBookings()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update payment status",
        variant: "destructive",
      })
    } finally {
      setUpdatingPaymentId(null)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", bookingId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      })
      fetchBookings()
    }
  }

  const triggerBookingReminder = async () => {
    setSendingBookingReminder(true)
    try {
      const response = await fetch("/api/cron/booking-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-key": process.env.NEXT_PUBLIC_CRON_SECRET || "",
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Booking reminders sent successfully",
        })
      } else {
        throw new Error("Failed to send booking reminders")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger booking reminders",
        variant: "destructive",
      })
    } finally {
      setSendingBookingReminder(false)
    }
  }

  const triggerMaintenanceReminder = async () => {
    setSendingMaintenanceReminder(true)
    try {
      const response = await fetch("/api/cron/maintenance-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-key": process.env.NEXT_PUBLIC_CRON_SECRET || "",
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Maintenance reminders sent successfully",
        })
      } else {
        throw new Error("Failed to send maintenance reminders")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger maintenance reminders",
        variant: "destructive",
      })
    } finally {
      setSendingMaintenanceReminder(false)
    }
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Filter logic for profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const matchesSearch =
        !searchTerm ||
        profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.phone_number?.includes(searchTerm) ||
        profile.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesMaintenance =
        maintenanceFilter === "all" ||
        (maintenanceFilter === "paid" && profile.maintenance_paid) ||
        (maintenanceFilter === "unpaid" && !profile.maintenance_paid)

      return matchesSearch && matchesMaintenance
    })
  }, [profiles, searchTerm, maintenanceFilter])

  // Filter logic for bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        !searchTerm ||
        booking.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.profiles?.phone_number?.includes(searchTerm) ||
        formatDateForDisplay(booking.booking_date).includes(searchTerm)

      const matchesDate = !dateFilter || booking.booking_date === dateFilter
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter

      return matchesSearch && matchesDate && matchesStatus
    })
  }, [bookings, searchTerm, dateFilter, statusFilter])

  // Filter logic for complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const matchesSearch =
        !searchTerm ||
        complaint.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.profiles?.phone_number?.includes(searchTerm) ||
        complaint.complaint_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.subcategory.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = complaintStatusFilter === "all" || complaint.status === complaintStatusFilter

      return matchesSearch && matchesStatus
    })
  }, [complaints, searchTerm, complaintStatusFilter])

  const residentsDisplay = useMemo(
    () => filterByPeriod(filteredProfiles, residentsPeriod, (p) => p.created_at),
    [filteredProfiles, residentsPeriod],
  )
  const bookingsDisplay = useMemo(
    () => filterByPeriod(filteredBookings, bookingsPeriod, (b) => b.booking_date),
    [filteredBookings, bookingsPeriod],
  )
  const complaintsDisplay = useMemo(
    () => filterByPeriod(filteredComplaints, complaintsPeriod, (c) => c.created_at),
    [filteredComplaints, complaintsPeriod],
  )

  const stats = useMemo(() => {
    const totalBookings = bookings.filter((b) => b.status === "confirmed").length
    const todayBookings = bookings.filter(
      (b) => b.booking_date === new Date().toISOString().split("T")[0] && b.status === "confirmed",
    ).length
    const pendingComplaints = complaints.filter((c) => c.status === "pending").length
    const unpaidMaintenance = profiles.filter((p) => !p.maintenance_paid).length
    const pendingPayments = bookings.filter((b) => b.payment_status === "pending").length
    const totalRevenue = bookings
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + b.booking_charges, 0)

    return { totalBookings, todayBookings, pendingComplaints, unpaidMaintenance, pendingPayments, totalRevenue }
  }, [bookings, complaints, profiles])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
      case "completed":
      case "paid":
        return "default"
      case "pending":
      case "unpaid":
        return "secondary"
      case "in-progress":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const editUser = async () => {
    if (!editingUser || !editingUser.name || !editingUser.phone_number || !editingUser.apartment_number) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: editingUser.name,
        phone_number: editingUser.phone_number.startsWith("+")
          ? editingUser.phone_number
          : `+${editingUser.phone_number}`,
        cnic: editingUser.cnic,
        apartment_number: editingUser.apartment_number,
        maintenance_charges: editingUser.maintenance_charges,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingUser.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user: " + error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "User updated successfully",
      })
      setEditingUser(null)
      setIsEditUserOpen(false)
      fetchProfiles()
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return
    }

    const { error } = await supabase.from("profiles").delete().eq("id", userId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete user: " + error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      fetchProfiles()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-xl border-0 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Community Management
                </h1>
                <p className="text-gray-600 text-lg mt-1">Professional Dashboard for Residential Management</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={triggerBookingReminder}
                disabled={sendingBookingReminder}
                variant="outline"
                className="gap-2 bg-white hover:bg-green-50 border-2 border-green-200 shadow-md hover:shadow-lg transition-all duration-200"
              >
                {sendingBookingReminder ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Booking Reminder(only for testing)</span>
                  </>
                )}
              </Button>

              <Button
                onClick={triggerMaintenanceReminder}
                disabled={sendingMaintenanceReminder}
                variant="outline"
                className="gap-2 bg-white hover:bg-orange-50 border-2 border-orange-200 shadow-md hover:shadow-lg transition-all duration-200"
              >
                {sendingMaintenanceReminder ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-600">Maintenance Reminder(only for testing)</span>
                  </>
                )}
              </Button>

              <Button
                onClick={refreshData}
                variant="outline"
                disabled={refreshing}
                className="gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Residents</CardTitle>
              <Users className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profiles.length}</div>
              <p className="text-xs text-blue-200 mt-1">Active community members</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Active Bookings</CardTitle>
              <Calendar className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-green-200 mt-1">Confirmed reservations</p>
            </CardContent>
          </Card>

          {/* <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Pending Issues</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingComplaints}</div>
              <p className="text-xs text-orange-200 mt-1">Awaiting resolution</p>
            </CardContent>
          </Card> */}

          {/* <Card className="border-0 shadow-xl bg-gradient-to-br from-red-500 to-red-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-100">Unpaid Maintenance</CardTitle>
              <CreditCard className="h-5 w-5 text-red-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.unpaidMaintenance}</div>
              <p className="text-xs text-red-200 mt-1">Outstanding payments</p>
            </CardContent>
          </Card> */}

          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Pending Payments</CardTitle>
              <Clock className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingPayments}</div>
              <p className="text-xs text-purple-200 mt-1">Booking payments due</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Today&apos;s Bookings</CardTitle>
              <Calendar className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayBookings}</div>
              <p className="text-xs text-blue-200 mt-1">Confirmed for today</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <Tabs defaultValue="residents" className="w-full">
            <div className="border-b border-gray-100 bg-gray-50/50">
              <TabsList className="grid w-full grid-cols-5 bg-transparent h-16 p-2">
                <TabsTrigger
                  value="residents"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-blue-600 transition-all duration-200"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Residents
                </TabsTrigger>
                <TabsTrigger
                  value="bookings"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-green-600 transition-all duration-200"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger
                  value="complaints"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-orange-600 transition-all duration-200"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Complaints
                </TabsTrigger>
                <TabsTrigger
                  value="grouped-complaints"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-purple-600 transition-all duration-200"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-gray-800 transition-all duration-200"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Residents Tab */}
            <TabsContent value="residents" className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Users className="h-6 w-6 text-blue-600" />
                      Residents Management
                    </h2>
                    <p className="text-gray-600 mt-1">Manage community residents and their information</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search residents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                      <SelectTrigger className="w-full sm:w-40 border-gray-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Select
  value={residentsPeriod}
  onValueChange={(value) => setResidentsPeriod(value as Period)}
>
                        <SelectTrigger className="w-full sm:w-40 border-gray-200">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="daily">Today</SelectItem>
                          <SelectItem value="weekly">This Week</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                          <SelectItem value="yearly">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          void exportToPdf({
                            title: "Residents Report",
                            periodLabel: periodLabel(residentsPeriod),
                            columns: [
                              { header: "Name", dataKey: "name" },
                              { header: "Phone", dataKey: "phone" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Maintenance (Rs)", dataKey: "maintenance" },
                              { header: "Status", dataKey: "status" },
                            ],
                            rows: residentsDisplay.map((p) => ({
                              name: p.name || "N/A",
                              phone: p.phone_number || "N/A",
                              apartment: p.apartment_number || "N/A",
                              maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
                              status: p.maintenance_paid ? "Paid" : "Unpaid",
                            })),
                            filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
                            fileName: `residents-${residentsPeriod}-filtered.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                        Download PDF (filtered)
                      </Button>
                      <Button
                        onClick={() => {
                          const allResidents = filterByPeriod(profiles, residentsPeriod, (p) => p.created_at)
                          void exportToPdf({
                            title: "Residents Report",
                            periodLabel: periodLabel(residentsPeriod),
                            columns: [
                              { header: "Name", dataKey: "name" },
                              { header: "Phone", dataKey: "phone" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Maintenance (Rs)", dataKey: "maintenance" },
                              { header: "Status", dataKey: "status" },
                            ],
                            rows: allResidents.map((p) => ({
                              name: p.name || "N/A",
                              phone: p.phone_number || "N/A",
                              apartment: p.apartment_number || "N/A",
                              maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
                              status: p.maintenance_paid ? "Paid" : "Unpaid",
                            })),
                            fileName: `residents-${residentsPeriod}-all.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        Download PDF (all)
                      </Button>
                    </div>

                    <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200">
                          <UserPlus className="h-4 w-4" />
                          Add Resident
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-semibold">Add New Resident</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right font-medium">
                              Name *
                            </Label>
                            <Input
                              id="name"
                              value={newUser.name}
                              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                              className="col-span-3"
                              placeholder="Enter full name"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right font-medium">
                              Phone *
                            </Label>
                            <Input
                              id="phone"
                              value={newUser.phone_number}
                              onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                              className="col-span-3"
                              placeholder="+1234567890"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="apartment" className="text-right font-medium">
                              Apartment *
                            </Label>
                            <Input
                              id="apartment"
                              value={newUser.apartment_number}
                              onChange={(e) => setNewUser({ ...newUser, apartment_number: e.target.value })}
                              className="col-span-3"
                              placeholder="A-101"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cnic" className="text-right font-medium">
                              CNIC
                            </Label>
                            <Input
                              id="cnic"
                              value={newUser.cnic}
                              onChange={(e) => setNewUser({ ...newUser, cnic: e.target.value })}
                              className="col-span-3"
                              placeholder="12345-6789012-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="maintenance" className="text-right font-medium">
                              Maintenance
                            </Label>
                            <Input
                              id="maintenance"
                              type="number"
                              value={newUser.maintenance_charges}
                              onChange={(e) => setNewUser({ ...newUser, maintenance_charges: Number(e.target.value) })}
                              className="col-span-3"
                              placeholder="5000"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={addNewUser} className="bg-blue-600 hover:bg-blue-700">
                            Add Resident
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">Phone</TableHead>
                        <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
                        <TableHead className="font-semibold text-gray-700">Maintenance</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {residentsDisplay.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg font-medium">
                              {profiles.length === 0 ? "No residents yet" : "No residents match your filters"}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              {profiles.length === 0
                                ? "Add your first resident to get started"
                                : "Try adjusting your search criteria or period"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        residentsDisplay.map((profile) => (
                          <TableRow key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium text-gray-900">{profile.name}</TableCell>
                            <TableCell className="text-gray-600">{profile.phone_number}</TableCell>
                            <TableCell className="text-gray-600">{profile.apartment_number}</TableCell>
                            <TableCell className="text-gray-600">
                              Rs. {profile.maintenance_charges.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={profile.maintenance_paid ? "default" : "destructive"}
                                className={
                                  profile.maintenance_paid ? "bg-green-100 text-green-800 hover:bg-green-200" : ""
                                }
                              >
                                {profile.maintenance_paid ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Unpaid
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Link href={`/admin/residents/${profile.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="hover:bg-blue-50 hover:border-blue-200 bg-transparent"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Open Profile
                                  </Button>
                                </Link>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(profile)
                                    setIsEditUserOpen(true)
                                  }}
                                  className="hover:bg-blue-50 hover:border-blue-200 text-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateMaintenanceStatus(profile.id, !profile.maintenance_paid)}
                                  className={
                                    profile.maintenance_paid
                                      ? "hover:bg-red-50 hover:border-red-200 text-red-600"
                                      : "hover:bg-green-50 hover:border-green-200 text-green-600"
                                  }
                                >
                                  {profile.maintenance_paid ? (
                                    <>
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Mark Unpaid
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Mark Paid
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteUser(profile.id, profile.name)}
                                  className="hover:bg-red-50 hover:border-red-200 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-green-600" />
                      Bookings Management
                    </h2>
                    <p className="text-gray-600 mt-1">Track and manage community hall bookings</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search bookings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64 border-gray-200 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>

                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full sm:w-auto border-gray-200"
                    />

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40 border-gray-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Select
  value={bookingsPeriod}
  onValueChange={(value) => setBookingsPeriod(value as Period)}
>
                        <SelectTrigger className="w-full sm:w-40 border-gray-200">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="daily">Today</SelectItem>
                          <SelectItem value="weekly">This Week</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                          <SelectItem value="yearly">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          void exportToPdf({
                            title: "Bookings Report",
                            periodLabel: periodLabel(bookingsPeriod),
                            columns: [
                              { header: "Customer", dataKey: "customer" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Date", dataKey: "date" },
                              { header: "Time", dataKey: "time" },
                              { header: "Amount", dataKey: "amount" },
                              { header: "Payment", dataKey: "payment" },
                              { header: "Status", dataKey: "status" },
                            ],
                            rows: bookingsDisplay.map((b) => ({
                              customer: b.profiles?.name || "N/A",
                              apartment: b.profiles?.apartment_number || "",
                              date: formatDateForDisplay(b.booking_date),
                              time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
                              amount: `Rs. ${b.booking_charges.toLocaleString()}`,
                              payment: b.payment_status,
                              status: b.status,
                            })),
                            filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
                            fileName: `bookings-${bookingsPeriod}-filtered.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
                      >
                        <Eye className="h-4 w-4" />
                        Download PDF (filtered)
                      </Button>
                      <Button
                        onClick={() => {
                          const allBookings = filterByPeriod(bookings, bookingsPeriod, (b) => b.booking_date)
                          void exportToPdf({
                            title: "Bookings Report",
                            periodLabel: periodLabel(bookingsPeriod),
                            columns: [
                              { header: "Customer", dataKey: "customer" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Date", dataKey: "date" },
                              { header: "Time", dataKey: "time" },
                              { header: "Amount", dataKey: "amount" },
                              { header: "Payment", dataKey: "payment" },
                              { header: "Status", dataKey: "status" },
                            ],
                            rows: allBookings.map((b) => ({
                              customer: b.profiles?.name || "N/A",
                              apartment: b.profiles?.apartment_number || "",
                              date: formatDateForDisplay(b.booking_date),
                              time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
                              amount: `Rs. ${b.booking_charges.toLocaleString()}`,
                              payment: b.payment_status,
                              status: b.status,
                            })),
                            fileName: `bookings-${bookingsPeriod}-all.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        Download PDF (all)
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                        <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
                        <TableHead className="font-semibold text-gray-700">Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Time Slot</TableHead>
                        <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                        <TableHead className="font-semibold text-gray-700">Payment</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingsDisplay.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg font-medium">
                              {bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              {bookings.length === 0
                                ? "Bookings will appear here once residents start booking"
                                : "Try adjusting your search, status, or period filters"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        bookingsDisplay.map((booking) => (
                          <TableRow key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium text-gray-900">
                              {booking.profiles?.name || "N/A"}
                            </TableCell>
                            <TableCell className="text-gray-600">{booking.profiles?.apartment_number}</TableCell>
                            <TableCell className="text-gray-600">
                              {formatDateForDisplay(booking.booking_date)}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              Rs. {booking.booking_charges.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(booking.payment_status)}
                                className={
                                  booking.payment_status === "paid"
                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                    : ""
                                }
                              >
                                {booking.payment_status === "paid" ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(booking.status)}>
                                {booking.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {booking.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {booking.payment_status === "pending" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateBookingPaymentStatus(booking.id, "paid")}
                                    disabled={updatingPaymentId === booking.id}
                                    className="hover:bg-green-50 hover:border-green-200 text-green-600"
                                  >
                                    {updatingPaymentId === booking.id ? (
                                      <>
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-1" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Mark Paid
                                      </>
                                    )}
                                  </Button>
                                ) : booking.payment_status === "paid" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateBookingPaymentStatus(booking.id, "pending")}
                                    disabled={updatingPaymentId === booking.id}
                                    className="hover:bg-red-50 hover:border-red-200 text-red-600"
                                  >
                                    {updatingPaymentId === booking.id ? (
                                      <>
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-1" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Mark Unpaid
                                      </>
                                    )}
                                  </Button>
                                ) : null}

                                {booking.status === "confirmed" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => cancelBooking(booking.id)}
                                    className="hover:bg-red-50 hover:border-red-200 text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Complaints Tab */}
            <TabsContent value="complaints" className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="h-6 w-6 text-orange-600" />
                      Individual Complaints
                    </h2>
                    <p className="text-gray-600 mt-1">Track and resolve resident complaints</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search complaints..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>

                    <Select value={complaintStatusFilter} onValueChange={setComplaintStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40 border-gray-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Select
                       value={complaintsPeriod}
                         onValueChange={(value) => setComplaintsPeriod(value as Period)}>
                        <SelectTrigger className="w-full sm:w-40 border-gray-200">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="daily">Today</SelectItem>
                          <SelectItem value="weekly">This Week</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                          <SelectItem value="yearly">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          void exportToPdf({
                            title: "Complaints Report",
                            periodLabel: periodLabel(complaintsPeriod),
                            columns: [
                              { header: "Complaint ID", dataKey: "complaintId" },
                              { header: "Customer", dataKey: "customer" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Category", dataKey: "category" },
                              { header: "Type", dataKey: "type" },
                              { header: "Status", dataKey: "status" },
                              { header: "Created", dataKey: "created" },
                            ],
                            rows: complaintsDisplay.map((c) => ({
                              complaintId: c.complaint_id,
                              customer: c.profiles?.name || "N/A",
                              apartment: c.profiles?.apartment_number || "",
                              category: c.category,
                              type: c.subcategory,
                              status: c.status,
                              created: formatDateTime(c.created_at),
                            })),
                            filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
                            fileName: `complaints-${complaintsPeriod}-filtered.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Eye className="h-4 w-4" />
                        Download PDF (filtered)
                      </Button>
                      <Button
                        onClick={() => {
                          const allComplaints = filterByPeriod(complaints, complaintsPeriod, (c) => c.created_at)
                          void exportToPdf({
                            title: "Complaints Report",
                            periodLabel: periodLabel(complaintsPeriod),
                            columns: [
                              { header: "Complaint ID", dataKey: "complaintId" },
                              { header: "Customer", dataKey: "customer" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Category", dataKey: "category" },
                              { header: "Type", dataKey: "type" },
                              { header: "Status", dataKey: "status" },
                              { header: "Created", dataKey: "created" },
                            ],
                            rows: allComplaints.map((c) => ({
                              complaintId: c.complaint_id,
                              customer: c.profiles?.name || "N/A",
                              apartment: c.profiles?.apartment_number || "",
                              category: c.category,
                              type: c.subcategory,
                              status: c.status,
                              created: formatDateTime(c.created_at),
                            })),
                            fileName: `complaints-${complaintsPeriod}-all.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        Download PDF (all)
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-semibold text-gray-700">Complaint ID</TableHead>
                        <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                        <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
                        <TableHead className="font-semibold text-gray-700">Category</TableHead>
                        <TableHead className="font-semibold text-gray-700">Type</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Created</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complaintsDisplay.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg font-medium">
                              {complaints.length === 0 ? "No complaints yet" : "No complaints match your filters"}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              {complaints.length === 0
                                ? "Complaints will appear here when residents report issues"
                                : "Try adjusting your search, status, or period filters"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        complaintsDisplay.map((complaint) => (
                          <TableRow key={complaint.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium text-gray-900">{complaint.complaint_id}</TableCell>
                            <TableCell className="text-gray-600">{complaint.profiles?.name || "N/A"}</TableCell>
                            <TableCell className="text-gray-600">{complaint.profiles?.apartment_number}</TableCell>
                            <TableCell className="text-gray-600 capitalize">{complaint.category}</TableCell>
                            <TableCell className="text-gray-600 capitalize">{complaint.subcategory}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(complaint.status)}>
                                {complaint.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {complaint.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                {complaint.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                                {complaint.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">{formatDateTime(complaint.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedComplaint(complaint)}
                                      className="hover:bg-orange-50 hover:border-orange-200"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                      <DialogTitle className="text-xl font-semibold">Complaint Details</DialogTitle>
                                    </DialogHeader>
                                    {selectedComplaint && (
                                      <div className="grid gap-6 py-4">
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Complaint ID</Label>
                                            <p className="text-gray-900 font-medium">
                                              {selectedComplaint.complaint_id}
                                            </p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Status</Label>
                                            <Badge variant={getStatusBadgeVariant(selectedComplaint.status)}>
                                              {selectedComplaint.status}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Customer</Label>
                                            <p className="text-gray-900">{selectedComplaint.profiles?.name}</p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Apartment</Label>
                                            <p className="text-gray-900">
                                              {selectedComplaint.profiles?.apartment_number}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Category</Label>
                                            <p className="text-gray-900 capitalize">{selectedComplaint.category}</p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Type</Label>
                                            <p className="text-gray-900 capitalize">{selectedComplaint.subcategory}</p>
                                          </div>
                                        </div>
                                        {selectedComplaint.description && (
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Description</Label>
                                            <div className="p-4 bg-gray-50 rounded-lg border">
                                              <p className="text-gray-900">{selectedComplaint.description}</p>
                                            </div>
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Created</Label>
                                            <p className="text-gray-900">
                                              {formatDateTime(selectedComplaint.created_at)}
                                            </p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
                                            <p className="text-gray-900">
                                              {formatDateTime(selectedComplaint.updated_at)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                {complaint.status !== "completed" && complaint.status !== "cancelled" && (
                                  <Select
                                    value={complaint.status}
                                    onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
                                    disabled={updatingComplaintId === complaint.id}
                                  >
                                    <SelectTrigger className="w-32">
                                      {updatingComplaintId === complaint.id ? (
                                        <div className="flex items-center gap-2">
                                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                                          <span className="text-xs">Updating...</span>
                                        </div>
                                      ) : (
                                        <SelectValue />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="in-progress">In Progress</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Grouped Complaints Tab */}
            <TabsContent value="grouped-complaints" className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                    Complaint Analytics
                  </h2>
                  <p className="text-gray-600 mt-1">View grouped complaints and identify common issues</p>
                </div>

                <div className="grid gap-6">
                  {groupedComplaints.length === 0 ? (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No complaints to analyze</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Complaint analytics will appear here when residents report issues
                      </p>
                    </div>
                  ) : (
                    groupedComplaints.map((group) => (
                      <Card key={group.group_key} className="border-0 shadow-lg overflow-hidden">
                        <div className="border-l-4 border-l-purple-500">
                          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-xl capitalize text-gray-900">
                                  {group.category} - {group.subcategory}
                                </CardTitle>
                                <p className="text-gray-600 mt-1">
                                  {group.count} resident{group.count > 1 ? "s" : ""} reported this issue
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={getStatusBadgeVariant(group.status)} className="text-sm">
                                  {group.status}
                                </Badge>
                                <Badge variant="outline" className="text-sm bg-white">
                                  {group.count} complaints
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <Label className="text-sm font-medium text-gray-700">Affected Residents:</Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.complaints.map((complaint) => (
                                  <div
                                    key={complaint.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                                  >
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {complaint.profiles?.name} ({complaint.profiles?.apartment_number})
                                      </p>
                                      <p className="text-xs text-gray-500">{formatDateTime(complaint.created_at)}</p>
                                      {complaint.description && (
                                        <div className="flex items-center space-x-2 mt-1">
                                          <p className="text-xs text-gray-600">Description:</p>
                                          <p className="text-xs text-gray-700">{complaint.description}</p>
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant={getStatusBadgeVariant(complaint.status)} className="text-xs">
                                      {complaint.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="mt-6 flex gap-3">
                              <Select
                                value={group.status}
                                onValueChange={(value) => {
                                  group.complaints.forEach((complaint) => {
                                    updateComplaintStatus(complaint.id, value)
                                  })
                                }}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Mark All Pending</SelectItem>
                                  <SelectItem value="in-progress">Mark All In Progress</SelectItem>
                                  <SelectItem value="completed">Mark All Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="p-6">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-gray-700" />
                    System Settings
                  </h2>
                  <p className="text-gray-600 mt-1">Configure booking settings</p>
                </div>

                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Settings className="h-5 w-5 text-blue-600" />
                      Booking Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Start Time</Label>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">End Time</Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Slot Duration</Label>
                      <Select
                        value={slotDuration.toString()}
                        onValueChange={(value) => setSlotDuration(Number.parseInt(value))}
                      >
                        <SelectTrigger className="border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Booking Charges (Rs.)</Label>
                      <Input
                        type="number"
                        value={bookingCharges}
                        onChange={(e) => setBookingCharges(Number.parseInt(e.target.value) || 0)}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                        step="100"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Working Days</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 1, label: "Monday" },
                          { value: 2, label: "Tuesday" },
                          { value: 3, label: "Wednesday" },
                          { value: 4, label: "Thursday" },
                          { value: 5, label: "Friday" },
                          { value: 6, label: "Saturday" },
                          { value: 7, label: "Sunday" },
                        ].map((day) => (
                          <div key={day.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                            <input
                              type="checkbox"
                              id={`day-${day.value}`}
                              checked={workingDays.includes(day.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWorkingDays([...workingDays, day.value])
                                } else {
                                  setWorkingDays(workingDays.filter((d) => d !== day.value))
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`day-${day.value}`} className="text-sm font-medium text-gray-700">
                              {day.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={saveSettings}
                      disabled={saving}
                      className="w-full gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {saving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Edit Resident</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right font-medium">
                    Name *
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-phone" className="text-right font-medium">
                    Phone *
                  </Label>
                  <Input
                    id="edit-phone"
                    value={editingUser.phone_number}
                    onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                    className="col-span-3"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-apartment" className="text-right font-medium">
                    Apartment *
                  </Label>
                  <Input
                    id="edit-apartment"
                    value={editingUser.apartment_number}
                    onChange={(e) => setEditingUser({ ...editingUser, apartment_number: e.target.value })}
                    className="col-span-3"
                    placeholder="A-101"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-cnic" className="text-right font-medium">
                    CNIC
                  </Label>
                  <Input
                    id="edit-cnic"
                    value={editingUser.cnic || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, cnic: e.target.value })}
                    className="col-span-3"
                    placeholder="12345-6789012-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-maintenance" className="text-right font-medium">
                    Maintenance
                  </Label>
                  <Input
                    id="edit-maintenance"
                    type="number"
                    value={editingUser.maintenance_charges}
                    onChange={(e) => setEditingUser({ ...editingUser, maintenance_charges: Number(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editUser} className="bg-blue-600 hover:bg-blue-700">
                Update Resident
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}



// "use client"

// import { useState, useEffect, useMemo } from "react"
// import {
//   supabase,
//   type BookingSettings,
//   type Booking,
//   type Complaint,
//   type Profile,
//   type GroupedComplaint,
// } from "@/lib/supabase"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import {
//   Calendar,
//   Users,
//   Settings,
//   X,
//   RefreshCw,
//   AlertTriangle,
//   MessageSquare,
//   Eye,
//   CreditCard,
//   UserPlus,
//   Building2,
//   Clock,
//   CheckCircle,
//   XCircle,
//   Edit,
//   Trash2,
//   Search,
//   Filter,
//   BarChart3,
// } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Skeleton } from "@/components/ui/skeleton"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"
// import { formatDateForDisplay } from "@/lib/time-utils"
// import Link from "next/link"
// import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"

// export default function AdminPanel() {
//   const [settings, setSettings] = useState<BookingSettings | null>(null)
//   const [bookings, setBookings] = useState<Booking[]>([])
//   const [complaints, setComplaints] = useState<Complaint[]>([])
//   const [profiles, setProfiles] = useState<Profile[]>([])
//   const [groupedComplaints, setGroupedComplaints] = useState<GroupedComplaint[]>([])
//   const [loading, setLoading] = useState(true)
//   const [saving, setSaving] = useState(false)
//   const [refreshing, setRefreshing] = useState(false)
//   const [searchTerm, setSearchTerm] = useState("")
//   const [dateFilter, setDateFilter] = useState("")
//   const [statusFilter, setStatusFilter] = useState("all")
//   const [complaintStatusFilter, setComplaintStatusFilter] = useState("all")
//   const [maintenanceFilter, setMaintenanceFilter] = useState("all")
//   const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
//   const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
//   const [isAddUserOpen, setIsAddUserOpen] = useState(false)
//   const [isEditUserOpen, setIsEditUserOpen] = useState(false)
//   const [editingUser, setEditingUser] = useState<Profile | null>(null)

//   // Settings form state
//   const [startTime, setStartTime] = useState("09:00")
//   const [endTime, setEndTime] = useState("17:00")
//   const [slotDuration, setSlotDuration] = useState(60)
//   const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
//   const [bookingCharges, setBookingCharges] = useState(500)

//   // New user form state
//   const [newUser, setNewUser] = useState({
//     name: "",
//     phone_number: "",
//     cnic: "",
//     apartment_number: "",
//     maintenance_charges: 5000,
//   })

//   // PDF export state
//   const [residentsPeriod, setResidentsPeriod] = useState<Period>("all")
//   const [bookingsPeriod, setBookingsPeriod] = useState<Period>("all")
//   const [complaintsPeriod, setComplaintsPeriod] = useState<Period>("all")

//   const { toast } = useToast()

//   useEffect(() => {
//     fetchData()
//   }, [])

//   const fetchData = async () => {
//     setLoading(true)
//     await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles()])
//     setLoading(false)
//   }

//   const refreshData = async () => {
//     setRefreshing(true)
//     await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles()])
//     setRefreshing(false)
//     toast({
//       title: "Data Refreshed",
//       description: "All data has been updated successfully",
//     })
//   }

//   const fetchSettings = async () => {
//     const { data, error } = await supabase.from("booking_settings").select("*").single()

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch booking settings",
//         variant: "destructive",
//       })
//     } else {
//       setSettings(data)
//       setStartTime(data.start_time.substring(0, 5))
//       setEndTime(data.end_time.substring(0, 5))
//       setSlotDuration(data.slot_duration_minutes)
//       setWorkingDays(data.working_days)
//       setBookingCharges(data.booking_charges || 500)
//     }
//   }

//   const fetchBookings = async () => {
//     const { data, error } = await supabase
//       .from("bookings")
//       .select(
//         `
//         *,
//         profiles (name, phone_number, apartment_number)
//       `,
//       )
//       .order("booking_date", { ascending: false })
//       .order("start_time", { ascending: true })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch bookings",
//         variant: "destructive",
//       })
//     } else {
//       setBookings(data || [])
//     }
//   }

//   const fetchComplaints = async () => {
//     const { data, error } = await supabase
//       .from("complaints")
//       .select(
//         `
//         *,
//         profiles (name, phone_number, apartment_number)
//       `,
//       )
//       .order("created_at", { ascending: false })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch complaints",
//         variant: "destructive",
//       })
//     } else {
//       setComplaints(data || [])
//       groupComplaintsByType(data || [])
//     }
//   }

//   const fetchProfiles = async () => {
//     const { data, error } = await supabase.from("profiles").select("*").order("apartment_number", { ascending: true })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch profiles",
//         variant: "destructive",
//       })
//     } else {
//       setProfiles(data || [])
//     }
//   }

//   const groupComplaintsByType = (complaintsData: Complaint[]) => {
//     const grouped = complaintsData.reduce(
//       (acc, complaint) => {
//         const key = complaint.group_key || `${complaint.category}_${complaint.subcategory}`

//         if (!acc[key]) {
//           acc[key] = {
//             group_key: key,
//             category: complaint.category,
//             subcategory: complaint.subcategory,
//             description: complaint.description,
//             status: complaint.status,
//             count: 0,
//             latest_date: complaint.created_at,
//             complaints: [],
//           }
//         }

//         acc[key].complaints.push(complaint)
//         acc[key].count++

//         if (new Date(complaint.created_at) > new Date(acc[key].latest_date)) {
//           acc[key].latest_date = complaint.created_at
//           acc[key].status = complaint.status
//         }

//         return acc
//       },
//       {} as Record<string, GroupedComplaint>,
//     )

//     setGroupedComplaints(Object.values(grouped))
//   }

//   const saveSettings = async () => {
//     if (!settings) return

//     setSaving(true)
//     const { error } = await supabase
//       .from("booking_settings")
//       .update({
//         start_time: startTime + ":00",
//         end_time: endTime + ":00",
//         slot_duration_minutes: slotDuration,
//         working_days: workingDays,
//         booking_charges: bookingCharges,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", settings.id)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to save settings",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Settings saved successfully",
//       })
//       fetchSettings()
//     }
//     setSaving(false)
//   }

//   const addNewUser = async () => {
//     if (!newUser.name || !newUser.phone_number || !newUser.apartment_number) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       })
//       return
//     }

//     const { error } = await supabase.from("profiles").insert([
//       {
//         ...newUser,
//         phone_number: newUser.phone_number.startsWith("+") ? newUser.phone_number : `+${newUser.phone_number}`,
//       },
//     ])

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to add user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User added successfully",
//       })
//       setNewUser({
//         name: "",
//         phone_number: "",
//         cnic: "",
//         apartment_number: "",
//         maintenance_charges: 5000,
//       })
//       setIsAddUserOpen(false)
//       fetchProfiles()
//     }
//   }

//   const updateMaintenanceStatus = async (profileId: string, isPaid: boolean) => {
//     const { error } = await supabase
//       .from("profiles")
//       .update({
//         maintenance_paid: isPaid,
//         last_payment_date: isPaid ? new Date().toISOString().split("T")[0] : null,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", profileId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to update maintenance status",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Maintenance status updated successfully",
//       })
//       fetchProfiles()
//     }
//   }

//   const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
//     try {
//       const response = await fetch("/api/complaints/update-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ complaintId, status: newStatus }),
//       })

//       if (!response.ok) {
//         const data = await response.json().catch(() => ({}))
//         throw new Error(typeof data?.error === "string" ? data.error : "Failed to update complaint status")
//       }

//       toast({
//         title: "Success",
//         description:
//           newStatus === "completed"
//             ? "Complaint marked as completed and the resident has been notified."
//             : "Complaint status updated successfully.",
//       })
//       fetchComplaints()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error?.message || "Failed to update complaint status",
//         variant: "destructive",
//       })
//     }
//   }

//   const updateBookingPaymentStatus = async (bookingId: string, paymentStatus: string) => {
//     try {
//       const response = await fetch("/api/bookings/update-payment-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ bookingId, paymentStatus }),
//       })

//       if (!response.ok) {
//         const data = await response.json().catch(() => ({}))
//         throw new Error(typeof data?.error === "string" ? data.error : "Failed to update payment status")
//       }

//       toast({
//         title: "Success",
//         description:
//           paymentStatus === "paid"
//             ? "Payment marked as paid and resident has been notified."
//             : "Payment status updated successfully.",
//       })
//       fetchBookings()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error?.message || "Failed to update payment status",
//         variant: "destructive",
//       })
//     }
//   }

//   const cancelBooking = async (bookingId: string) => {
//     const { error } = await supabase.from("bookings").delete().eq("id", bookingId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to cancel booking",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Booking cancelled successfully",
//       })
//       fetchBookings()
//     }
//   }

//   const formatTime = (timeString: string) => {
//     const [hours, minutes] = timeString.split(":")
//     const hour = Number.parseInt(hours)
//     const ampm = hour >= 12 ? "PM" : "AM"
//     const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
//     return `${displayHour}:${minutes} ${ampm}`
//   }

//   const formatDateTime = (dateString: string) => {
//     return new Date(dateString).toLocaleString("en-GB", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     })
//   }

//   // Filter logic for profiles
//   const filteredProfiles = useMemo(() => {
//     return profiles.filter((profile) => {
//       const matchesSearch =
//         !searchTerm ||
//         profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         profile.phone_number?.includes(searchTerm) ||
//         profile.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())

//       const matchesMaintenance =
//         maintenanceFilter === "all" ||
//         (maintenanceFilter === "paid" && profile.maintenance_paid) ||
//         (maintenanceFilter === "unpaid" && !profile.maintenance_paid)

//       return matchesSearch && matchesMaintenance
//     })
//   }, [profiles, searchTerm, maintenanceFilter])

//   // Filter logic for bookings
//   const filteredBookings = useMemo(() => {
//     return bookings.filter((booking) => {
//       const matchesSearch =
//         !searchTerm ||
//         booking.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         booking.profiles?.phone_number?.includes(searchTerm) ||
//         formatDateForDisplay(booking.booking_date).includes(searchTerm)

//       const matchesDate = !dateFilter || booking.booking_date === dateFilter
//       const matchesStatus = statusFilter === "all" || booking.status === statusFilter

//       return matchesSearch && matchesDate && matchesStatus
//     })
//   }, [bookings, searchTerm, dateFilter, statusFilter])

//   // Filter logic for complaints
//   const filteredComplaints = useMemo(() => {
//     return complaints.filter((complaint) => {
//       const matchesSearch =
//         !searchTerm ||
//         complaint.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         complaint.profiles?.phone_number?.includes(searchTerm) ||
//         complaint.complaint_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         complaint.subcategory.toLowerCase().includes(searchTerm.toLowerCase())

//       const matchesStatus = complaintStatusFilter === "all" || complaint.status === complaintStatusFilter

//       return matchesSearch && matchesStatus
//     })
//   }, [complaints, searchTerm, complaintStatusFilter])

//   const residentsDisplay = useMemo(
//     () => filterByPeriod(filteredProfiles, residentsPeriod, (p) => p.created_at),
//     [filteredProfiles, residentsPeriod],
//   )
//   const bookingsDisplay = useMemo(
//     () => filterByPeriod(filteredBookings, bookingsPeriod, (b) => b.booking_date),
//     [filteredBookings, bookingsPeriod],
//   )
//   const complaintsDisplay = useMemo(
//     () => filterByPeriod(filteredComplaints, complaintsPeriod, (c) => c.created_at),
//     [filteredComplaints, complaintsPeriod],
//   )

//   const stats = useMemo(() => {
//     const totalBookings = bookings.filter((b) => b.status === "confirmed").length
//     const todayBookings = bookings.filter(
//       (b) => b.booking_date === new Date().toISOString().split("T")[0] && b.status === "confirmed",
//     ).length
//     const pendingComplaints = complaints.filter((c) => c.status === "pending").length
//     const unpaidMaintenance = profiles.filter((p) => !p.maintenance_paid).length
//     const pendingPayments = bookings.filter((b) => b.payment_status === "pending").length
//     const totalRevenue = bookings
//       .filter((b) => b.payment_status === "paid")
//       .reduce((sum, b) => sum + b.booking_charges, 0)

//     return { totalBookings, todayBookings, pendingComplaints, unpaidMaintenance, pendingPayments, totalRevenue }
//   }, [bookings, complaints, profiles])

//   const getStatusBadgeVariant = (status: string) => {
//     switch (status) {
//       case "confirmed":
//       case "completed":
//       case "paid":
//         return "default"
//       case "pending":
//       case "unpaid":
//         return "secondary"
//       case "in-progress":
//         return "outline"
//       case "cancelled":
//         return "destructive"
//       default:
//         return "secondary"
//     }
//   }

//   const editUser = async () => {
//     if (!editingUser || !editingUser.name || !editingUser.phone_number || !editingUser.apartment_number) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       })
//       return
//     }

//     const { error } = await supabase
//       .from("profiles")
//       .update({
//         name: editingUser.name,
//         phone_number: editingUser.phone_number.startsWith("+")
//           ? editingUser.phone_number
//           : `+${editingUser.phone_number}`,
//         cnic: editingUser.cnic,
//         apartment_number: editingUser.apartment_number,
//         maintenance_charges: editingUser.maintenance_charges,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", editingUser.id)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to update user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User updated successfully",
//       })
//       setEditingUser(null)
//       setIsEditUserOpen(false)
//       fetchProfiles()
//     }
//   }

//   const deleteUser = async (userId: string, userName: string) => {
//     if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
//       return
//     }

//     const { error } = await supabase.from("profiles").delete().eq("id", userId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to delete user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User deleted successfully",
//       })
//       fetchProfiles()
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
//         <div className="container mx-auto p-6 space-y-6">
//           <div className="flex items-center gap-2 mb-6">
//             <Skeleton className="h-8 w-8" />
//             <Skeleton className="h-8 w-64" />
//           </div>
//           <div className="grid gap-4 md:grid-cols-6">
//             {[...Array(6)].map((_, i) => (
//               <Card key={i} className="border-0 shadow-lg">
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <Skeleton className="h-4 w-20" />
//                   <Skeleton className="h-4 w-4" />
//                 </CardHeader>
//                 <CardContent>
//                   <Skeleton className="h-8 w-16" />
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
//       <div className="container mx-auto p-6 space-y-8">
//         {/* Enhanced Header */}
//         <div className="bg-white rounded-2xl shadow-xl border-0 p-8">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
//                 <Building2 className="h-8 w-8 text-white" />
//               </div>
//               <div>
//                 <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
//                   Community Management
//                 </h1>
//                 <p className="text-gray-600 text-lg mt-1">Professional Dashboard for Residential Management</p>
//               </div>
//             </div>
//             <Button
//               onClick={refreshData}
//               variant="outline"
//               disabled={refreshing}
//               className="gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200"
//             >
//               <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
//               Refresh Data
//             </Button>
//           </div>
//         </div>

//         {/* Enhanced Stats Cards */}
//         <div className="grid gap-6 md:grid-cols-6">
//           <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-blue-100">Total Residents</CardTitle>
//               <Users className="h-5 w-5 text-blue-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{profiles.length}</div>
//               <p className="text-xs text-blue-200 mt-1">Active community members</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-green-100">Active Bookings</CardTitle>
//               <Calendar className="h-5 w-5 text-green-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.totalBookings}</div>
//               <p className="text-xs text-green-200 mt-1">Confirmed reservations</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-orange-100">Pending Issues</CardTitle>
//               <AlertTriangle className="h-5 w-5 text-orange-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.pendingComplaints}</div>
//               <p className="text-xs text-orange-200 mt-1">Awaiting resolution</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-red-500 to-red-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-red-100">Unpaid Maintenance</CardTitle>
//               <CreditCard className="h-5 w-5 text-red-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.unpaidMaintenance}</div>
//               <p className="text-xs text-red-200 mt-1">Outstanding payments</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-purple-100">Pending Payments</CardTitle>
//               <Clock className="h-5 w-5 text-purple-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.pendingPayments}</div>
//               <p className="text-xs text-purple-200 mt-1">Booking payments due</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-blue-100">Today&apos;s Bookings</CardTitle>
//               <Calendar className="h-5 w-5 text-blue-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.todayBookings}</div>
//               <p className="text-xs text-blue-200 mt-1">Confirmed for today</p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Enhanced Tabs */}
//         <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
//           <Tabs defaultValue="residents" className="w-full">
//             <div className="border-b border-gray-100 bg-gray-50/50">
//               <TabsList className="grid w-full grid-cols-5 bg-transparent h-16 p-2">
//                 <TabsTrigger
//                   value="residents"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-blue-600 transition-all duration-200"
//                 >
//                   <Users className="h-4 w-4 mr-2" />
//                   Residents
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="bookings"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-green-600 transition-all duration-200"
//                 >
//                   <Calendar className="h-4 w-4 mr-2" />
//                   Bookings
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="complaints"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-orange-600 transition-all duration-200"
//                 >
//                   <MessageSquare className="h-4 w-4 mr-2" />
//                   Complaints
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="grouped-complaints"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-purple-600 transition-all duration-200"
//                 >
//                   <BarChart3 className="h-4 w-4 mr-2" />
//                   Analytics
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="settings"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-gray-800 transition-all duration-200"
//                 >
//                   <Settings className="h-4 w-4 mr-2" />
//                   Settings
//                 </TabsTrigger>
//               </TabsList>
//             </div>

//             {/* Residents Tab */}
//             <TabsContent value="residents" className="p-6">
//               <div className="space-y-6">
//                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//                   <div>
//                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                       <Users className="h-6 w-6 text-blue-600" />
//                       Residents Management
//                     </h2>
//                     <p className="text-gray-600 mt-1">Manage community residents and their information</p>
//                   </div>

//                   <div className="flex flex-col sm:flex-row gap-3">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                       <Input
//                         placeholder="Search residents..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="pl-10 w-full sm:w-64 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
//                       />
//                     </div>

//                     <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
//                       <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                         <Filter className="h-4 w-4 mr-2" />
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Status</SelectItem>
//                         <SelectItem value="paid">Paid</SelectItem>
//                         <SelectItem value="unpaid">Unpaid</SelectItem>
//                       </SelectContent>
//                     </Select>

//                     <div className="flex items-center gap-2">
//                       <Select value={residentsPeriod} onValueChange={setResidentsPeriod}>
//                         <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                           <Filter className="h-4 w-4 mr-2" />
//                           <SelectValue placeholder="Period" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="all">All Time</SelectItem>
//                           <SelectItem value="daily">Today</SelectItem>
//                           <SelectItem value="weekly">This Week</SelectItem>
//                           <SelectItem value="monthly">This Month</SelectItem>
//                           <SelectItem value="yearly">This Year</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <Button
//                         onClick={() => {
//                           void exportToPdf({
//                             title: "Residents Report",
//                             periodLabel: periodLabel(residentsPeriod),
//                             columns: [
//                               { header: "Name", dataKey: "name" },
//                               { header: "Phone", dataKey: "phone" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Maintenance (Rs)", dataKey: "maintenance" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: residentsDisplay.map((p) => ({
//                               name: p.name || "N/A",
//                               phone: p.phone_number || "N/A",
//                               apartment: p.apartment_number || "N/A",
//                               maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
//                               status: p.maintenance_paid ? "Paid" : "Unpaid",
//                             })),
//                             filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
//                             fileName: `residents-${residentsPeriod}-filtered.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (filtered)
//                       </Button>
//                       <Button
//                         onClick={() => {
//                           const allResidents = filterByPeriod(profiles, residentsPeriod, (p) => p.created_at)
//                           void exportToPdf({
//                             title: "Residents Report",
//                             periodLabel: periodLabel(residentsPeriod),
//                             columns: [
//                               { header: "Name", dataKey: "name" },
//                               { header: "Phone", dataKey: "phone" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Maintenance (Rs)", dataKey: "maintenance" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: allResidents.map((p) => ({
//                               name: p.name || "N/A",
//                               phone: p.phone_number || "N/A",
//                               apartment: p.apartment_number || "N/A",
//                               maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
//                               status: p.maintenance_paid ? "Paid" : "Unpaid",
//                             })),
//                             fileName: `residents-${residentsPeriod}-all.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (all)
//                       </Button>
//                     </div>

//                     <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
//                       <DialogTrigger asChild>
//                         <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200">
//                           <UserPlus className="h-4 w-4" />
//                           Add Resident
//                         </Button>
//                       </DialogTrigger>
//                       <DialogContent className="sm:max-w-[500px]">
//                         <DialogHeader>
//                           <DialogTitle className="text-xl font-semibold">Add New Resident</DialogTitle>
//                         </DialogHeader>
//                         <div className="grid gap-4 py-4">
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="name" className="text-right font-medium">
//                               Name *
//                             </Label>
//                             <Input
//                               id="name"
//                               value={newUser.name}
//                               onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
//                               className="col-span-3"
//                               placeholder="Enter full name"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="phone" className="text-right font-medium">
//                               Phone *
//                             </Label>
//                             <Input
//                               id="phone"
//                               value={newUser.phone_number}
//                               onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
//                               className="col-span-3"
//                               placeholder="+1234567890"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="apartment" className="text-right font-medium">
//                               Apartment *
//                             </Label>
//                             <Input
//                               id="apartment"
//                               value={newUser.apartment_number}
//                               onChange={(e) => setNewUser({ ...newUser, apartment_number: e.target.value })}
//                               className="col-span-3"
//                               placeholder="A-101"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="cnic" className="text-right font-medium">
//                               CNIC
//                             </Label>
//                             <Input
//                               id="cnic"
//                               value={newUser.cnic}
//                               onChange={(e) => setNewUser({ ...newUser, cnic: e.target.value })}
//                               className="col-span-3"
//                               placeholder="12345-6789012-3"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="maintenance" className="text-right font-medium">
//                               Maintenance
//                             </Label>
//                             <Input
//                               id="maintenance"
//                               type="number"
//                               value={newUser.maintenance_charges}
//                               onChange={(e) => setNewUser({ ...newUser, maintenance_charges: Number(e.target.value) })}
//                               className="col-span-3"
//                               placeholder="5000"
//                             />
//                           </div>
//                         </div>
//                         <div className="flex justify-end gap-3 pt-4">
//                           <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
//                             Cancel
//                           </Button>
//                           <Button onClick={addNewUser} className="bg-blue-600 hover:bg-blue-700">
//                             Add Resident
//                           </Button>
//                         </div>
//                       </DialogContent>
//                     </Dialog>
//                   </div>
//                 </div>

//                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow className="bg-gray-50/50">
//                         <TableHead className="font-semibold text-gray-700">Name</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Phone</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Maintenance</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                         <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {residentsDisplay.length === 0 ? (
//                         <TableRow>
//                           <TableCell colSpan={6} className="text-center py-12">
//                             <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                             <p className="text-gray-500 text-lg font-medium">
//                               {profiles.length === 0 ? "No residents yet" : "No residents match your filters"}
//                             </p>
//                             <p className="text-gray-400 text-sm mt-1">
//                               {profiles.length === 0
//                                 ? "Add your first resident to get started"
//                                 : "Try adjusting your search criteria or period"}
//                             </p>
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         residentsDisplay.map((profile) => (
//                           <TableRow key={profile.id} className="hover:bg-gray-50/50 transition-colors">
//                             <TableCell className="font-medium text-gray-900">{profile.name}</TableCell>
//                             <TableCell className="text-gray-600">{profile.phone_number}</TableCell>
//                             <TableCell className="text-gray-600">{profile.apartment_number}</TableCell>
//                             <TableCell className="text-gray-600">
//                               Rs. {profile.maintenance_charges.toLocaleString()}
//                             </TableCell>
//                             <TableCell>
//                               <Badge
//                                 variant={profile.maintenance_paid ? "default" : "destructive"}
//                                 className={
//                                   profile.maintenance_paid ? "bg-green-100 text-green-800 hover:bg-green-200" : ""
//                                 }
//                               >
//                                 {profile.maintenance_paid ? (
//                                   <>
//                                     <CheckCircle className="h-3 w-3 mr-1" />
//                                     Paid
//                                   </>
//                                 ) : (
//                                   <>
//                                     <XCircle className="h-3 w-3 mr-1" />
//                                     Unpaid
//                                   </>
//                                 )}
//                               </Badge>
//                             </TableCell>
//                             <TableCell className="text-right">
//                               <div className="flex gap-2 justify-end">
//                                 <Link href={`/admin/residents/${profile.id}`}>
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     className="hover:bg-blue-50 hover:border-blue-200 bg-transparent"
//                                   >
//                                     <Eye className="h-4 w-4 mr-1" />
//                                     Open Profile
//                                   </Button>
//                                 </Link>

//                                 <Button
//                                   variant="outline"
//                                   size="sm"
//                                   onClick={() => {
//                                     setEditingUser(profile)
//                                     setIsEditUserOpen(true)
//                                   }}
//                                   className="hover:bg-blue-50 hover:border-blue-200 text-blue-600"
//                                 >
//                                   <Edit className="h-4 w-4" />
//                                 </Button>

//                                 <Button
//                                   variant="outline"
//                                   size="sm"
//                                   onClick={() => updateMaintenanceStatus(profile.id, !profile.maintenance_paid)}
//                                   className={
//                                     profile.maintenance_paid
//                                       ? "hover:bg-red-50 hover:border-red-200 text-red-600"
//                                       : "hover:bg-green-50 hover:border-green-200 text-green-600"
//                                   }
//                                 >
//                                   {profile.maintenance_paid ? (
//                                     <>
//                                       <XCircle className="h-4 w-4 mr-1" />
//                                       Mark Unpaid
//                                     </>
//                                   ) : (
//                                     <>
//                                       <CheckCircle className="h-4 w-4 mr-1" />
//                                       Mark Paid
//                                     </>
//                                   )}
//                                 </Button>

//                                 <Button
//                                   variant="outline"
//                                   size="sm"
//                                   onClick={() => deleteUser(profile.id, profile.name)}
//                                   className="hover:bg-red-50 hover:border-red-200 text-red-600"
//                                 >
//                                   <Trash2 className="h-4 w-4" />
//                                 </Button>
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Bookings Tab */}
//             <TabsContent value="bookings" className="p-6">
//               <div className="space-y-6">
//                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//                   <div>
//                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                       <Calendar className="h-6 w-6 text-green-600" />
//                       Bookings Management
//                     </h2>
//                     <p className="text-gray-600 mt-1">Track and manage community hall bookings</p>
//                   </div>

//                   <div className="flex flex-col sm:flex-row gap-3">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                       <Input
//                         placeholder="Search bookings..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="pl-10 w-full sm:w-64 border-gray-200 focus:border-green-500 focus:ring-green-500"
//                       />
//                     </div>

//                     <Input
//                       type="date"
//                       value={dateFilter}
//                       onChange={(e) => setDateFilter(e.target.value)}
//                       className="w-full sm:w-auto border-gray-200"
//                     />

//                     <Select value={statusFilter} onValueChange={setStatusFilter}>
//                       <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                         <Filter className="h-4 w-4 mr-2" />
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Status</SelectItem>
//                         <SelectItem value="confirmed">Confirmed</SelectItem>
//                         <SelectItem value="cancelled">Cancelled</SelectItem>
//                       </SelectContent>
//                     </Select>

//                     <div className="flex items-center gap-2">
//                       <Select value={bookingsPeriod} onValueChange={setBookingsPeriod}>
//                         <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                           <Filter className="h-4 w-4 mr-2" />
//                           <SelectValue placeholder="Period" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="all">All Time</SelectItem>
//                           <SelectItem value="daily">Today</SelectItem>
//                           <SelectItem value="weekly">This Week</SelectItem>
//                           <SelectItem value="monthly">This Month</SelectItem>
//                           <SelectItem value="yearly">This Year</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <Button
//                         onClick={() => {
//                           void exportToPdf({
//                             title: "Bookings Report",
//                             periodLabel: periodLabel(bookingsPeriod),
//                             columns: [
//                               { header: "Customer", dataKey: "customer" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Date", dataKey: "date" },
//                               { header: "Time", dataKey: "time" },
//                               { header: "Amount", dataKey: "amount" },
//                               { header: "Payment", dataKey: "payment" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: bookingsDisplay.map((b) => ({
//                               customer: b.profiles?.name || "N/A",
//                               apartment: b.profiles?.apartment_number || "",
//                               date: formatDateForDisplay(b.booking_date),
//                               time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
//                               amount: `Rs. ${b.booking_charges.toLocaleString()}`,
//                               payment: b.payment_status,
//                               status: b.status,
//                             })),
//                             filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
//                             fileName: `bookings-${bookingsPeriod}-filtered.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (filtered)
//                       </Button>
//                       <Button
//                         onClick={() => {
//                           const allBookings = filterByPeriod(bookings, bookingsPeriod, (b) => b.booking_date)
//                           void exportToPdf({
//                             title: "Bookings Report",
//                             periodLabel: periodLabel(bookingsPeriod),
//                             columns: [
//                               { header: "Customer", dataKey: "customer" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Date", dataKey: "date" },
//                               { header: "Time", dataKey: "time" },
//                               { header: "Amount", dataKey: "amount" },
//                               { header: "Payment", dataKey: "payment" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: allBookings.map((b) => ({
//                               customer: b.profiles?.name || "N/A",
//                               apartment: b.profiles?.apartment_number || "",
//                               date: formatDateForDisplay(b.booking_date),
//                               time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
//                               amount: `Rs. ${b.booking_charges.toLocaleString()}`,
//                               payment: b.payment_status,
//                               status: b.status,
//                             })),
//                             fileName: `bookings-${bookingsPeriod}-all.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (all)
//                       </Button>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow className="bg-gray-50/50">
//                         <TableHead className="font-semibold text-gray-700">Customer</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Date</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Time Slot</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Amount</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Payment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                         <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {bookingsDisplay.length === 0 ? (
//                         <TableRow>
//                           <TableCell colSpan={8} className="text-center py-12">
//                             <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                             <p className="text-gray-500 text-lg font-medium">
//                               {bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}
//                             </p>
//                             <p className="text-gray-400 text-sm mt-1">
//                               {bookings.length === 0
//                                 ? "Bookings will appear here once residents start booking"
//                                 : "Try adjusting your search, status, or period filters"}
//                             </p>
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         bookingsDisplay.map((booking) => (
//                           <TableRow key={booking.id} className="hover:bg-gray-50/50 transition-colors">
//                             <TableCell className="font-medium text-gray-900">
//                               {booking.profiles?.name || "N/A"}
//                             </TableCell>
//                             <TableCell className="text-gray-600">{booking.profiles?.apartment_number}</TableCell>
//                             <TableCell className="text-gray-600">
//                               {formatDateForDisplay(booking.booking_date)}
//                             </TableCell>
//                             <TableCell className="text-gray-600">
//                               {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
//                             </TableCell>
//                             <TableCell className="text-gray-600">
//                               Rs. {booking.booking_charges.toLocaleString()}
//                             </TableCell>
//                             <TableCell>
//                               <Badge
//                                 variant={getStatusBadgeVariant(booking.payment_status)}
//                                 className={
//                                   booking.payment_status === "paid"
//                                     ? "bg-green-100 text-green-800 hover:bg-green-200"
//                                     : ""
//                                 }
//                               >
//                                 {booking.payment_status === "paid" ? (
//                                   <>
//                                     <CheckCircle className="h-3 w-3 mr-1" />
//                                     Paid
//                                   </>
//                                 ) : (
//                                   <>
//                                     <Clock className="h-3 w-3 mr-1" />
//                                     Pending
//                                   </>
//                                 )}
//                               </Badge>
//                             </TableCell>
//                             <TableCell>
//                               <Badge variant={getStatusBadgeVariant(booking.status)}>
//                                 {booking.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
//                                 {booking.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
//                                 {booking.status}
//                               </Badge>
//                             </TableCell>
//                             <TableCell className="text-right">
//                               <div className="flex gap-2 justify-end">
//                                 {booking.payment_status === "pending" ? (
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     onClick={() => updateBookingPaymentStatus(booking.id, "paid")}
//                                     className="hover:bg-green-50 hover:border-green-200 text-green-600"
//                                   >
//                                     <CheckCircle className="h-4 w-4 mr-1" />
//                                     Mark Paid
//                                   </Button>
//                                 ) : booking.payment_status === "paid" ? (
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     onClick={() => updateBookingPaymentStatus(booking.id, "pending")}
//                                     className="hover:bg-red-50 hover:border-red-200 text-red-600"
//                                   >
//                                     <XCircle className="h-4 w-4 mr-1" />
//                                     Mark Unpaid
//                                   </Button>
//                                 ) : null}

//                                 {booking.status === "confirmed" && (
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     onClick={() => cancelBooking(booking.id)}
//                                     className="hover:bg-red-50 hover:border-red-200 text-red-600"
//                                   >
//                                     <X className="h-4 w-4 mr-1" />
//                                     Cancel
//                                   </Button>
//                                 )}
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Complaints Tab */}
//             <TabsContent value="complaints" className="p-6">
//               <div className="space-y-6">
//                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//                   <div>
//                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                       <MessageSquare className="h-6 w-6 text-orange-600" />
//                       Individual Complaints
//                     </h2>
//                     <p className="text-gray-600 mt-1">Track and resolve resident complaints</p>
//                   </div>

//                   <div className="flex flex-col sm:flex-row gap-3">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                       <Input
//                         placeholder="Search complaints..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="pl-10 w-full sm:w-64 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
//                       />
//                     </div>

//                     <Select value={complaintStatusFilter} onValueChange={setComplaintStatusFilter}>
//                       <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                         <Filter className="h-4 w-4 mr-2" />
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Status</SelectItem>
//                         <SelectItem value="pending">Pending</SelectItem>
//                         <SelectItem value="in-progress">In Progress</SelectItem>
//                         <SelectItem value="completed">Completed</SelectItem>
//                         <SelectItem value="cancelled">Cancelled</SelectItem>
//                       </SelectContent>
//                     </Select>

//                     <div className="flex items-center gap-2">
//                       <Select value={complaintsPeriod} onValueChange={setComplaintsPeriod}>
//                         <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                           <Filter className="h-4 w-4 mr-2" />
//                           <SelectValue placeholder="Period" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="all">All Time</SelectItem>
//                           <SelectItem value="daily">Today</SelectItem>
//                           <SelectItem value="weekly">This Week</SelectItem>
//                           <SelectItem value="monthly">This Month</SelectItem>
//                           <SelectItem value="yearly">This Year</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <Button
//                         onClick={() => {
//                           void exportToPdf({
//                             title: "Complaints Report",
//                             periodLabel: periodLabel(complaintsPeriod),
//                             columns: [
//                               { header: "Complaint ID", dataKey: "complaintId" },
//                               { header: "Customer", dataKey: "customer" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Category", dataKey: "category" },
//                               { header: "Type", dataKey: "type" },
//                               { header: "Status", dataKey: "status" },
//                               { header: "Created", dataKey: "created" },
//                             ],
//                             rows: complaintsDisplay.map((c) => ({
//                               complaintId: c.complaint_id,
//                               customer: c.profiles?.name || "N/A",
//                               apartment: c.profiles?.apartment_number || "",
//                               category: c.category,
//                               type: c.subcategory,
//                               status: c.status,
//                               created: formatDateTime(c.created_at),
//                             })),
//                             filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
//                             fileName: `complaints-${complaintsPeriod}-filtered.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (filtered)
//                       </Button>
//                       <Button
//                         onClick={() => {
//                           const allComplaints = filterByPeriod(complaints, complaintsPeriod, (c) => c.created_at)
//                           void exportToPdf({
//                             title: "Complaints Report",
//                             periodLabel: periodLabel(complaintsPeriod),
//                             columns: [
//                               { header: "Complaint ID", dataKey: "complaintId" },
//                               { header: "Customer", dataKey: "customer" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Category", dataKey: "category" },
//                               { header: "Type", dataKey: "type" },
//                               { header: "Status", dataKey: "status" },
//                               { header: "Created", dataKey: "created" },
//                             ],
//                             rows: allComplaints.map((c) => ({
//                               complaintId: c.complaint_id,
//                               customer: c.profiles?.name || "N/A",
//                               apartment: c.profiles?.apartment_number || "",
//                               category: c.category,
//                               type: c.subcategory,
//                               status: c.status,
//                               created: formatDateTime(c.created_at),
//                             })),
//                             fileName: `complaints-${complaintsPeriod}-all.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (all)
//                       </Button>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow className="bg-gray-50/50">
//                         <TableHead className="font-semibold text-gray-700">Complaint ID</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Customer</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Category</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Type</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Created</TableHead>
//                         <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {complaintsDisplay.length === 0 ? (
//                         <TableRow>
//                           <TableCell colSpan={8} className="text-center py-12">
//                             <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                             <p className="text-gray-500 text-lg font-medium">
//                               {complaints.length === 0 ? "No complaints yet" : "No complaints match your filters"}
//                             </p>
//                             <p className="text-gray-400 text-sm mt-1">
//                               {complaints.length === 0
//                                 ? "Complaints will appear here when residents report issues"
//                                 : "Try adjusting your search, status, or period filters"}
//                             </p>
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         complaintsDisplay.map((complaint) => (
//                           <TableRow key={complaint.id} className="hover:bg-gray-50/50 transition-colors">
//                             <TableCell className="font-medium text-gray-900">{complaint.complaint_id}</TableCell>
//                             <TableCell className="text-gray-600">{complaint.profiles?.name || "N/A"}</TableCell>
//                             <TableCell className="text-gray-600">{complaint.profiles?.apartment_number}</TableCell>
//                             <TableCell className="text-gray-600 capitalize">{complaint.category}</TableCell>
//                             <TableCell className="text-gray-600 capitalize">{complaint.subcategory}</TableCell>
//                             <TableCell>
//                               <Badge variant={getStatusBadgeVariant(complaint.status)}>
//                                 {complaint.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
//                                 {complaint.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
//                                 {complaint.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
//                                 {complaint.status}
//                               </Badge>
//                             </TableCell>
//                             <TableCell className="text-gray-600">{formatDateTime(complaint.created_at)}</TableCell>
//                             <TableCell className="text-right">
//                               <div className="flex gap-2 justify-end">
//                                 <Dialog>
//                                   <DialogTrigger asChild>
//                                     <Button
//                                       variant="outline"
//                                       size="sm"
//                                       onClick={() => setSelectedComplaint(complaint)}
//                                       className="hover:bg-orange-50 hover:border-orange-200"
//                                     >
//                                       <Eye className="h-4 w-4" />
//                                     </Button>
//                                   </DialogTrigger>
//                                   <DialogContent className="sm:max-w-[600px]">
//                                     <DialogHeader>
//                                       <DialogTitle className="text-xl font-semibold">Complaint Details</DialogTitle>
//                                     </DialogHeader>
//                                     {selectedComplaint && (
//                                       <div className="grid gap-6 py-4">
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Complaint ID</Label>
//                                             <p className="text-gray-900 font-medium">
//                                               {selectedComplaint.complaint_id}
//                                             </p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Status</Label>
//                                             <Badge variant={getStatusBadgeVariant(selectedComplaint.status)}>
//                                               {selectedComplaint.status}
//                                             </Badge>
//                                           </div>
//                                         </div>
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Customer</Label>
//                                             <p className="text-gray-900">{selectedComplaint.profiles?.name}</p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Apartment</Label>
//                                             <p className="text-gray-900">
//                                               {selectedComplaint.profiles?.apartment_number}
//                                             </p>
//                                           </div>
//                                         </div>
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Category</Label>
//                                             <p className="text-gray-900 capitalize">{selectedComplaint.category}</p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Type</Label>
//                                             <p className="text-gray-900 capitalize">{selectedComplaint.subcategory}</p>
//                                           </div>
//                                         </div>
//                                         {selectedComplaint.description && (
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Description</Label>
//                                             <div className="p-4 bg-gray-50 rounded-lg border">
//                                               <p className="text-gray-900">{selectedComplaint.description}</p>
//                                             </div>
//                                           </div>
//                                         )}
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Created</Label>
//                                             <p className="text-gray-900">
//                                               {formatDateTime(selectedComplaint.created_at)}
//                                             </p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
//                                             <p className="text-gray-900">
//                                               {formatDateTime(selectedComplaint.updated_at)}
//                                             </p>
//                                           </div>
//                                         </div>
//                                       </div>
//                                     )}
//                                   </DialogContent>
//                                 </Dialog>
//                                 {complaint.status !== "completed" && complaint.status !== "cancelled" && (
//                                   <Select
//                                     value={complaint.status}
//                                     onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
//                                   >
//                                     <SelectTrigger className="w-32">
//                                       <SelectValue />
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                       <SelectItem value="pending">Pending</SelectItem>
//                                       <SelectItem value="in-progress">In Progress</SelectItem>
//                                       <SelectItem value="completed">Completed</SelectItem>
//                                       <SelectItem value="cancelled">Cancelled</SelectItem>
//                                     </SelectContent>
//                                   </Select>
//                                 )}
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Grouped Complaints Tab */}
//             <TabsContent value="grouped-complaints" className="p-6">
//               <div className="space-y-6">
//                 <div>
//                   <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                     <BarChart3 className="h-6 w-6 text-purple-600" />
//                     Complaint Analytics
//                   </h2>
//                   <p className="text-gray-600 mt-1">View grouped complaints and identify common issues</p>
//                 </div>

//                 <div className="grid gap-6">
//                   {groupedComplaints.length === 0 ? (
//                     <div className="text-center py-12">
//                       <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                       <p className="text-gray-500 text-lg font-medium">No complaints to analyze</p>
//                       <p className="text-gray-400 text-sm mt-1">
//                         Complaint analytics will appear here when residents report issues
//                       </p>
//                     </div>
//                   ) : (
//                     groupedComplaints.map((group) => (
//                       <Card key={group.group_key} className="border-0 shadow-lg overflow-hidden">
//                         <div className="border-l-4 border-l-purple-500">
//                           <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
//                             <div className="flex items-center justify-between">
//                               <div>
//                                 <CardTitle className="text-xl capitalize text-gray-900">
//                                   {group.category} - {group.subcategory}
//                                 </CardTitle>
//                                 <p className="text-gray-600 mt-1">
//                                   {group.count} resident{group.count > 1 ? "s" : ""} reported this issue
//                                 </p>
//                               </div>
//                               <div className="flex items-center gap-3">
//                                 <Badge variant={getStatusBadgeVariant(group.status)} className="text-sm">
//                                   {group.status}
//                                 </Badge>
//                                 <Badge variant="outline" className="text-sm bg-white">
//                                   {group.count} complaints
//                                 </Badge>
//                               </div>
//                             </div>
//                           </CardHeader>
//                           <CardContent className="p-6">
//                             <div className="space-y-4">
//                               <Label className="text-sm font-medium text-gray-700">Affected Residents:</Label>
//                               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                                 {group.complaints.map((complaint) => (
//                                   <div
//                                     key={complaint.id}
//                                     className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
//                                   >
//                                     <div>
//                                       <p className="font-medium text-gray-900">
//                                         {complaint.profiles?.name} ({complaint.profiles?.apartment_number})
//                                       </p>
//                                       <p className="text-xs text-gray-500">{formatDateTime(complaint.created_at)}</p>
//                                       {complaint.description && (
//                                         <div className="flex items-center space-x-2 mt-1">
//                                           <p className="text-xs text-gray-600">Description:</p>
//                                           <p className="text-xs text-gray-700">{complaint.description}</p>
//                                         </div>
//                                       )}
//                                     </div>
//                                     <Badge variant={getStatusBadgeVariant(complaint.status)} className="text-xs">
//                                       {complaint.status}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                             <div className="mt-6 flex gap-3">
//                               <Select
//                                 value={group.status}
//                                 onValueChange={(value) => {
//                                   group.complaints.forEach((complaint) => {
//                                     updateComplaintStatus(complaint.id, value)
//                                   })
//                                 }}
//                               >
//                                 <SelectTrigger className="w-48">
//                                   <SelectValue />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                   <SelectItem value="pending">Mark All Pending</SelectItem>
//                                   <SelectItem value="in-progress">Mark All In Progress</SelectItem>
//                                   <SelectItem value="completed">Mark All Completed</SelectItem>
//                                 </SelectContent>
//                               </Select>
//                             </div>
//                           </CardContent>
//                         </div>
//                       </Card>
//                     ))
//                   )}
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Settings Tab */}
//             <TabsContent value="settings" className="p-6">
//               <div className="space-y-8">
//                 <div>
//                   <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                     <Settings className="h-6 w-6 text-gray-700" />
//                     System Settings
//                   </h2>
//                   <p className="text-gray-600 mt-1">Configure booking settings</p>
//                 </div>

//                 <Card className="border-0 shadow-lg">
//                   <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
//                     <CardTitle className="flex items-center gap-2 text-xl">
//                       <Settings className="h-5 w-5 text-blue-600" />
//                       Booking Configuration
//                     </CardTitle>
//                   </CardHeader>
//                   <CardContent className="p-6 space-y-6">
//                     <div className="grid grid-cols-2 gap-4">
//                       <div className="space-y-2">
//                         <Label className="text-sm font-medium text-gray-700">Start Time</Label>
//                         <Input
//                           type="time"
//                           value={startTime}
//                           onChange={(e) => setStartTime(e.target.value)}
//                           className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <Label className="text-sm font-medium text-gray-700">End Time</Label>
//                         <Input
//                           type="time"
//                           value={endTime}
//                           onChange={(e) => setEndTime(e.target.value)}
//                           className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
//                         />
//                       </div>
//                     </div>

//                     <div className="space-y-2">
//                       <Label className="text-sm font-medium text-gray-700">Slot Duration</Label>
//                       <Select
//                         value={slotDuration.toString()}
//                         onValueChange={(value) => setSlotDuration(Number.parseInt(value))}
//                       >
//                         <SelectTrigger className="border-gray-200">
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="15">15 minutes</SelectItem>
//                           <SelectItem value="30">30 minutes</SelectItem>
//                           <SelectItem value="60">1 hour</SelectItem>
//                           <SelectItem value="120">2 hours</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     <div className="space-y-2">
//                       <Label className="text-sm font-medium text-gray-700">Booking Charges (Rs.)</Label>
//                       <Input
//                         type="number"
//                         value={bookingCharges}
//                         onChange={(e) => setBookingCharges(Number.parseInt(e.target.value) || 0)}
//                         className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
//                         min="0"
//                         step="100"
//                       />
//                     </div>

//                     <div className="space-y-3">
//                       <Label className="text-sm font-medium text-gray-700">Working Days</Label>
//                       <div className="grid grid-cols-2 gap-3">
//                         {[
//                           { value: 1, label: "Monday" },
//                           { value: 2, label: "Tuesday" },
//                           { value: 3, label: "Wednesday" },
//                           { value: 4, label: "Thursday" },
//                           { value: 5, label: "Friday" },
//                           { value: 6, label: "Saturday" },
//                           { value: 7, label: "Sunday" },
//                         ].map((day) => (
//                           <div key={day.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
//                             <input
//                               type="checkbox"
//                               id={`day-${day.value}`}
//                               checked={workingDays.includes(day.value)}
//                               onChange={(e) => {
//                                 if (e.target.checked) {
//                                   setWorkingDays([...workingDays, day.value])
//                                 } else {
//                                   setWorkingDays(workingDays.filter((d) => d !== day.value))
//                                 }
//                               }}
//                               className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//                             />
//                             <label htmlFor={`day-${day.value}`} className="text-sm font-medium text-gray-700">
//                               {day.label}
//                             </label>
//                           </div>
//                         ))}
//                       </div>
//                     </div>

//                     <Button
//                       onClick={saveSettings}
//                       disabled={saving}
//                       className="w-full gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
//                     >
//                       {saving ? (
//                         <>
//                           <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
//                           Saving...
//                         </>
//                       ) : (
//                         <>
//                           <CheckCircle className="h-4 w-4" />
//                           Save Settings
//                         </>
//                       )}
//                     </Button>
//                   </CardContent>
//                 </Card>
//               </div>
//             </TabsContent>
//           </Tabs>
//         </div>

//         {/* Edit User Dialog */}
//         <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
//           <DialogContent className="sm:max-w-[500px]">
//             <DialogHeader>
//               <DialogTitle className="text-xl font-semibold">Edit Resident</DialogTitle>
//             </DialogHeader>
//             {editingUser && (
//               <div className="grid gap-4 py-4">
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-name" className="text-right font-medium">
//                     Name *
//                   </Label>
//                   <Input
//                     id="edit-name"
//                     value={editingUser.name}
//                     onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
//                     className="col-span-3"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-phone" className="text-right font-medium">
//                     Phone *
//                   </Label>
//                   <Input
//                     id="edit-phone"
//                     value={editingUser.phone_number}
//                     onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
//                     className="col-span-3"
//                     placeholder="+1234567890"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-apartment" className="text-right font-medium">
//                     Apartment *
//                   </Label>
//                   <Input
//                     id="edit-apartment"
//                     value={editingUser.apartment_number}
//                     onChange={(e) => setEditingUser({ ...editingUser, apartment_number: e.target.value })}
//                     className="col-span-3"
//                     placeholder="A-101"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-cnic" className="text-right font-medium">
//                     CNIC
//                   </Label>
//                   <Input
//                     id="edit-cnic"
//                     value={editingUser.cnic || ""}
//                     onChange={(e) => setEditingUser({ ...editingUser, cnic: e.target.value })}
//                     className="col-span-3"
//                     placeholder="12345-6789012-3"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-maintenance" className="text-right font-medium">
//                     Maintenance
//                   </Label>
//                   <Input
//                     id="edit-maintenance"
//                     type="number"
//                     value={editingUser.maintenance_charges}
//                     onChange={(e) => setEditingUser({ ...editingUser, maintenance_charges: Number(e.target.value) })}
//                     className="col-span-3"
//                   />
//                 </div>
//               </div>
//             )}
//             <div className="flex justify-end gap-3 pt-4">
//               <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
//                 Cancel
//               </Button>
//               <Button onClick={editUser} className="bg-blue-600 hover:bg-blue-700">
//                 Update Resident
//               </Button>
//             </div>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </div>
//   )
// }


// "use client"

// import { useState, useEffect, useMemo } from "react"
// import {
//   supabase,
//   type BookingSettings,
//   type Booking,
//   type Complaint,
//   type Profile,
//   type GroupedComplaint,
// } from "@/lib/supabase"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import {
//   Calendar,
//   Users,
//   Settings,
//   X,
//   RefreshCw,
//   AlertTriangle,
//   MessageSquare,
//   Eye,
//   CreditCard,
//   UserPlus,
//   Building2,
//   Clock,
//   CheckCircle,
//   XCircle,
//   Edit,
//   Trash2,
//   Search,
//   Filter,
//   BarChart3,
// } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Skeleton } from "@/components/ui/skeleton"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"
// import { formatDateForDisplay } from "@/lib/time-utils"
// import Link from "next/link"
// import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"

// export default function AdminPanel() {
//   const [settings, setSettings] = useState<BookingSettings | null>(null)
//   const [bookings, setBookings] = useState<Booking[]>([])
//   const [complaints, setComplaints] = useState<Complaint[]>([])
//   const [profiles, setProfiles] = useState<Profile[]>([])
//   const [groupedComplaints, setGroupedComplaints] = useState<GroupedComplaint[]>([])
//   const [loading, setLoading] = useState(true)
//   const [saving, setSaving] = useState(false)
//   const [refreshing, setRefreshing] = useState(false)
//   const [searchTerm, setSearchTerm] = useState("")
//   const [dateFilter, setDateFilter] = useState("")
//   const [statusFilter, setStatusFilter] = useState("all")
//   const [complaintStatusFilter, setComplaintStatusFilter] = useState("all")
//   const [maintenanceFilter, setMaintenanceFilter] = useState("all")
//   const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
//   const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
//   const [isAddUserOpen, setIsAddUserOpen] = useState(false)
//   const [isEditUserOpen, setIsEditUserOpen] = useState(false)
//   const [editingUser, setEditingUser] = useState<Profile | null>(null)

//   // Settings form state
//   const [startTime, setStartTime] = useState("09:00")
//   const [endTime, setEndTime] = useState("17:00")
//   const [slotDuration, setSlotDuration] = useState(60)
//   const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])

//   // New user form state
//   const [newUser, setNewUser] = useState({
//     name: "",
//     phone_number: "",
//     cnic: "",
//     apartment_number: "",
//     building_block: "",
//     maintenance_charges: 5000,
//   })

//   // PDF export state
//   const [residentsPeriod, setResidentsPeriod] = useState<Period>("all")
//   const [bookingsPeriod, setBookingsPeriod] = useState<Period>("all")
//   const [complaintsPeriod, setComplaintsPeriod] = useState<Period>("all")

//   const { toast } = useToast()

//   useEffect(() => {
//     fetchData()
//   }, [])

//   const fetchData = async () => {
//     setLoading(true)
//     await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles()])
//     setLoading(false)
//   }

//   const refreshData = async () => {
//     setRefreshing(true)
//     await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles()])
//     setRefreshing(false)
//     toast({
//       title: "Data Refreshed",
//       description: "All data has been updated successfully",
//     })
//   }

//   const fetchSettings = async () => {
//     const { data, error } = await supabase.from("booking_settings").select("*").single()

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch booking settings",
//         variant: "destructive",
//       })
//     } else {
//       setSettings(data)
//       setStartTime(data.start_time.substring(0, 5))
//       setEndTime(data.end_time.substring(0, 5))
//       setSlotDuration(data.slot_duration_minutes)
//       setWorkingDays(data.working_days)
//     }
//   }

//   const fetchBookings = async () => {
//     const { data, error } = await supabase
//       .from("bookings")
//       .select(
//         `
//         *,
//         profiles (name, phone_number, apartment_number)
//       `,
//       )
//       .order("booking_date", { ascending: false })
//       .order("start_time", { ascending: true })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch bookings",
//         variant: "destructive",
//       })
//     } else {
//       setBookings(data || [])
//     }
//   }

//   const fetchComplaints = async () => {
//     const { data, error } = await supabase
//       .from("complaints")
//       .select(
//         `
//         *,
//         profiles (name, phone_number, apartment_number)
//       `,
//       )
//       .order("created_at", { ascending: false })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch complaints",
//         variant: "destructive",
//       })
//     } else {
//       setComplaints(data || [])
//       groupComplaintsByType(data || [])
//     }
//   }

//   const fetchProfiles = async () => {
//     const { data, error } = await supabase.from("profiles").select("*").order("apartment_number", { ascending: true })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch profiles",
//         variant: "destructive",
//       })
//     } else {
//       setProfiles(data || [])
//     }
//   }

//   const groupComplaintsByType = (complaintsData: Complaint[]) => {
//     const grouped = complaintsData.reduce(
//       (acc, complaint) => {
//         const key = complaint.group_key || `${complaint.category}_${complaint.subcategory}`

//         if (!acc[key]) {
//           acc[key] = {
//             group_key: key,
//             category: complaint.category,
//             subcategory: complaint.subcategory,
//             description: complaint.description,
//             status: complaint.status,
//             count: 0,
//             latest_date: complaint.created_at,
//             complaints: [],
//           }
//         }

//         acc[key].complaints.push(complaint)
//         acc[key].count++

//         if (new Date(complaint.created_at) > new Date(acc[key].latest_date)) {
//           acc[key].latest_date = complaint.created_at
//           acc[key].status = complaint.status
//         }

//         return acc
//       },
//       {} as Record<string, GroupedComplaint>,
//     )

//     setGroupedComplaints(Object.values(grouped))
//   }

//   const saveSettings = async () => {
//     if (!settings) return

//     setSaving(true)
//     const { error } = await supabase
//       .from("booking_settings")
//       .update({
//         start_time: startTime + ":00",
//         end_time: endTime + ":00",
//         slot_duration_minutes: slotDuration,
//         working_days: workingDays,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", settings.id)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to save settings",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Settings saved successfully",
//       })
//       fetchSettings()
//     }
//     setSaving(false)
//   }

//   const addNewUser = async () => {
//     if (!newUser.name || !newUser.phone_number || !newUser.apartment_number) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       })
//       return
//     }

//     const { error } = await supabase.from("profiles").insert([
//       {
//         ...newUser,
//         phone_number: newUser.phone_number.startsWith("+") ? newUser.phone_number : `+${newUser.phone_number}`,
//       },
//     ])

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to add user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User added successfully",
//       })
//       setNewUser({
//         name: "",
//         phone_number: "",
//         cnic: "",
//         apartment_number: "",
//         building_block: "",
//         maintenance_charges: 5000,
//       })
//       setIsAddUserOpen(false)
//       fetchProfiles()
//     }
//   }

//   const updateMaintenanceStatus = async (profileId: string, isPaid: boolean) => {
//     const { error } = await supabase
//       .from("profiles")
//       .update({
//         maintenance_paid: isPaid,
//         last_payment_date: isPaid ? new Date().toISOString().split("T")[0] : null,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", profileId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to update maintenance status",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Maintenance status updated successfully",
//       })
//       fetchProfiles()
//     }
//   }

//   const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
//     try {
//       const response = await fetch("/api/complaints/update-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ complaintId, status: newStatus }),
//       })

//       if (!response.ok) {
//         const data = await response.json().catch(() => ({}))
//         throw new Error(typeof data?.error === "string" ? data.error : "Failed to update complaint status")
//       }

//       toast({
//         title: "Success",
//         description:
//           newStatus === "completed"
//             ? "Complaint marked as completed and the resident has been notified."
//             : "Complaint status updated successfully.",
//       })
//       fetchComplaints()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error?.message || "Failed to update complaint status",
//         variant: "destructive",
//       })
//     }
//   }

//   const updateBookingPaymentStatus = async (bookingId: string, paymentStatus: string) => {
//     const { error } = await supabase
//       .from("bookings")
//       .update({
//         payment_status: paymentStatus,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", bookingId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to update payment status",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Payment status updated successfully",
//       })
//       fetchBookings()
//     }
//   }

//   const cancelBooking = async (bookingId: string) => {
//     const { error } = await supabase.from("bookings").delete().eq("id", bookingId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to cancel booking",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Booking cancelled successfully",
//       })
//       fetchBookings()
//     }
//   }

//   const formatTime = (timeString: string) => {
//     const [hours, minutes] = timeString.split(":")
//     const hour = Number.parseInt(hours)
//     const ampm = hour >= 12 ? "PM" : "AM"
//     const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
//     return `${displayHour}:${minutes} ${ampm}`
//   }

//   const formatDateTime = (dateString: string) => {
//     return new Date(dateString).toLocaleString("en-GB", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     })
//   }

//   // Filter logic for profiles
//   const filteredProfiles = useMemo(() => {
//     return profiles.filter((profile) => {
//       const matchesSearch =
//         !searchTerm ||
//         profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         profile.phone_number?.includes(searchTerm) ||
//         profile.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())

//       const matchesMaintenance =
//         maintenanceFilter === "all" ||
//         (maintenanceFilter === "paid" && profile.maintenance_paid) ||
//         (maintenanceFilter === "unpaid" && !profile.maintenance_paid)

//       return matchesSearch && matchesMaintenance
//     })
//   }, [profiles, searchTerm, maintenanceFilter])

//   // Filter logic for bookings
//   const filteredBookings = useMemo(() => {
//     return bookings.filter((booking) => {
//       const matchesSearch =
//         !searchTerm ||
//         booking.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         booking.profiles?.phone_number?.includes(searchTerm) ||
//         formatDateForDisplay(booking.booking_date).includes(searchTerm)

//       const matchesDate = !dateFilter || booking.booking_date === dateFilter
//       const matchesStatus = statusFilter === "all" || booking.status === statusFilter

//       return matchesSearch && matchesDate && matchesStatus
//     })
//   }, [bookings, searchTerm, dateFilter, statusFilter])

//   // Filter logic for complaints
//   const filteredComplaints = useMemo(() => {
//     return complaints.filter((complaint) => {
//       const matchesSearch =
//         !searchTerm ||
//         complaint.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         complaint.profiles?.phone_number?.includes(searchTerm) ||
//         complaint.complaint_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         complaint.subcategory.toLowerCase().includes(searchTerm.toLowerCase())

//       const matchesStatus = complaintStatusFilter === "all" || complaint.status === complaintStatusFilter

//       return matchesSearch && matchesStatus
//     })
//   }, [complaints, searchTerm, complaintStatusFilter])

//   const residentsDisplay = useMemo(
//     () => filterByPeriod(filteredProfiles, residentsPeriod, (p) => p.created_at),
//     [filteredProfiles, residentsPeriod],
//   )
//   const bookingsDisplay = useMemo(
//     () => filterByPeriod(filteredBookings, bookingsPeriod, (b) => b.booking_date),
//     [filteredBookings, bookingsPeriod],
//   )
//   const complaintsDisplay = useMemo(
//     () => filterByPeriod(filteredComplaints, complaintsPeriod, (c) => c.created_at),
//     [filteredComplaints, complaintsPeriod],
//   )

//   const stats = useMemo(() => {
//     const totalBookings = bookings.filter((b) => b.status === "confirmed").length
//     const todayBookings = bookings.filter(
//       (b) => b.booking_date === new Date().toISOString().split("T")[0] && b.status === "confirmed",
//     ).length
//     const pendingComplaints = complaints.filter((c) => c.status === "pending").length
//     const unpaidMaintenance = profiles.filter((p) => !p.maintenance_paid).length
//     const pendingPayments = bookings.filter((b) => b.payment_status === "pending").length
//     const totalRevenue = bookings
//       .filter((b) => b.payment_status === "paid")
//       .reduce((sum, b) => sum + b.booking_charges, 0)

//     return { totalBookings, todayBookings, pendingComplaints, unpaidMaintenance, pendingPayments, totalRevenue }
//   }, [bookings, complaints, profiles])

//   const getStatusBadgeVariant = (status: string) => {
//     switch (status) {
//       case "confirmed":
//       case "completed":
//       case "paid":
//         return "default"
//       case "pending":
//         return "secondary"
//       case "in-progress":
//         return "outline"
//       case "cancelled":
//         return "destructive"
//       default:
//         return "secondary"
//     }
//   }

//   const editUser = async () => {
//     if (!editingUser || !editingUser.name || !editingUser.phone_number || !editingUser.apartment_number) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       })
//       return
//     }

//     const { error } = await supabase
//       .from("profiles")
//       .update({
//         name: editingUser.name,
//         phone_number: editingUser.phone_number.startsWith("+")
//           ? editingUser.phone_number
//           : `+${editingUser.phone_number}`,
//         cnic: editingUser.cnic,
//         apartment_number: editingUser.apartment_number,
//         building_block: editingUser.building_block,
//         maintenance_charges: editingUser.maintenance_charges,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", editingUser.id)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to update user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User updated successfully",
//       })
//       setEditingUser(null)
//       setIsEditUserOpen(false)
//       fetchProfiles()
//     }
//   }

//   const deleteUser = async (userId: string, userName: string) => {
//     if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
//       return
//     }

//     const { error } = await supabase.from("profiles").delete().eq("id", userId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to delete user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User deleted successfully",
//       })
//       fetchProfiles()
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
//         <div className="container mx-auto p-6 space-y-6">
//           <div className="flex items-center gap-2 mb-6">
//             <Skeleton className="h-8 w-8" />
//             <Skeleton className="h-8 w-64" />
//           </div>
//           <div className="grid gap-4 md:grid-cols-6">
//             {[...Array(6)].map((_, i) => (
//               <Card key={i} className="border-0 shadow-lg">
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <Skeleton className="h-4 w-20" />
//                   <Skeleton className="h-4 w-4" />
//                 </CardHeader>
//                 <CardContent>
//                   <Skeleton className="h-8 w-16" />
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
//       <div className="container mx-auto p-6 space-y-8">
//         {/* Enhanced Header */}
//         <div className="bg-white rounded-2xl shadow-xl border-0 p-8">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
//                 <Building2 className="h-8 w-8 text-white" />
//               </div>
//               <div>
//                 <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
//                   Community Management
//                 </h1>
//                 <p className="text-gray-600 text-lg mt-1">Professional Dashboard for Residential Management</p>
//               </div>
//             </div>
//             <Button
//               onClick={refreshData}
//               variant="outline"
//               disabled={refreshing}
//               className="gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200"
//             >
//               <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
//               Refresh Data
//             </Button>
//           </div>
//         </div>

//         {/* Enhanced Stats Cards */}
//         <div className="grid gap-6 md:grid-cols-6">
//           <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-blue-100">Total Residents</CardTitle>
//               <Users className="h-5 w-5 text-blue-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{profiles.length}</div>
//               <p className="text-xs text-blue-200 mt-1">Active community members</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-green-100">Active Bookings</CardTitle>
//               <Calendar className="h-5 w-5 text-green-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.totalBookings}</div>
//               <p className="text-xs text-green-200 mt-1">Confirmed reservations</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-orange-100">Pending Issues</CardTitle>
//               <AlertTriangle className="h-5 w-5 text-orange-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.pendingComplaints}</div>
//               <p className="text-xs text-orange-200 mt-1">Awaiting resolution</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-red-500 to-red-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-red-100">Unpaid Maintenance</CardTitle>
//               <CreditCard className="h-5 w-5 text-red-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.unpaidMaintenance}</div>
//               <p className="text-xs text-red-200 mt-1">Outstanding payments</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-purple-100">Pending Payments</CardTitle>
//               <Clock className="h-5 w-5 text-purple-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.pendingPayments}</div>
//               <p className="text-xs text-purple-200 mt-1">Booking payments due</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-blue-100">Today&apos;s Bookings</CardTitle>
//               <Calendar className="h-5 w-5 text-blue-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.todayBookings}</div>
//               <p className="text-xs text-blue-200 mt-1">Confirmed for today</p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Enhanced Tabs */}
//         <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
//           <Tabs defaultValue="residents" className="w-full">
//             <div className="border-b border-gray-100 bg-gray-50/50">
//               <TabsList className="grid w-full grid-cols-5 bg-transparent h-16 p-2">
//                 <TabsTrigger
//                   value="residents"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-blue-600 transition-all duration-200"
//                 >
//                   <Users className="h-4 w-4 mr-2" />
//                   Residents
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="bookings"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-green-600 transition-all duration-200"
//                 >
//                   <Calendar className="h-4 w-4 mr-2" />
//                   Bookings
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="complaints"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-orange-600 transition-all duration-200"
//                 >
//                   <MessageSquare className="h-4 w-4 mr-2" />
//                   Complaints
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="grouped-complaints"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-purple-600 transition-all duration-200"
//                 >
//                   <BarChart3 className="h-4 w-4 mr-2" />
//                   Analytics
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="settings"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-gray-800 transition-all duration-200"
//                 >
//                   <Settings className="h-4 w-4 mr-2" />
//                   Settings
//                 </TabsTrigger>
//               </TabsList>
//             </div>

//             {/* Residents Tab */}
//             <TabsContent value="residents" className="p-6">
//               <div className="space-y-6">
//                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//                   <div>
//                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                       <Users className="h-6 w-6 text-blue-600" />
//                       Residents Management
//                     </h2>
//                     <p className="text-gray-600 mt-1">Manage community residents and their information</p>
//                   </div>

//                   <div className="flex flex-col sm:flex-row gap-3">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                       <Input
//                         placeholder="Search residents..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="pl-10 w-full sm:w-64 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
//                       />
//                     </div>

//                     <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
//                       <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                         <Filter className="h-4 w-4 mr-2" />
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Status</SelectItem>
//                         <SelectItem value="paid">Paid</SelectItem>
//                         <SelectItem value="unpaid">Unpaid</SelectItem>
//                       </SelectContent>
//                     </Select>

//                     <div className="flex items-center gap-2">
//                       <Select value={residentsPeriod} onValueChange={setResidentsPeriod}>
//                         <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                           <Filter className="h-4 w-4 mr-2" />
//                           <SelectValue placeholder="Period" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="all">All Time</SelectItem>
//                           <SelectItem value="daily">Today</SelectItem>
//                           <SelectItem value="weekly">This Week</SelectItem>
//                           <SelectItem value="monthly">This Month</SelectItem>
//                           <SelectItem value="yearly">This Year</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <Button
//                         onClick={() => {
//                           void exportToPdf({
//                             title: "Residents Report",
//                             periodLabel: periodLabel(residentsPeriod),
//                             columns: [
//                               { header: "Name", dataKey: "name" },
//                               { header: "Phone", dataKey: "phone" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Maintenance (Rs)", dataKey: "maintenance" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: residentsDisplay.map((p) => ({
//                               name: p.name || "N/A",
//                               phone: p.phone_number || "N/A",
//                               apartment: p.apartment_number || "N/A",
//                               maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
//                               status: p.maintenance_paid ? "Paid" : "Unpaid",
//                             })),
//                             filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
//                             fileName: `residents-${residentsPeriod}-filtered.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (filtered)
//                       </Button>
//                       <Button
//                         onClick={() => {
//                           const allResidents = filterByPeriod(profiles, residentsPeriod, (p) => p.created_at)
//                           void exportToPdf({
//                             title: "Residents Report",
//                             periodLabel: periodLabel(residentsPeriod),
//                             columns: [
//                               { header: "Name", dataKey: "name" },
//                               { header: "Phone", dataKey: "phone" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Maintenance (Rs)", dataKey: "maintenance" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: allResidents.map((p) => ({
//                               name: p.name || "N/A",
//                               phone: p.phone_number || "N/A",
//                               apartment: p.apartment_number || "N/A",
//                               maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
//                               status: p.maintenance_paid ? "Paid" : "Unpaid",
//                             })),
//                             fileName: `residents-${residentsPeriod}-all.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (all)
//                       </Button>
//                     </div>

//                     <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
//                       <DialogTrigger asChild>
//                         <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200">
//                           <UserPlus className="h-4 w-4" />
//                           Add Resident
//                         </Button>
//                       </DialogTrigger>
//                       <DialogContent className="sm:max-w-[500px]">
//                         <DialogHeader>
//                           <DialogTitle className="text-xl font-semibold">Add New Resident</DialogTitle>
//                         </DialogHeader>
//                         <div className="grid gap-4 py-4">
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="name" className="text-right font-medium">
//                               Name *
//                             </Label>
//                             <Input
//                               id="name"
//                               value={newUser.name}
//                               onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
//                               className="col-span-3"
//                               placeholder="Enter full name"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="phone" className="text-right font-medium">
//                               Phone *
//                             </Label>
//                             <Input
//                               id="phone"
//                               value={newUser.phone_number}
//                               onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
//                               className="col-span-3"
//                               placeholder="+1234567890"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="apartment" className="text-right font-medium">
//                               Apartment *
//                             </Label>
//                             <Input
//                               id="apartment"
//                               value={newUser.apartment_number}
//                               onChange={(e) => setNewUser({ ...newUser, apartment_number: e.target.value })}
//                               className="col-span-3"
//                               placeholder="A-101"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="building" className="text-right font-medium">
//                               Building
//                             </Label>
//                             <Input
//                               id="building"
//                               value={newUser.building_block}
//                               onChange={(e) => setNewUser({ ...newUser, building_block: e.target.value })}
//                               className="col-span-3"
//                               placeholder="Block A"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="cnic" className="text-right font-medium">
//                               CNIC
//                             </Label>
//                             <Input
//                               id="cnic"
//                               value={newUser.cnic}
//                               onChange={(e) => setNewUser({ ...newUser, cnic: e.target.value })}
//                               className="col-span-3"
//                               placeholder="12345-6789012-3"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="maintenance" className="text-right font-medium">
//                               Maintenance
//                             </Label>
//                             <Input
//                               id="maintenance"
//                               type="number"
//                               value={newUser.maintenance_charges}
//                               onChange={(e) => setNewUser({ ...newUser, maintenance_charges: Number(e.target.value) })}
//                               className="col-span-3"
//                               placeholder="5000"
//                             />
//                           </div>
//                         </div>
//                         <div className="flex justify-end gap-3 pt-4">
//                           <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
//                             Cancel
//                           </Button>
//                           <Button onClick={addNewUser} className="bg-blue-600 hover:bg-blue-700">
//                             Add Resident
//                           </Button>
//                         </div>
//                       </DialogContent>
//                     </Dialog>
//                   </div>
//                 </div>

//                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow className="bg-gray-50/50">
//                         <TableHead className="font-semibold text-gray-700">Name</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Phone</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Maintenance</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                         <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {residentsDisplay.length === 0 ? (
//                         <TableRow>
//                           <TableCell colSpan={6} className="text-center py-12">
//                             <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                             <p className="text-gray-500 text-lg font-medium">
//                               {profiles.length === 0 ? "No residents yet" : "No residents match your filters"}
//                             </p>
//                             <p className="text-gray-400 text-sm mt-1">
//                               {profiles.length === 0
//                                 ? "Add your first resident to get started"
//                                 : "Try adjusting your search criteria or period"}
//                             </p>
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         residentsDisplay.map((profile) => (
//                           <TableRow key={profile.id} className="hover:bg-gray-50/50 transition-colors">
//                             <TableCell className="font-medium text-gray-900">{profile.name}</TableCell>
//                             <TableCell className="text-gray-600">{profile.phone_number}</TableCell>
//                             <TableCell className="text-gray-600">{profile.apartment_number}</TableCell>
//                             <TableCell className="text-gray-600">
//                               Rs. {profile.maintenance_charges.toLocaleString()}
//                             </TableCell>
//                             <TableCell>
//                               <Badge
//                                 variant={profile.maintenance_paid ? "default" : "destructive"}
//                                 className={
//                                   profile.maintenance_paid ? "bg-green-100 text-green-800 hover:bg-green-200" : ""
//                                 }
//                               >
//                                 {profile.maintenance_paid ? (
//                                   <>
//                                     <CheckCircle className="h-3 w-3 mr-1" />
//                                     Paid
//                                   </>
//                                 ) : (
//                                   <>
//                                     <XCircle className="h-3 w-3 mr-1" />
//                                     Unpaid
//                                   </>
//                                 )}
//                               </Badge>
//                             </TableCell>
//                             <TableCell className="text-right">
//                               <div className="flex gap-2 justify-end">
//                                 <Dialog>
//                                   <DialogTrigger asChild>
//                                     {/* Updated View button block */}
//                                     <Link href={`/admin/residents/${profile.id}`}>
//                                       <Button
//                                         variant="outline"
//                                         size="sm"
//                                         className="hover:bg-blue-50 hover:border-blue-200 bg-transparent"
//                                       >
//                                         <Eye className="h-4 w-4 mr-1" />
//                                         Open Profile
//                                       </Button>
//                                     </Link>
//                                   </DialogTrigger>
//                                   <DialogContent className="sm:max-w-[600px]">
//                                     <DialogHeader>
//                                       <DialogTitle className="text-xl font-semibold">Resident Details</DialogTitle>
//                                     </DialogHeader>
//                                     {selectedProfile && (
//                                       <div className="grid gap-6 py-4">
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Name</Label>
//                                             <p className="text-gray-900 font-medium">{selectedProfile.name}</p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Phone</Label>
//                                             <p className="text-gray-900">{selectedProfile.phone_number}</p>
//                                           </div>
//                                         </div>
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Apartment</Label>
//                                             <p className="text-gray-900">{selectedProfile.apartment_number}</p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Building</Label>
//                                             <p className="text-gray-900">{selectedProfile.building_block || "N/A"}</p>
//                                           </div>
//                                         </div>
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">CNIC</Label>
//                                             <p className="text-gray-900">{selectedProfile.cnic || "N/A"}</p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">
//                                               Maintenance Charges
//                                             </Label>
//                                             <p className="text-gray-900">
//                                               Rs. {selectedProfile.maintenance_charges.toLocaleString()}
//                                             </p>
//                                           </div>
//                                         </div>
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Payment Status</Label>
//                                             <Badge
//                                               variant={selectedProfile.maintenance_paid ? "default" : "destructive"}
//                                             >
//                                               {selectedProfile.maintenance_paid ? "Paid" : "Unpaid"}
//                                             </Badge>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Last Payment</Label>
//                                             <p className="text-gray-900">
//                                               {selectedProfile.last_payment_date
//                                                 ? formatDateForDisplay(selectedProfile.last_payment_date)
//                                                 : "Never"}
//                                             </p>
//                                           </div>
//                                         </div>
//                                         <div className="space-y-2">
//                                           <Label className="text-sm font-medium text-gray-700">Account Status</Label>
//                                           <Badge variant={selectedProfile.is_active ? "default" : "destructive"}>
//                                             {selectedProfile.is_active ? "Active" : "Inactive"}
//                                           </Badge>
//                                         </div>
//                                       </div>
//                                     )}
//                                   </DialogContent>
//                                 </Dialog>

//                                 <Button
//                                   variant="outline"
//                                   size="sm"
//                                   onClick={() => {
//                                     setEditingUser(profile)
//                                     setIsEditUserOpen(true)
//                                   }}
//                                   className="hover:bg-blue-50 hover:border-blue-200 text-blue-600"
//                                 >
//                                   <Edit className="h-4 w-4" />
//                                 </Button>

//                                 <Button
//                                   variant="outline"
//                                   size="sm"
//                                   onClick={() => updateMaintenanceStatus(profile.id, !profile.maintenance_paid)}
//                                   className={
//                                     profile.maintenance_paid
//                                       ? "hover:bg-red-50 hover:border-red-200 text-red-600"
//                                       : "hover:bg-green-50 hover:border-green-200 text-green-600"
//                                   }
//                                 >
//                                   {profile.maintenance_paid ? (
//                                     <>
//                                       <XCircle className="h-4 w-4 mr-1" />
//                                       Mark Unpaid
//                                     </>
//                                   ) : (
//                                     <>
//                                       <CheckCircle className="h-4 w-4 mr-1" />
//                                       Mark Paid
//                                     </>
//                                   )}
//                                 </Button>

//                                 <Button
//                                   variant="outline"
//                                   size="sm"
//                                   onClick={() => deleteUser(profile.id, profile.name)}
//                                   className="hover:bg-red-50 hover:border-red-200 text-red-600"
//                                 >
//                                   <Trash2 className="h-4 w-4" />
//                                 </Button>
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Bookings Tab */}
//             <TabsContent value="bookings" className="p-6">
//               <div className="space-y-6">
//                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//                   <div>
//                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                       <Calendar className="h-6 w-6 text-green-600" />
//                       Bookings Management
//                     </h2>
//                     <p className="text-gray-600 mt-1">Track and manage community hall bookings</p>
//                   </div>

//                   <div className="flex flex-col sm:flex-row gap-3">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                       <Input
//                         placeholder="Search bookings..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="pl-10 w-full sm:w-64 border-gray-200 focus:border-green-500 focus:ring-green-500"
//                       />
//                     </div>

//                     <Input
//                       type="date"
//                       value={dateFilter}
//                       onChange={(e) => setDateFilter(e.target.value)}
//                       className="w-full sm:w-auto border-gray-200"
//                     />

//                     <Select value={statusFilter} onValueChange={setStatusFilter}>
//                       <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                         <Filter className="h-4 w-4 mr-2" />
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Status</SelectItem>
//                         <SelectItem value="confirmed">Confirmed</SelectItem>
//                         <SelectItem value="cancelled">Cancelled</SelectItem>
//                         <SelectItem value="payment_pending">Payment Pending</SelectItem>
//                       </SelectContent>
//                     </Select>

//                     <div className="flex items-center gap-2">
//                       <Select value={bookingsPeriod} onValueChange={setBookingsPeriod}>
//                         <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                           <Filter className="h-4 w-4 mr-2" />
//                           <SelectValue placeholder="Period" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="all">All Time</SelectItem>
//                           <SelectItem value="daily">Today</SelectItem>
//                           <SelectItem value="weekly">This Week</SelectItem>
//                           <SelectItem value="monthly">This Month</SelectItem>
//                           <SelectItem value="yearly">This Year</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <Button
//                         onClick={() => {
//                           void exportToPdf({
//                             title: "Bookings Report",
//                             periodLabel: periodLabel(bookingsPeriod),
//                             columns: [
//                               { header: "Customer", dataKey: "customer" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Date", dataKey: "date" },
//                               { header: "Time", dataKey: "time" },
//                               { header: "Amount", dataKey: "amount" },
//                               { header: "Payment", dataKey: "payment" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: bookingsDisplay.map((b) => ({
//                               customer: b.profiles?.name || "N/A",
//                               apartment: b.profiles?.apartment_number || "",
//                               date: formatDateForDisplay(b.booking_date),
//                               time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
//                               amount: `Rs. ${b.booking_charges.toLocaleString()}`,
//                               payment: b.payment_status,
//                               status: b.status,
//                             })),
//                             filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
//                             fileName: `bookings-${bookingsPeriod}-filtered.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (filtered)
//                       </Button>
//                       <Button
//                         onClick={() => {
//                           const allBookings = filterByPeriod(bookings, bookingsPeriod, (b) => b.booking_date)
//                           void exportToPdf({
//                             title: "Bookings Report",
//                             periodLabel: periodLabel(bookingsPeriod),
//                             columns: [
//                               { header: "Customer", dataKey: "customer" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Date", dataKey: "date" },
//                               { header: "Time", dataKey: "time" },
//                               { header: "Amount", dataKey: "amount" },
//                               { header: "Payment", dataKey: "payment" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: allBookings.map((b) => ({
//                               customer: b.profiles?.name || "N/A",
//                               apartment: b.profiles?.apartment_number || "",
//                               date: formatDateForDisplay(b.booking_date),
//                               time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
//                               amount: `Rs. ${b.booking_charges.toLocaleString()}`,
//                               payment: b.payment_status,
//                               status: b.status,
//                             })),
//                             fileName: `bookings-${bookingsPeriod}-all.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (all)
//                       </Button>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow className="bg-gray-50/50">
//                         <TableHead className="font-semibold text-gray-700">Customer</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Date</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Time Slot</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Amount</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Payment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                         <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {bookingsDisplay.length === 0 ? (
//                         <TableRow>
//                           <TableCell colSpan={8} className="text-center py-12">
//                             <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                             <p className="text-gray-500 text-lg font-medium">
//                               {bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}
//                             </p>
//                             <p className="text-gray-400 text-sm mt-1">
//                               {bookings.length === 0
//                                 ? "Bookings will appear here once residents start booking"
//                                 : "Try adjusting your search, status, or period filters"}
//                             </p>
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         bookingsDisplay.map((booking) => (
//                           <TableRow key={booking.id} className="hover:bg-gray-50/50 transition-colors">
//                             <TableCell className="font-medium text-gray-900">
//                               {booking.profiles?.name || "N/A"}
//                             </TableCell>
//                             <TableCell className="text-gray-600">{booking.profiles?.apartment_number}</TableCell>
//                             <TableCell className="text-gray-600">
//                               {formatDateForDisplay(booking.booking_date)}
//                             </TableCell>
//                             <TableCell className="text-gray-600">
//                               {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
//                             </TableCell>
//                             <TableCell className="text-gray-600">
//                               Rs. {booking.booking_charges.toLocaleString()}
//                             </TableCell>
//                             <TableCell>
//                               <Badge
//                                 variant={getStatusBadgeVariant(booking.payment_status)}
//                                 className={
//                                   booking.payment_status === "paid"
//                                     ? "bg-green-100 text-green-800 hover:bg-green-200"
//                                     : ""
//                                 }
//                               >
//                                 {booking.payment_status === "paid" ? (
//                                   <>
//                                     <CheckCircle className="h-3 w-3 mr-1" />
//                                     Paid
//                                   </>
//                                 ) : (
//                                   <>
//                                     <Clock className="h-3 w-3 mr-1" />
//                                     Pending
//                                   </>
//                                 )}
//                               </Badge>
//                             </TableCell>
//                             <TableCell>
//                               <Badge variant={getStatusBadgeVariant(booking.status)}>
//                                 {booking.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
//                                 {booking.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
//                                 {booking.status}
//                               </Badge>
//                             </TableCell>
//                             <TableCell className="text-right">
//                               <div className="flex gap-2 justify-end">
//                                 {/* Updated payment toggle logic */}
//                                 {booking.payment_status === "pending" ? (
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     onClick={() => updateBookingPaymentStatus(booking.id, "paid")}
//                                     className="hover:bg-green-50 hover:border-green-200 text-green-600"
//                                   >
//                                     <CheckCircle className="h-4 w-4 mr-1" />
//                                     Mark Paid
//                                   </Button>
//                                 ) : booking.payment_status === "paid" ? (
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     onClick={async () => {
//                                       // toggle to unpaid and reset confirmation flag
//                                       const { error } = await supabase
//                                         .from("bookings")
//                                         .update({
//                                           payment_status: "pending",
//                                           payment_confirmation_sent: false,
//                                           updated_at: new Date().toISOString(),
//                                         })
//                                         .eq("id", booking.id)
//                                       if (error) {
//                                         toast({
//                                           title: "Error",
//                                           description: "Failed to mark unpaid",
//                                           variant: "destructive",
//                                         })
//                                       } else {
//                                         toast({ title: "Success", description: "Marked booking as unpaid" })
//                                         fetchBookings()
//                                       }
//                                     }}
//                                     className="hover:bg-red-50 hover:border-red-200 text-red-600"
//                                   >
//                                     <XCircle className="h-4 w-4 mr-1" />
//                                     Mark Unpaid
//                                   </Button>
//                                 ) : null}

//                                 {booking.status === "confirmed" && (
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     onClick={() => cancelBooking(booking.id)}
//                                     className="hover:bg-red-50 hover:border-red-200 text-red-600"
//                                   >
//                                     <X className="h-4 w-4 mr-1" />
//                                     Cancel
//                                   </Button>
//                                 )}
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Complaints Tab */}
//             <TabsContent value="complaints" className="p-6">
//               <div className="space-y-6">
//                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//                   <div>
//                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                       <MessageSquare className="h-6 w-6 text-orange-600" />
//                       Individual Complaints
//                     </h2>
//                     <p className="text-gray-600 mt-1">Track and resolve resident complaints</p>
//                   </div>

//                   <div className="flex flex-col sm:flex-row gap-3">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                       <Input
//                         placeholder="Search complaints..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="pl-10 w-full sm:w-64 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
//                       />
//                     </div>

//                     <Select value={complaintStatusFilter} onValueChange={setComplaintStatusFilter}>
//                       <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                         <Filter className="h-4 w-4 mr-2" />
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Status</SelectItem>
//                         <SelectItem value="pending">Pending</SelectItem>
//                         <SelectItem value="in-progress">In Progress</SelectItem>
//                         <SelectItem value="completed">Completed</SelectItem>
//                         <SelectItem value="cancelled">Cancelled</SelectItem>
//                       </SelectContent>
//                     </Select>

//                     <div className="flex items-center gap-2">
//                       <Select value={complaintsPeriod} onValueChange={setComplaintsPeriod}>
//                         <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                           <Filter className="h-4 w-4 mr-2" />
//                           <SelectValue placeholder="Period" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="all">All Time</SelectItem>
//                           <SelectItem value="daily">Today</SelectItem>
//                           <SelectItem value="weekly">This Week</SelectItem>
//                           <SelectItem value="monthly">This Month</SelectItem>
//                           <SelectItem value="yearly">This Year</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <Button
//                         onClick={() => {
//                           void exportToPdf({
//                             title: "Complaints Report",
//                             periodLabel: periodLabel(complaintsPeriod),
//                             columns: [
//                               { header: "Complaint ID", dataKey: "complaintId" },
//                               { header: "Customer", dataKey: "customer" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Category", dataKey: "category" },
//                               { header: "Type", dataKey: "type" },
//                               { header: "Status", dataKey: "status" },
//                               { header: "Created", dataKey: "created" },
//                             ],
//                             rows: complaintsDisplay.map((c) => ({
//                               complaintId: c.complaint_id,
//                               customer: c.profiles?.name || "N/A",
//                               apartment: c.profiles?.apartment_number || "",
//                               category: c.category,
//                               type: c.subcategory,
//                               status: c.status,
//                               created: formatDateTime(c.created_at),
//                             })),
//                             filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
//                             fileName: `complaints-${complaintsPeriod}-filtered.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (filtered)
//                       </Button>
//                       <Button
//                         onClick={() => {
//                           const allComplaints = filterByPeriod(complaints, complaintsPeriod, (c) => c.created_at)
//                           void exportToPdf({
//                             title: "Complaints Report",
//                             periodLabel: periodLabel(complaintsPeriod),
//                             columns: [
//                               { header: "Complaint ID", dataKey: "complaintId" },
//                               { header: "Customer", dataKey: "customer" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Category", dataKey: "category" },
//                               { header: "Type", dataKey: "type" },
//                               { header: "Status", dataKey: "status" },
//                               { header: "Created", dataKey: "created" },
//                             ],
//                             rows: allComplaints.map((c) => ({
//                               complaintId: c.complaint_id,
//                               customer: c.profiles?.name || "N/A",
//                               apartment: c.profiles?.apartment_number || "",
//                               category: c.category,
//                               type: c.subcategory,
//                               status: c.status,
//                               created: formatDateTime(c.created_at),
//                             })),
//                             fileName: `complaints-${complaintsPeriod}-all.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (all)
//                       </Button>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow className="bg-gray-50/50">
//                         <TableHead className="font-semibold text-gray-700">Complaint ID</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Customer</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Category</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Type</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Created</TableHead>
//                         <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {complaintsDisplay.length === 0 ? (
//                         <TableRow>
//                           <TableCell colSpan={8} className="text-center py-12">
//                             <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                             <p className="text-gray-500 text-lg font-medium">
//                               {complaints.length === 0 ? "No complaints yet" : "No complaints match your filters"}
//                             </p>
//                             <p className="text-gray-400 text-sm mt-1">
//                               {complaints.length === 0
//                                 ? "Complaints will appear here when residents report issues"
//                                 : "Try adjusting your search, status, or period filters"}
//                             </p>
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         complaintsDisplay.map((complaint) => (
//                           <TableRow key={complaint.id} className="hover:bg-gray-50/50 transition-colors">
//                             <TableCell className="font-medium text-gray-900">{complaint.complaint_id}</TableCell>
//                             <TableCell className="text-gray-600">{complaint.profiles?.name || "N/A"}</TableCell>
//                             <TableCell className="text-gray-600">{complaint.profiles?.apartment_number}</TableCell>
//                             <TableCell className="text-gray-600 capitalize">{complaint.category}</TableCell>
//                             <TableCell className="text-gray-600 capitalize">{complaint.subcategory}</TableCell>
//                             <TableCell>
//                               <Badge variant={getStatusBadgeVariant(complaint.status)}>
//                                 {complaint.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
//                                 {complaint.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
//                                 {complaint.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
//                                 {complaint.status}
//                               </Badge>
//                             </TableCell>
//                             <TableCell className="text-gray-600">{formatDateTime(complaint.created_at)}</TableCell>
//                             <TableCell className="text-right">
//                               <div className="flex gap-2 justify-end">
//                                 <Dialog>
//                                   <DialogTrigger asChild>
//                                     <Button
//                                       variant="outline"
//                                       size="sm"
//                                       onClick={() => setSelectedComplaint(complaint)}
//                                       className="hover:bg-orange-50 hover:border-orange-200"
//                                     >
//                                       <Eye className="h-4 w-4" />
//                                     </Button>
//                                   </DialogTrigger>
//                                   <DialogContent className="sm:max-w-[600px]">
//                                     <DialogHeader>
//                                       <DialogTitle className="text-xl font-semibold">Complaint Details</DialogTitle>
//                                     </DialogHeader>
//                                     {selectedComplaint && (
//                                       <div className="grid gap-6 py-4">
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Complaint ID</Label>
//                                             <p className="text-gray-900 font-medium">
//                                               {selectedComplaint.complaint_id}
//                                             </p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Status</Label>
//                                             <Badge variant={getStatusBadgeVariant(selectedComplaint.status)}>
//                                               {selectedComplaint.status}
//                                             </Badge>
//                                           </div>
//                                         </div>
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Customer</Label>
//                                             <p className="text-gray-900">{selectedComplaint.profiles?.name}</p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Apartment</Label>
//                                             <p className="text-gray-900">
//                                               {selectedComplaint.profiles?.apartment_number}
//                                             </p>
//                                           </div>
//                                         </div>
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Category</Label>
//                                             <p className="text-gray-900 capitalize">{selectedComplaint.category}</p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Type</Label>
//                                             <p className="text-gray-900 capitalize">{selectedComplaint.subcategory}</p>
//                                           </div>
//                                         </div>
//                                         {selectedComplaint.description && (
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Description</Label>
//                                             <div className="p-4 bg-gray-50 rounded-lg border">
//                                               <p className="text-gray-900">{selectedComplaint.description}</p>
//                                             </div>
//                                           </div>
//                                         )}
//                                         <div className="grid grid-cols-2 gap-6">
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Created</Label>
//                                             <p className="text-gray-900">
//                                               {formatDateTime(selectedComplaint.created_at)}
//                                             </p>
//                                           </div>
//                                           <div className="space-y-2">
//                                             <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
//                                             <p className="text-gray-900">
//                                               {formatDateTime(selectedComplaint.updated_at)}
//                                             </p>
//                                           </div>
//                                         </div>
//                                       </div>
//                                     )}
//                                   </DialogContent>
//                                 </Dialog>
//                                 {complaint.status !== "completed" && complaint.status !== "cancelled" && (
//                                   <Select
//                                     value={complaint.status}
//                                     onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
//                                   >
//                                     <SelectTrigger className="w-32">
//                                       <SelectValue />
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                       <SelectItem value="pending">Pending</SelectItem>
//                                       <SelectItem value="in-progress">In Progress</SelectItem>
//                                       <SelectItem value="completed">Completed</SelectItem>
//                                       <SelectItem value="cancelled">Cancelled</SelectItem>
//                                     </SelectContent>
//                                   </Select>
//                                 )}
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Grouped Complaints Tab */}
//             <TabsContent value="grouped-complaints" className="p-6">
//               <div className="space-y-6">
//                 <div>
//                   <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                     <BarChart3 className="h-6 w-6 text-purple-600" />
//                     Complaint Analytics
//                   </h2>
//                   <p className="text-gray-600 mt-1">View grouped complaints and identify common issues</p>
//                 </div>

//                 <div className="grid gap-6">
//                   {groupedComplaints.length === 0 ? (
//                     <div className="text-center py-12">
//                       <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                       <p className="text-gray-500 text-lg font-medium">No complaints to analyze</p>
//                       <p className="text-gray-400 text-sm mt-1">
//                         Complaint analytics will appear here when residents report issues
//                       </p>
//                     </div>
//                   ) : (
//                     groupedComplaints.map((group) => (
//                       <Card key={group.group_key} className="border-0 shadow-lg overflow-hidden">
//                         <div className="border-l-4 border-l-purple-500">
//                           <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
//                             <div className="flex items-center justify-between">
//                               <div>
//                                 <CardTitle className="text-xl capitalize text-gray-900">
//                                   {group.category} - {group.subcategory}
//                                 </CardTitle>
//                                 <p className="text-gray-600 mt-1">
//                                   {group.count} resident{group.count > 1 ? "s" : ""} reported this issue
//                                 </p>
//                               </div>
//                               <div className="flex items-center gap-3">
//                                 <Badge variant={getStatusBadgeVariant(group.status)} className="text-sm">
//                                   {group.status}
//                                 </Badge>
//                                 <Badge variant="outline" className="text-sm bg-white">
//                                   {group.count} complaints
//                                 </Badge>
//                               </div>
//                             </div>
//                           </CardHeader>
//                           <CardContent className="p-6">
//                             {/* {group.description && (
//                               <div className="mb-6">
//                                 <Label className="text-sm font-medium text-gray-700 mb-2 block">
//                                   Sample Description:
//                                 </Label>
//                                 <div className="p-4 bg-gray-50 rounded-lg border">
//                                   <p className="text-gray-900">{group.description}</p>
//                                 </div>
//                               </div>
//                             )} */}
//                             <div className="space-y-4">
//                               <Label className="text-sm font-medium text-gray-700">Affected Residents:</Label>
//                               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                                 {group.complaints.map((complaint) => (
//                                   <div
//                                     key={complaint.id}
//                                     className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
//                                   >
//                                     <div>
//                                       <p className="font-medium text-gray-900">
//                                         {complaint.profiles?.name} ({complaint.profiles?.apartment_number})
//                                       </p>
//                                       <p className="text-xs text-gray-500">{formatDateTime(complaint.created_at)}</p>
//                                       {complaint.description && (
//                                         <div className="flex items-center space-x-2">
//                                           <p className="text-md text-gray-750">Description : </p>
//                                           <p className="text-md text-gray-700">{complaint.description}</p>
//                                         </div>
//                                       )}
//                                     </div>
//                                     <Badge variant={getStatusBadgeVariant(complaint.status)} className="text-xs">
//                                       {complaint.status}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                             <div className="mt-6 flex gap-3">
//                               <Select
//                                 value={group.status}
//                                 onValueChange={(value) => {
//                                   // Update all complaints in this group
//                                   group.complaints.forEach((complaint) => {
//                                     updateComplaintStatus(complaint.id, value)
//                                   })
//                                 }}
//                               >
//                                 <SelectTrigger className="w-48">
//                                   <SelectValue />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                   <SelectItem value="pending">Mark All Pending</SelectItem>
//                                   <SelectItem value="in-progress">Mark All In Progress</SelectItem>
//                                   <SelectItem value="completed">Mark All Completed</SelectItem>
//                                 </SelectContent>
//                               </Select>
//                             </div>
//                           </CardContent>
//                         </div>
//                       </Card>
//                     ))
//                   )}
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Settings Tab */}
//             <TabsContent value="settings" className="p-6">
//               <div className="space-y-8">
//                 <div>
//                   <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                     <Settings className="h-6 w-6 text-gray-700" />
//                     System Settings
//                   </h2>
//                   <p className="text-gray-600 mt-1">Configure booking settings and view system statistics</p>
//                 </div>

//                 <div className="grid gap-8 lg:grid-cols-2">
//                   <Card className="border-0 shadow-lg">
//                     <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
//                       <CardTitle className="flex items-center gap-2 text-xl">
//                         <Settings className="h-5 w-5 text-blue-600" />
//                         Booking Configuration
//                       </CardTitle>
//                     </CardHeader>
//                     <CardContent className="p-6 space-y-6">
//                       <div className="grid grid-cols-2 gap-4">
//                         <div className="space-y-2">
//                           <Label className="text-sm font-medium text-gray-700">Start Time</Label>
//                           <Input
//                             type="time"
//                             value={startTime}
//                             onChange={(e) => setStartTime(e.target.value)}
//                             className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
//                           />
//                         </div>
//                         <div className="space-y-2">
//                           <Label className="text-sm font-medium text-gray-700">End Time</Label>
//                           <Input
//                             type="time"
//                             value={endTime}
//                             onChange={(e) => setEndTime(e.target.value)}
//                             className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
//                           />
//                         </div>
//                       </div>

//                       <div className="space-y-2">
//                         <Label className="text-sm font-medium text-gray-700">Slot Duration</Label>
//                         <Select
//                           value={slotDuration.toString()}
//                           onValueChange={(value) => setSlotDuration(Number.parseInt(value))}
//                         >
//                           <SelectTrigger className="border-gray-200">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="15">15 minutes</SelectItem>
//                             <SelectItem value="30">30 minutes</SelectItem>
//                             <SelectItem value="60">1 hour</SelectItem>
//                             <SelectItem value="120">2 hours</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </div>

//                       <div className="space-y-3">
//                         <Label className="text-sm font-medium text-gray-700">Working Days</Label>
//                         <div className="grid grid-cols-2 gap-3">
//                           {[
//                             { value: 1, label: "Monday" },
//                             { value: 2, label: "Tuesday" },
//                             { value: 3, label: "Wednesday" },
//                             { value: 4, label: "Thursday" },
//                             { value: 5, label: "Friday" },
//                             { value: 6, label: "Saturday" },
//                             { value: 7, label: "Sunday" },
//                           ].map((day) => (
//                             <div
//                               key={day.value}
//                               className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
//                             >
//                               <input
//                                 type="checkbox"
//                                 id={`day-${day.value}`}
//                                 checked={workingDays.includes(day.value)}
//                                 onChange={(e) => {
//                                   if (e.target.checked) {
//                                     setWorkingDays([...workingDays, day.value])
//                                   } else {
//                                     setWorkingDays(workingDays.filter((d) => d !== day.value))
//                                   }
//                                 }}
//                                 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//                               />
//                               <label htmlFor={`day-${day.value}`} className="text-sm font-medium text-gray-700">
//                                 {day.label}
//                               </label>
//                             </div>
//                           ))}
//                         </div>
//                       </div>

//                       <Button
//                         onClick={saveSettings}
//                         disabled={saving}
//                         className="w-full gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
//                       >
//                         {saving ? (
//                           <>
//                             <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
//                             Saving...
//                           </>
//                         ) : (
//                           <>
//                             <CheckCircle className="h-4 w-4" />
//                             Save Settings
//                           </>
//                         )}
//                       </Button>
//                     </CardContent>
//                   </Card>

//                   {/* <Card className="border-0 shadow-lg">
//                     <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
//                       <CardTitle className="flex items-center gap-2 text-xl">
//                         <BarChart3 className="h-5 w-5 text-emerald-600" />
//                         System Statistics
//                       </CardTitle>
//                     </CardHeader>
//                     <CardContent className="p-6">
//                       <div className="space-y-6">
//                         <div className="grid grid-cols-2 gap-4">
//                           <div className="text-center p-4 bg-blue-50 rounded-lg">
//                             <div className="text-2xl font-bold text-blue-600">{profiles.length}</div>
//                             <div className="text-sm text-blue-700 font-medium">Total Residents</div>
//                           </div>
//                           <div className="text-center p-4 bg-green-50 rounded-lg">
//                             <div className="text-2xl font-bold text-green-600">{stats.totalBookings}</div>
//                             <div className="text-sm text-green-700 font-medium">Active Bookings</div>
//                           </div>
//                         </div>

//                         <div className="space-y-4">
//                           <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                             <span className="text-sm font-medium text-gray-700">Total Complaints</span>
//                             <span className="font-semibold text-gray-900">{complaints.length}</span>
//                           </div>
//                           <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
//                             <span className="text-sm font-medium text-orange-700">Pending Complaints</span>
//                             <span className="font-semibold text-orange-600">{stats.pendingComplaints}</span>
//                           </div>
//                           <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
//                             <span className="text-sm font-medium text-red-700">Unpaid Maintenance</span>
//                             <span className="font-semibold text-red-600">{stats.unpaidMaintenance}</span>
//                           </div>
//                           <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
//                             <span className="text-sm font-medium text-purple-700">Pending Payments</span>
//                             <span className="font-semibold text-purple-600">{stats.pendingPayments}</span>
//                           </div>
//                           <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
//                             <span className="text-sm font-medium text-emerald-700">Total Revenue</span>
//                             <span className="font-semibold text-emerald-600">
//                               Rs. {stats.totalRevenue.toLocaleString()}
//                             </span>
//                           </div>
//                         </div>

//                         <div className="pt-4 border-t border-gray-200">
//                           <div className="text-center">
//                             <div className="text-xs text-gray-500 mb-2">System Health</div>
//                             <div className="flex items-center justify-center gap-2">
//                               <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
//                               <span className="text-sm font-medium text-green-600">All Systems Operational</span>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </CardContent>
//                   </Card> */}
//                 </div>
//               </div>
//             </TabsContent>
//           </Tabs>
//         </div>

//         {/* Edit User Dialog */}
//         <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
//           <DialogContent className="sm:max-w-[500px]">
//             <DialogHeader>
//               <DialogTitle className="text-xl font-semibold">Edit Resident</DialogTitle>
//             </DialogHeader>
//             {editingUser && (
//               <div className="grid gap-4 py-4">
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-name" className="text-right font-medium">
//                     Name *
//                   </Label>
//                   <Input
//                     id="edit-name"
//                     value={editingUser.name}
//                     onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
//                     className="col-span-3"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-phone" className="text-right font-medium">
//                     Phone *
//                   </Label>
//                   <Input
//                     id="edit-phone"
//                     value={editingUser.phone_number}
//                     onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
//                     className="col-span-3"
//                     placeholder="+1234567890"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-apartment" className="text-right font-medium">
//                     Apartment *
//                   </Label>
//                   <Input
//                     id="edit-apartment"
//                     value={editingUser.apartment_number}
//                     onChange={(e) => setEditingUser({ ...editingUser, apartment_number: e.target.value })}
//                     className="col-span-3"
//                     placeholder="A-101"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-building" className="text-right font-medium">
//                     Building
//                   </Label>
//                   <Input
//                     id="edit-building"
//                     value={editingUser.building_block || ""}
//                     onChange={(e) => setEditingUser({ ...editingUser, building_block: e.target.value })}
//                     className="col-span-3"
//                     placeholder="Block A"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-cnic" className="text-right font-medium">
//                     CNIC
//                   </Label>
//                   <Input
//                     id="edit-cnic"
//                     value={editingUser.cnic || ""}
//                     onChange={(e) => setEditingUser({ ...editingUser, cnic: e.target.value })}
//                     className="col-span-3"
//                     placeholder="12345-6789012-3"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="edit-maintenance" className="text-right font-medium">
//                     Maintenance
//                   </Label>
//                   <Input
//                     id="edit-maintenance"
//                     type="number"
//                     value={editingUser.maintenance_charges}
//                     onChange={(e) => setEditingUser({ ...editingUser, maintenance_charges: Number(e.target.value) })}
//                     className="col-span-3"
//                   />
//                 </div>
//               </div>
//             )}
//             <div className="flex justify-end gap-3 pt-4">
//               <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
//                 Cancel
//               </Button>
//               <Button onClick={editUser} className="bg-blue-600 hover:bg-blue-700">
//                 Update Resident
//               </Button>
//             </div>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </div>
//   )
// }


// "use client"

// import { useState, useEffect, useMemo } from "react"
// import {
//   supabase,
//   type BookingSettings,
//   type Booking,
//   type Complaint,
//   type Profile,
//   type GroupedComplaint,
// } from "@/lib/supabase"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import {
//   Calendar,
//   Users,
//   Settings,
//   RefreshCw,
//   AlertTriangle,
//   MessageSquare,
//   Eye,
//   CreditCard,
//   UserPlus,
//   Building2,
//   Clock,
//   Search,
//   Filter,
//   BarChart3,
// } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Skeleton } from "@/components/ui/skeleton"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"
// import { formatDateForDisplay } from "@/lib/time-utils"
// import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"

// function complaintStatusLabel(status: string) {
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

// export default function AdminPanel() {
//   const [settings, setSettings] = useState<BookingSettings | null>(null)
//   const [bookings, setBookings] = useState<Booking[]>([])
//   const [complaints, setComplaints] = useState<Complaint[]>([])
//   const [profiles, setProfiles] = useState<Profile[]>([])
//   const [groupedComplaints, setGroupedComplaints] = useState<GroupedComplaint[]>([])
//   const [loading, setLoading] = useState(true)
//   const [saving, setSaving] = useState(false)
//   const [refreshing, setRefreshing] = useState(false)
//   const [searchTerm, setSearchTerm] = useState("")
//   const [dateFilter, setDateFilter] = useState("")
//   const [statusFilter, setStatusFilter] = useState("all")
//   const [complaintStatusFilter, setComplaintStatusFilter] = useState("all")
//   const [maintenanceFilter, setMaintenanceFilter] = useState("all")
//   const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
//   const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
//   const [isAddUserOpen, setIsAddUserOpen] = useState(false)
//   const [isEditUserOpen, setIsEditUserOpen] = useState(false)
//   const [editingUser, setEditingUser] = useState<Profile | null>(null)

//   // Settings form state
//   const [startTime, setStartTime] = useState("09:00")
//   const [endTime, setEndTime] = useState("17:00")
//   const [slotDuration, setSlotDuration] = useState(60)
//   const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])

//   // New user form state
//   const [newUser, setNewUser] = useState({
//     name: "",
//     phone_number: "",
//     cnic: "",
//     apartment_number: "",
//     building_block: "",
//     maintenance_charges: 5000,
//   })

//   // PDF export state
//   const [residentsPeriod, setResidentsPeriod] = useState<Period>("all")
//   const [bookingsPeriod, setBookingsPeriod] = useState<Period>("all")
//   const [complaintsPeriod, setComplaintsPeriod] = useState<Period>("all")

//   const { toast } = useToast()

//   useEffect(() => {
//     fetchData()
//   }, [])

//   const fetchData = async () => {
//     setLoading(true)
//     await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles()])
//     setLoading(false)
//   }

//   const refreshData = async () => {
//     setRefreshing(true)
//     await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles()])
//     setRefreshing(false)
//     toast({
//       title: "Data Refreshed",
//       description: "All data has been updated successfully",
//     })
//   }

//   const fetchSettings = async () => {
//     const { data, error } = await supabase.from("booking_settings").select("*").single()

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch booking settings",
//         variant: "destructive",
//       })
//     } else {
//       setSettings(data)
//       setStartTime(data.start_time.substring(0, 5))
//       setEndTime(data.end_time.substring(0, 5))
//       setSlotDuration(data.slot_duration_minutes)
//       setWorkingDays(data.working_days)
//     }
//   }

//   const fetchBookings = async () => {
//     const { data, error } = await supabase
//       .from("bookings")
//       .select(
//         `
//         *,
//         profiles (name, phone_number, apartment_number)
//       `,
//       )
//       .order("booking_date", { ascending: false })
//       .order("start_time", { ascending: true })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch bookings",
//         variant: "destructive",
//       })
//     } else {
//       setBookings(data || [])
//     }
//   }

//   const fetchComplaints = async () => {
//     const { data, error } = await supabase
//       .from("complaints")
//       .select(
//         `
//         *,
//         profiles (name, phone_number, apartment_number)
//       `,
//       )
//       .order("created_at", { ascending: false })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch complaints",
//         variant: "destructive",
//       })
//     } else {
//       setComplaints(data || [])
//       groupComplaintsByType(data || [])
//     }
//   }

//   const fetchProfiles = async () => {
//     const { data, error } = await supabase.from("profiles").select("*").order("apartment_number", { ascending: true })

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch profiles",
//         variant: "destructive",
//       })
//     } else {
//       setProfiles(data || [])
//     }
//   }

//   const groupComplaintsByType = (complaintsData: Complaint[]) => {
//     const grouped = complaintsData.reduce(
//       (acc, complaint) => {
//         const key = complaint.group_key || `${complaint.category}_${complaint.subcategory}`

//         if (!acc[key]) {
//           acc[key] = {
//             group_key: key,
//             category: complaint.category,
//             subcategory: complaint.subcategory,
//             description: complaint.description,
//             status: complaint.status,
//             count: 0,
//             latest_date: complaint.created_at,
//             complaints: [],
//           }
//         }

//         acc[key].complaints.push(complaint)
//         acc[key].count++

//         if (new Date(complaint.created_at) > new Date(acc[key].latest_date)) {
//           acc[key].latest_date = complaint.created_at
//           acc[key].status = complaint.status
//         }

//         return acc
//       },
//       {} as Record<string, GroupedComplaint>,
//     )

//     setGroupedComplaints(Object.values(grouped))
//   }

//   const saveSettings = async () => {
//     if (!settings) return

//     setSaving(true)
//     const { error } = await supabase
//       .from("booking_settings")
//       .update({
//         start_time: startTime + ":00",
//         end_time: endTime + ":00",
//         slot_duration_minutes: slotDuration,
//         working_days: workingDays,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", settings.id)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to save settings",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Settings saved successfully",
//       })
//       fetchSettings()
//     }
//     setSaving(false)
//   }

//   const addNewUser = async () => {
//     if (!newUser.name || !newUser.phone_number || !newUser.apartment_number) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       })
//       return
//     }

//     const { error } = await supabase.from("profiles").insert([
//       {
//         ...newUser,
//         phone_number: newUser.phone_number.startsWith("+") ? newUser.phone_number : `+${newUser.phone_number}`,
//       },
//     ])

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to add user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User added successfully",
//       })
//       setNewUser({
//         name: "",
//         phone_number: "",
//         cnic: "",
//         apartment_number: "",
//         building_block: "",
//         maintenance_charges: 5000,
//       })
//       setIsAddUserOpen(false)
//       fetchProfiles()
//     }
//   }

//   const updateMaintenanceStatus = async (profileId: string, isPaid: boolean) => {
//     try {
//       const response = await fetch("/api/maintenance/update-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ profileId, isPaid }),
//       })

//       if (!response.ok) {
//         const data = await response.json().catch(() => ({}))
//         throw new Error(typeof data?.error === "string" ? data.error : "Failed to update maintenance status")
//       }

//       toast({
//         title: "Success",
//         description: isPaid
//           ? "Maintenance marked as paid and the resident has been notified."
//           : "Maintenance marked as unpaid.",
//       })
//       fetchProfiles()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error?.message || "Failed to update maintenance status",
//         variant: "destructive",
//       })
//     }
//   }

//   const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
//     try {
//       const response = await fetch("/api/complaints/update-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ complaintId, status: newStatus }),
//       })

//       if (!response.ok) {
//         const data = await response.json().catch(() => ({}))
//         throw new Error(typeof data?.error === "string" ? data.error : "Failed to update complaint status")
//       }

//       toast({
//         title: "Success",
//         description: `Complaint marked as ${complaintStatusLabel(newStatus)}. Resident has been notified.`,
//       })
//       fetchComplaints()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error?.message || "Failed to update complaint status",
//         variant: "destructive",
//       })
//     }
//   }

//   const updateBookingPaymentStatus = async (bookingId: string, paymentStatus: "pending" | "paid") => {
//     try {
//       const response = await fetch("/api/bookings/update-payment-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ bookingId, paymentStatus }),
//       })

//       if (!response.ok) {
//         const data = await response.json().catch(() => ({}))
//         throw new Error(typeof data?.error === "string" ? data.error : "Failed to update payment status")
//       }

//       toast({
//         title: "Success",
//         description:
//           paymentStatus === "paid"
//             ? "Marked as paid and confirmation has been sent to the resident."
//             : "Marked as unpaid. Reminder notifications will resume if due.",
//       })
//       fetchBookings()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error?.message || "Failed to update payment status",
//         variant: "destructive",
//       })
//     }
//   }

//   const cancelBooking = async (bookingId: string) => {
//     const { error } = await supabase.from("bookings").delete().eq("id", bookingId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to cancel booking",
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "Booking cancelled successfully",
//       })
//       fetchBookings()
//     }
//   }

//   const formatTime = (timeString: string) => {
//     const [hours, minutes] = timeString.split(":")
//     const hour = Number.parseInt(hours)
//     const ampm = hour >= 12 ? "PM" : "AM"
//     const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
//     return `${displayHour}:${minutes} ${ampm}`
//   }

//   const formatDateTime = (dateString: string) => {
//     return new Date(dateString).toLocaleString("en-GB", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     })
//   }

//   // Filter logic for profiles
//   const filteredProfiles = useMemo(() => {
//     return profiles.filter((profile) => {
//       const matchesSearch =
//         !searchTerm ||
//         profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         profile.phone_number?.includes(searchTerm) ||
//         profile.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())

//       const matchesMaintenance =
//         maintenanceFilter === "all" ||
//         (maintenanceFilter === "paid" && profile.maintenance_paid) ||
//         (maintenanceFilter === "unpaid" && !profile.maintenance_paid)

//       return matchesSearch && matchesMaintenance
//     })
//   }, [profiles, searchTerm, maintenanceFilter])

//   // Filter logic for bookings
//   const filteredBookings = useMemo(() => {
//     return bookings.filter((booking) => {
//       const matchesSearch =
//         !searchTerm ||
//         booking.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         booking.profiles?.phone_number?.includes(searchTerm) ||
//         formatDateForDisplay(booking.booking_date).includes(searchTerm)

//       const matchesDate = !dateFilter || booking.booking_date === dateFilter
//       const matchesStatus = statusFilter === "all" || booking.status === statusFilter

//       return matchesSearch && matchesDate && matchesStatus
//     })
//   }, [bookings, searchTerm, dateFilter, statusFilter])

//   // Filter logic for complaints
//   const filteredComplaints = useMemo(() => {
//     return complaints.filter((complaint) => {
//       const matchesSearch =
//         !searchTerm ||
//         complaint.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         complaint.profiles?.phone_number?.includes(searchTerm) ||
//         complaint.complaint_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         complaint.subcategory.toLowerCase().includes(searchTerm.toLowerCase())

//       const matchesStatus = complaintStatusFilter === "all" || complaint.status === complaintStatusFilter

//       return matchesSearch && matchesStatus
//     })
//   }, [complaints, searchTerm, complaintStatusFilter])

//   const residentsDisplay = useMemo(
//     () => filterByPeriod(filteredProfiles, residentsPeriod, (p) => p.created_at),
//     [filteredProfiles, residentsPeriod],
//   )
//   const bookingsDisplay = useMemo(
//     () => filterByPeriod(filteredBookings, bookingsPeriod, (b) => b.booking_date),
//     [filteredBookings, bookingsPeriod],
//   )
//   const complaintsDisplay = useMemo(
//     () => filterByPeriod(filteredComplaints, complaintsPeriod, (c) => c.created_at),
//     [filteredComplaints, complaintsPeriod],
//   )

//   const stats = useMemo(() => {
//     const totalBookings = bookings.filter((b) => b.status === "confirmed").length
//     const todayBookings = bookings.filter(
//       (b) => b.booking_date === new Date().toISOString().split("T")[0] && b.status === "confirmed",
//     ).length
//     const pendingComplaints = complaints.filter((c) => c.status === "pending").length
//     const unpaidMaintenance = profiles.filter((p) => !p.maintenance_paid).length
//     const pendingPayments = bookings.filter((b) => b.payment_status === "pending").length
//     const totalRevenue = bookings
//       .filter((b) => b.payment_status === "paid")
//       .reduce((sum, b) => sum + b.booking_charges, 0)

//     return { totalBookings, todayBookings, pendingComplaints, unpaidMaintenance, pendingPayments, totalRevenue }
//   }, [bookings, complaints, profiles])

//   const getStatusBadgeVariant = (status: string) => {
//     switch (status) {
//       case "confirmed":
//       case "completed":
//       case "paid":
//         return "default"
//       case "pending":
//         return "secondary"
//       case "in-progress":
//         return "outline"
//       case "cancelled":
//         return "destructive"
//       default:
//         return "secondary"
//     }
//   }

//   const editUser = async () => {
//     if (!editingUser || !editingUser.name || !editingUser.phone_number || !editingUser.apartment_number) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       })
//       return
//     }

//     const { error } = await supabase
//       .from("profiles")
//       .update({
//         name: editingUser.name,
//         phone_number: editingUser.phone_number.startsWith("+")
//           ? editingUser.phone_number
//           : `+${editingUser.phone_number}`,
//         cnic: editingUser.cnic,
//         apartment_number: editingUser.apartment_number,
//         building_block: editingUser.building_block,
//         maintenance_charges: editingUser.maintenance_charges,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", editingUser.id)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to update user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User updated successfully",
//       })
//       setEditingUser(null)
//       setIsEditUserOpen(false)
//       fetchProfiles()
//     }
//   }

//   const deleteUser = async (userId: string, userName: string) => {
//     if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
//       return
//     }

//     const { error } = await supabase.from("profiles").delete().eq("id", userId)

//     if (error) {
//       toast({
//         title: "Error",
//         description: "Failed to delete user: " + error.message,
//         variant: "destructive",
//       })
//     } else {
//       toast({
//         title: "Success",
//         description: "User deleted successfully",
//       })
//       fetchProfiles()
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
//         <div className="container mx-auto p-6 space-y-6">
//           <div className="flex items-center gap-2 mb-6">
//             <Skeleton className="h-8 w-8" />
//             <Skeleton className="h-8 w-64" />
//           </div>
//           <div className="grid gap-4 md:grid-cols-6">
//             {[...Array(6)].map((_, i) => (
//               <Card key={i} className="border-0 shadow-lg">
//                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                   <Skeleton className="h-4 w-20" />
//                   <Skeleton className="h-4 w-4" />
//                 </CardHeader>
//                 <CardContent>
//                   <Skeleton className="h-8 w-16" />
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
//       <div className="container mx-auto p-6 space-y-8">
//         {/* Header */}
//         <div className="bg-white rounded-2xl shadow-xl border-0 p-8">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
//                 <Building2 className="h-8 w-8 text-white" />
//               </div>
//               <div>
//                 <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
//                   Community Management
//                 </h1>
//                 <p className="text-gray-600 text-lg mt-1">Professional Dashboard for Residential Management</p>
//               </div>
//             </div>
//             <Button
//               onClick={refreshData}
//               variant="outline"
//               disabled={refreshing}
//               className="gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200"
//             >
//               <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
//               Refresh Data
//             </Button>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="grid gap-6 md:grid-cols-6">
//           <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-blue-100">Total Residents</CardTitle>
//               <Users className="h-5 w-5 text-blue-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{profiles.length}</div>
//               <p className="text-xs text-blue-200 mt-1">Active community members</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-green-100">Active Bookings</CardTitle>
//               <Calendar className="h-5 w-5 text-green-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.totalBookings}</div>
//               <p className="text-xs text-green-200 mt-1">Confirmed reservations</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-orange-100">Pending Issues</CardTitle>
//               <AlertTriangle className="h-5 w-5 text-orange-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.pendingComplaints}</div>
//               <p className="text-xs text-orange-200 mt-1">Awaiting resolution</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-red-500 to-red-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-red-100">Unpaid Maintenance</CardTitle>
//               <CreditCard className="h-5 w-5 text-red-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.unpaidMaintenance}</div>
//               <p className="text-xs text-red-200 mt-1">Outstanding payments</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-purple-100">Pending Payments</CardTitle>
//               <Clock className="h-5 w-5 text-purple-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.pendingPayments}</div>
//               <p className="text-xs text-purple-200 mt-1">Booking payments due</p>
//             </CardContent>
//           </Card>

//           <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white overflow-hidden relative">
//             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium text-blue-100">Today&apos;s Bookings</CardTitle>
//               <Calendar className="h-5 w-5 text-blue-200" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stats.todayBookings}</div>
//               <p className="text-xs text-blue-200 mt-1">Confirmed for today</p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Tabs */}
//         <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
//           <Tabs defaultValue="residents" className="w-full">
//             <div className="border-b border-gray-100 bg-gray-50/50">
//               <TabsList className="grid w-full grid-cols-5 bg-transparent h-16 p-2">
//                 <TabsTrigger
//                   value="residents"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-blue-600 transition-all duration-200"
//                 >
//                   <Users className="h-4 w-4 mr-2" />
//                   Residents
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="bookings"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-green-600 transition-all duration-200"
//                 >
//                   <Calendar className="h-4 w-4 mr-2" />
//                   Bookings
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="complaints"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-orange-600 transition-all duration-200"
//                 >
//                   <MessageSquare className="h-4 w-4 mr-2" />
//                   Complaints
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="grouped-complaints"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-purple-600 transition-all duration-200"
//                 >
//                   <BarChart3 className="h-4 w-4 mr-2" />
//                   Analytics
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="settings"
//                   className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-gray-800 transition-all duration-200"
//                 >
//                   <Settings className="h-4 w-4 mr-2" />
//                   Settings
//                 </TabsTrigger>
//               </TabsList>
//             </div>

//             {/* Residents Tab */}
//             <TabsContent value="residents" className="p-6">
//               <div className="space-y-6">
//                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//                   <div>
//                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//                       <Users className="h-6 w-6 text-blue-600" />
//                       Residents Management
//                     </h2>
//                     <p className="text-gray-600 mt-1">Manage community residents and their information</p>
//                   </div>

//                   <div className="flex flex-col sm:flex-row gap-3">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                       <Input
//                         placeholder="Search residents..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="pl-10 w-full sm:w-64 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
//                       />
//                     </div>

//                     <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
//                       <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                         <Filter className="h-4 w-4 mr-2" />
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Status</SelectItem>
//                         <SelectItem value="paid">Paid</SelectItem>
//                         <SelectItem value="unpaid">Unpaid</SelectItem>
//                       </SelectContent>
//                     </Select>

//                     <div className="flex items-center gap-2">
//                       <Select value={residentsPeriod} onValueChange={setResidentsPeriod}>
//                         <SelectTrigger className="w-full sm:w-40 border-gray-200">
//                           <Filter className="h-4 w-4 mr-2" />
//                           <SelectValue placeholder="Period" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="all">All Time</SelectItem>
//                           <SelectItem value="daily">Today</SelectItem>
//                           <SelectItem value="weekly">This Week</SelectItem>
//                           <SelectItem value="monthly">This Month</SelectItem>
//                           <SelectItem value="yearly">This Year</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <Button
//                         onClick={() => {
//                           void exportToPdf({
//                             title: "Residents Report",
//                             periodLabel: periodLabel(residentsPeriod),
//                             columns: [
//                               { header: "Name", dataKey: "name" },
//                               { header: "Phone", dataKey: "phone" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Maintenance (Rs)", dataKey: "maintenance" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: residentsDisplay.map((p) => ({
//                               name: p.name || "N/A",
//                               phone: p.phone_number || "N/A",
//                               apartment: p.apartment_number || "N/A",
//                               maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
//                               status: p.maintenance_paid ? "Paid" : "Unpaid",
//                             })),
//                             filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
//                             fileName: `residents-${residentsPeriod}-filtered.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (filtered)
//                       </Button>
//                       <Button
//                         onClick={() => {
//                           const allResidents = filterByPeriod(profiles, residentsPeriod, (p) => p.created_at)
//                           void exportToPdf({
//                             title: "Residents Report",
//                             periodLabel: periodLabel(residentsPeriod),
//                             columns: [
//                               { header: "Name", dataKey: "name" },
//                               { header: "Phone", dataKey: "phone" },
//                               { header: "Apartment", dataKey: "apartment" },
//                               { header: "Maintenance (Rs)", dataKey: "maintenance" },
//                               { header: "Status", dataKey: "status" },
//                             ],
//                             rows: allResidents.map((p) => ({
//                               name: p.name || "N/A",
//                               phone: p.phone_number || "N/A",
//                               apartment: p.apartment_number || "N/A",
//                               maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
//                               status: p.maintenance_paid ? "Paid" : "Unpaid",
//                             })),
//                             fileName: `residents-${residentsPeriod}-all.pdf`,
//                           })
//                         }}
//                         variant="outline"
//                         className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50"
//                       >
//                         <Eye className="h-4 w-4" />
//                         Download PDF (all)
//                       </Button>
//                     </div>

//                     <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
//                       <DialogTrigger asChild>
//                         <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200">
//                           <UserPlus className="h-4 w-4" />
//                           Add Resident
//                         </Button>
//                       </DialogTrigger>
//                       <DialogContent className="sm:max-w-[500px]">
//                         <DialogHeader>
//                           <DialogTitle className="text-xl font-semibold">Add New Resident</DialogTitle>
//                         </DialogHeader>
//                         <div className="grid gap-4 py-4">
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="name" className="text-right font-medium">
//                               Name *
//                             </Label>
//                             <Input
//                               id="name"
//                               value={newUser.name}
//                               onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
//                               className="col-span-3"
//                               placeholder="Enter full name"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="phone" className="text-right font-medium">
//                               Phone *
//                             </Label>
//                             <Input
//                               id="phone"
//                               value={newUser.phone_number}
//                               onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
//                               className="col-span-3"
//                               placeholder="+1234567890"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="apartment" className="text-right font-medium">
//                               Apartment *
//                             </Label>
//                             <Input
//                               id="apartment"
//                               value={newUser.apartment_number}
//                               onChange={(e) => setNewUser({ ...newUser, apartment_number: e.target.value })}
//                               className="col-span-3"
//                               placeholder="A-101"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="building" className="text-right font-medium">
//                               Building
//                             </Label>
//                             <Input
//                               id="building"
//                               value={newUser.building_block}
//                               onChange={(e) => setNewUser({ ...newUser, building_block: e.target.value })}
//                               className="col-span-3"
//                               placeholder="Block A"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="cnic" className="text-right font-medium">
//                               CNIC
//                             </Label>
//                             <Input
//                               id="cnic"
//                               value={newUser.cnic}
//                               onChange={(e) => setNewUser({ ...newUser, cnic: e.target.value })}
//                               className="col-span-3"
//                               placeholder="12345-6789012-3"
//                             />
//                           </div>
//                           <div className="grid grid-cols-4 items-center gap-4">
//                             <Label htmlFor="maintenance" className="text-right font-medium">
//                               Maintenance
//                             </Label>
//                             <Input
//                               id="maintenance"
//                               type="number"
//                               value={newUser.maintenance_charges}
//                               onChange={(e) => setNewUser({ ...newUser, maintenance_charges: Number(e.target.value) })}
//                               className="col-span-3"
//                               placeholder="5000"
//                             />
//                           </div>
//                         </div>
//                         <div className="flex justify-end gap-3 pt-4">
//                           <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
//                             Cancel
//                           </Button>
//                           <Button onClick={addNewUser} className="bg-blue-600 hover:bg-blue-700">
//                             Add Resident
//                           </Button>
//                         </div>
//                       </DialogContent>
//                     </Dialog>
//                   </div>
//                 </div>

//                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow className="bg-gray-50/50">
//                         <TableHead className="font-semibold text-gray-700">Name</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Phone</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Apartment</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Maintenance</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                         <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {residentsDisplay.length === 0 ? (
//                         <TableRow>
//                           <TableCell colSpan={6} className="text-center py-12">
//                             <Users className="h-12 w-12 text-gray-300 mx-auto" />
//                             <p className="text-gray-400 mt-2">No residents found</p>
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         residentsDisplay.map((profile) => (
//                           <TableRow key={profile.id}>
//                             <TableCell>{profile.name}</TableCell>
//                             <TableCell>{profile.phone_number}</TableCell>
//                             <TableCell>{profile.apartment_number}</TableCell>
//                             <TableCell>Rs. {profile.maintenance_charges.toLocaleString()}</TableCell>
//                             <TableCell>
//                               <Badge variant={getStatusBadgeVariant(profile.maintenance_paid ? "paid" : "unpaid")}>
//                                 {profile.maintenance_paid ? "Paid" : "Unpaid"}
//                               </Badge>
//                             </TableCell>
//                             <TableCell className="text-right">
//                               <Button
//                                 variant="outline"
//                                 onClick={() => updateMaintenanceStatus(profile.id, !profile.maintenance_paid)}
//                               >
//                                 {profile.maintenance_paid ? "Mark as Unpaid" : "Mark as Paid"}
//                               </Button>
//                               <Button variant="outline" onClick={() => deleteUser(profile.id, profile.name)}>
//                                 Delete
//                               </Button>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </TabsContent>

//             {/* Bookings Tab */}
//             <TabsContent value="bookings" className="p-6">
//               {/* Bookings content here */}
//             </TabsContent>

//             {/* Complaints Tab */}
//             <TabsContent value="complaints" className="p-6">
//               {/* Complaints content here */}
//             </TabsContent>

//             {/* Grouped Complaints Tab */}
//             <TabsContent value="grouped-complaints" className="p-6">
//               {/* Grouped complaints content here */}
//             </TabsContent>

//             {/* Settings Tab */}
//             <TabsContent value="settings" className="p-6">
//               {/* Settings content here */}
//             </TabsContent>
//           </Tabs>
//         </div>
//       </div>
//     </div>
//   )
// }
