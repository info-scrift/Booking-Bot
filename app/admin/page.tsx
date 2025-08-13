"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase, type BookingSettings, type Booking } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, Settings, X, Loader2, RefreshCw, Save, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { generateTimeSlots, formatDateForDisplay, DAYS_OF_WEEK } from "@/lib/time-utils"

export default function AdminPanel() {
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Settings form state
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [slotDuration, setSlotDuration] = useState(60)
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])

  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchSettings(), fetchBookings()])
    setLoading(false)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchSettings(), fetchBookings()])
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
    }
  }

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        profiles (name, phone_number)
      `)
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

  // Filter and search logic
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

  const stats = useMemo(() => {
    const totalBookings = bookings.filter((b) => b.status === "confirmed").length
    const todayBookings = bookings.filter(
      (b) => b.booking_date === new Date().toISOString().split("T")[0] && b.status === "confirmed",
    ).length
    const upcomingBookings = bookings.filter(
      (b) => b.booking_date > new Date().toISOString().split("T")[0] && b.status === "confirmed",
    ).length

    return { totalBookings, todayBookings, upcomingBookings }
  }, [bookings])

  // Generate preview slots
  const previewSlots = useMemo(() => {
    if (!settings) return []
    const mockSettings = {
      ...settings,
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      slot_duration_minutes: slotDuration,
    }
    return generateTimeSlots(mockSettings).slice(0, 5) // Show first 5 slots as preview
  }, [settings, startTime, endTime, slotDuration])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Dashboard</h1>
            <p className="text-gray-600">Manage your WhatsApp booking system</p>
          </div>
        </div>
        <Button onClick={refreshData} variant="outline" disabled={refreshing} className="gap-2 bg-transparent">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.todayBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Upcoming Bookings</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.upcomingBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Slot Duration</CardTitle>
            <Settings className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{slotDuration}min</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Booking Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">End Time</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Slot Duration</label>
              <Select
                value={slotDuration.toString()}
                onValueChange={(value) => setSlotDuration(Number.parseInt(value))}
              >
                <SelectTrigger>
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

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Working Days</label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={workingDays.includes(day.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setWorkingDays([...workingDays, day.value])
                        } else {
                          setWorkingDays(workingDays.filter((d) => d !== day.value))
                        }
                      }}
                    />
                    <label htmlFor={`day-${day.value}`} className="text-sm">
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveSettings} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Time Slots Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Time Slots Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {previewSlots.map((slot, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border">
                  <span className="text-sm font-medium">{slot.display_text}</span>
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                </div>
              ))}
              {previewSlots.length > 5 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  ... and {previewSlots.length - 5} more slots
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Bookings</CardTitle>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Input
                  placeholder="Search by name, phone, or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64"
                />
              </div>

              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto"
              />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        {bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.profiles?.name || "N/A"}</TableCell>
                      <TableCell>{booking.profiles?.phone_number}</TableCell>
                      <TableCell>{formatDateForDisplay(booking.booking_date)}</TableCell>
                      <TableCell>
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.status === "confirmed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelBooking(booking.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredBookings.length > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <p>
                Showing {filteredBookings.length} of {bookings.length} bookings
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
