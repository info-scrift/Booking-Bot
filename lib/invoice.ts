// import type { Booking, MaintenancePayment, Profile } from "@/lib/supabase"
// import { formatDateForDisplay } from "@/lib/time-utils"

// const COMPANY_NAME = "Green Three"
// const DEFAULT_TEXT_COLOR: [number, number, number] = [33, 37, 41]

// type MaintenanceInvoiceRecord = MaintenancePayment & { profiles?: Partial<Profile> }
// type BookingInvoiceRecord = Booking & { profiles?: Partial<Profile> }
// type OutstandingSummary = {
//   totalOutstanding: number
//   outstandingCount: number
// }

// function compactId(id: string) {
//   return id.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
// }

// function pad2(value: number) {
//   return value.toString().padStart(2, "0")
// }

// function formatTime(value: string | null | undefined) {
//   if (!value) return "--:--"
//   const [hoursStr, minutesStr = "00"] = value.split(":")
//   const hours = Number.parseInt(hoursStr, 10)
//   if (Number.isNaN(hours)) return value
//   const period = hours >= 12 ? "PM" : "AM"
//   const normalized = hours % 12 === 0 ? 12 : hours % 12
//   return `${normalized}:${minutesStr.padStart(2, "0")} ${period}`
// }

// function formatTimeRange(booking: BookingInvoiceRecord) {
//   if (!booking.start_time || !booking.end_time) return "—"
//   return `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
// }

// function formatDate(date: Date | null | undefined) {
//   return date ? date.toLocaleDateString("en-GB") : "—"
// }

// function formatBillingPeriod(year: number, month: number) {
//   return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" })
// }

// function drawHeader(doc: any, subtitle: string) {
//   const pageWidth = doc.internal.pageSize.getWidth()
//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(22)
//   doc.setTextColor(17, 24, 39)
//   doc.text(COMPANY_NAME, 14, 20)

//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(10)
//   doc.setTextColor(107, 114, 128)
//   doc.text("Community Management Services", 14, 26)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(12)
//   doc.setTextColor(79, 70, 229)
//   doc.text(subtitle, 14, 32)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(14)
//   doc.text("Invoice", pageWidth - 14, 22, { align: "right" })

//   doc.setDrawColor(226, 232, 240)
//   doc.line(14, 34, pageWidth - 14, 34)

//   doc.setTextColor(...DEFAULT_TEXT_COLOR)
// }

// type Stamp = {
//   text: string
//   color: [number, number, number]
// }

// function drawStatusStamp(doc: any, stamp: Stamp) {
//   const pageWidth = doc.internal.pageSize.getWidth()
//   const pageHeight = doc.internal.pageSize.getHeight()
//   doc.setTextColor(...stamp.color)
//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(54)
//   doc.text(stamp.text, pageWidth / 2, pageHeight / 2, { align: "center", angle: -30 })
//   doc.setTextColor(...DEFAULT_TEXT_COLOR)
// }

// function getMaintenanceStamp(status?: string | null): Stamp {
//   switch (status) {
//     case "paid":
//       return { text: "PAID", color: [34, 197, 94] }
//     case "overdue":
//       return { text: "OVERDUE", color: [239, 68, 68] }
//     default:
//       return { text: "UNPAID", color: [249, 115, 22] }
//   }
// }

// function getBookingStamp(paymentStatus?: string | null, bookingStatus?: string | null): Stamp {
//   if (bookingStatus === "cancelled") {
//     return { text: "CANCELLED", color: [239, 68, 68] }
//   }
//   if (paymentStatus === "paid") {
//     return { text: "PAID", color: [34, 197, 94] }
//   }
//   return { text: "UNPAID", color: [249, 115, 22] }
// }

// export function formatCurrency(value: number | null | undefined): string {
//   const numericValue = Number(value ?? 0)
//   return `Rs. ${numericValue.toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   })}`
// }

// export function getMaintenanceInvoiceNumber(invoice: MaintenancePayment): string {
//   const yearPart = invoice.year ?? new Date().getFullYear()
//   const monthPart = invoice.month ?? new Date().getMonth() + 1
//   const idFragment = compactId(invoice.id).slice(0, 6)
//   return `MT-${yearPart}${pad2(monthPart)}-${idFragment}`
// }

// export function getBookingInvoiceNumber(booking: Booking): string {
//   const baseDate = booking.booking_date || booking.created_at?.slice(0, 10) || ""
//   const sanitizedDate = baseDate ? baseDate.replace(/-/g, "") : "00000000"
//   const idFragment = compactId(booking.id).slice(0, 6)
//   return `BK-${sanitizedDate}-${idFragment}`
// }

// export async function generateMaintenanceInvoicePdf(invoice: MaintenanceInvoiceRecord, summary?: OutstandingSummary) {
//   const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])

//   const doc = new jsPDF()
//   const pageWidth = doc.internal.pageSize.getWidth()

//   drawHeader(doc, "Maintenance Invoice")

//   const invoiceNumber = getMaintenanceInvoiceNumber(invoice)
//   const invoiceDate = invoice.created_at ? new Date(invoice.created_at) : new Date()
//   const dueDate = new Date(invoice.year, invoice.month - 1, 10)
//   const billingPeriod = formatBillingPeriod(invoice.year, invoice.month)
//   const amount = Number(invoice.amount ?? 0)
//   const stamp = getMaintenanceStamp(invoice.status)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 14, 40, { align: "right" })
//   doc.setFont("helvetica", "normal")
//   doc.text(`Issued: ${formatDate(invoiceDate)}`, pageWidth - 14, 46, { align: "right" })
//   doc.text(`Status: ${stamp.text}`, pageWidth - 14, 52, { align: "right" })

//   const infoTop = 48

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(11)
//   doc.text("Bill To", 14, infoTop + 12)

//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(10)

//   const billToLines = [
//     invoice.profiles?.name ?? "Resident",
//     invoice.profiles?.apartment_number ? `Apartment ${invoice.profiles.apartment_number}` : null,
//     invoice.profiles?.building_block ? `Block ${invoice.profiles.building_block}` : null,
//     invoice.profiles?.phone_number ? `Phone: ${invoice.profiles.phone_number}` : null,
//   ].filter(Boolean) as string[]
//   doc.text(billToLines, 14, infoTop + 18)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(11)
//   doc.text("Invoice Details", pageWidth / 2 + 10, infoTop + 12)

//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(10)

//   const invoiceDetailLines = [
//     `Billing Period: ${billingPeriod}`,
//     `Invoice Date: ${formatDate(invoiceDate)}`,
//     `Due Date: ${formatDate(dueDate)}`,
//     invoice.paid_date ? `Paid Date: ${formatDate(new Date(`${invoice.paid_date}T00:00:00`))}` : null,
//   ].filter(Boolean) as string[]
//   doc.text(invoiceDetailLines, pageWidth / 2 + 10, infoTop + 18)

//   const tableStartY = infoTop + 36

//   autoTable(doc, {
//     startY: tableStartY,
//     head: [["Description", "Qty", "Unit Price", "Total"]],
//     body: [[`Monthly Maintenance (${billingPeriod})`, "1", formatCurrency(amount), formatCurrency(amount)]],
//     theme: "striped",
//     styles: {
//       font: "helvetica",
//       fontSize: 10,
//       textColor: DEFAULT_TEXT_COLOR,
//     },
//     headStyles: {
//       fillColor: [59, 130, 246],
//       textColor: [255, 255, 255],
//       fontStyle: "bold",
//     },
//     columnStyles: {
//       1: { halign: "center" },
//       2: { halign: "right" },
//       3: { halign: "right" },
//     },
//   })

//   const lastTableY = (doc as any).lastAutoTable?.finalY ?? tableStartY + 20

//   let cursorY = lastTableY + 10

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.text("Subtotal:", pageWidth - 70, cursorY, { align: "right" })
//   doc.setFont("helvetica", "normal")
//   doc.text(formatCurrency(amount), pageWidth - 14, cursorY, { align: "right" })

//   cursorY += 8

//   doc.setFont("helvetica", "bold")
//   doc.text("Total:", pageWidth - 70, cursorY, { align: "right" })
//   doc.setFont("helvetica", "normal")
//   doc.text(formatCurrency(amount), pageWidth - 14, cursorY, { align: "right" })

//   cursorY += 12

//   const outstandingTotal = summary?.totalOutstanding ?? 0
//   const outstandingCount = summary?.outstandingCount ?? 0
//   if (outstandingCount > 1 && outstandingTotal > 0) {
//     doc.setFont("helvetica", "bold")
//     doc.setFontSize(10)
//     doc.text("Outstanding Summary", 14, cursorY)
//     doc.setFont("helvetica", "normal")
//     doc.setFontSize(9)
//     doc.text(
//       [
//         `There are ${outstandingCount} outstanding maintenance invoices with combined dues of ${formatCurrency(outstandingTotal)}.`,
//         "Please arrange payment at the earliest convenience.",
//       ],
//       14,
//       cursorY + 6,
//     )
//     cursorY += 20
//   } else {
//     cursorY += 4
//   }

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.text("Notes", 14, cursorY)
//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(9)
//   doc.text(
//     [
//       "Please settle your maintenance dues promptly to keep community services running smoothly.",
//       "For any billing queries, contact the estate management office.",
//     ],
//     14,
//     cursorY + 6,
//   )

//   drawStatusStamp(doc, stamp)

//   const blob = doc.output("blob")
//   const fileName = `${invoiceNumber}.pdf`
//   return { blob, fileName }
// }

// export async function generateBookingInvoicePdf(booking: BookingInvoiceRecord) {
//   const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])

//   const doc = new jsPDF()
//   const pageWidth = doc.internal.pageSize.getWidth()

//   drawHeader(doc, "Booking Invoice")

//   const invoiceNumber = getBookingInvoiceNumber(booking)
//   const invoiceDate = booking.created_at ? new Date(booking.created_at) : new Date()
//   const eventDate = booking.booking_date ? formatDateForDisplay(booking.booking_date) : "—"
//   const timeRange = formatTimeRange(booking)
//   const amount = Number(booking.booking_charges ?? 0)
//   const stamp = getBookingStamp(booking.payment_status, booking.status)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 14, 40, { align: "right" })
//   doc.setFont("helvetica", "normal")
//   doc.text(`Issued: ${formatDate(invoiceDate)}`, pageWidth - 14, 46, { align: "right" })
//   doc.text(`Status: ${stamp.text}`, pageWidth - 14, 52, { align: "right" })

//   const infoTop = 48

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(11)
//   doc.text("Billed To", 14, infoTop + 12)

//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(10)

//   const billedToLines = [
//     booking.profiles?.name ?? "Resident",
//     booking.profiles?.apartment_number ? `Apartment ${booking.profiles.apartment_number}` : null,
//     booking.profiles?.phone_number ? `Phone: ${booking.profiles.phone_number}` : null,
//   ].filter(Boolean) as string[]
//   doc.text(billedToLines, 14, infoTop + 18)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(11)
//   doc.text("Booking Details", pageWidth / 2 + 10, infoTop + 12)

//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(10)

//   const bookingInfoLines = [
//     `Event Date: ${eventDate}`,
//     `Time Slot: ${timeRange}`,
//     `Booking Status: ${booking.status ?? "—"}`,
//     `Payment Status: ${booking.payment_status ?? "pending"}`,
//   ]
//   doc.text(bookingInfoLines, pageWidth / 2 + 10, infoTop + 18)

//   const tableStartY = infoTop + 36

//   autoTable(doc, {
//     startY: tableStartY,
//     head: [["Description", "Qty", "Unit Price", "Total"]],
//     body: [["Community Hall Booking", "1", formatCurrency(amount), formatCurrency(amount)]],
//     theme: "striped",
//     styles: {
//       font: "helvetica",
//       fontSize: 10,
//       textColor: DEFAULT_TEXT_COLOR,
//     },
//     headStyles: {
//       fillColor: [16, 185, 129],
//       textColor: [255, 255, 255],
//       fontStyle: "bold",
//     },
//     columnStyles: {
//       1: { halign: "center" },
//       2: { halign: "right" },
//       3: { halign: "right" },
//     },
//   })

//   const lastTableY = (doc as any).lastAutoTable?.finalY ?? tableStartY + 20

//   let cursorY = lastTableY + 10

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.text("Subtotal:", pageWidth - 70, cursorY, { align: "right" })
//   doc.setFont("helvetica", "normal")
//   doc.text(formatCurrency(amount), pageWidth - 14, cursorY, { align: "right" })

//   cursorY += 8

//   doc.setFont("helvetica", "bold")
//   doc.text("Total:", pageWidth - 70, cursorY, { align: "right" })
//   doc.setFont("helvetica", "normal")
//   doc.text(formatCurrency(amount), pageWidth - 14, cursorY, { align: "right" })

//   cursorY += 16

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.text("Notes", 14, cursorY)
//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(9)
//   doc.text(
//     [
//       "Please complete your booking payment within 3 days to avoid automatic cancellation.",
//       "Contact the community office for payment assistance or schedule changes.",
//     ],
//     14,
//     cursorY + 6,
//   )

//   drawStatusStamp(doc, stamp)

//   const blob = doc.output("blob")
//   const fileName = `${invoiceNumber}.pdf`
//   return { blob, fileName }
// }





// import type { Booking, MaintenancePayment, Profile } from "@/lib/supabase"

// type PdfLibs = {
//   jsPDF: typeof import("jspdf").jsPDF
//   autoTable: (doc: import("jspdf").jsPDF, options: import("jspdf-autotable").jsPDFAutoTableOptions) => void
// }

// type OutstandingSummary = {
//   totalOutstanding: number
//   outstandingCount: number
// }

// const BRAND_NAME = "Green Three"
// const BRAND_PRIMARY = "#047857"
// const BRAND_ACCENT = "#064e3b"

// let pdfLibsPromise: Promise<PdfLibs> | null = null

// async function loadPdfLibs(): Promise<PdfLibs> {
//   if (!pdfLibsPromise) {
//     pdfLibsPromise = Promise.all([
//       import("jspdf").then((module) => module.jsPDF),
//       import("jspdf-autotable").then((module) => module.default),
//     ]).then(([jsPDFConstructor, autoTable]) => ({
//       jsPDF: jsPDFConstructor,
//       autoTable,
//     }))
//   }

//   return pdfLibsPromise
// }

// function drawBrandHeader(doc: import("jspdf").jsPDF, title: string) {
//   doc.setFillColor(BRAND_PRIMARY)
//   doc.rect(0, 0, 210, 30, "F")

//   doc.setTextColor("#f9fafb")
//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(20)
//   doc.text(BRAND_NAME, 14, 19)

//   doc.setFontSize(12)
//   doc.text(title, 150, 19)

//   doc.setDrawColor("#e5e7eb")
//   doc.line(10, 36, 200, 36)
//   doc.setTextColor("#111827")
// }

// function drawFooter(doc: import("jspdf").jsPDF) {
//   const pageHeight = doc.internal.pageSize.height
//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(9)
//   doc.setTextColor("#6b7280")
//   doc.text(`${BRAND_NAME} · Automated invoice generated on ${formatDate(new Date())}`, 14, pageHeight - 12)
// }

// function drawStatusStamp(doc: import("jspdf").jsPDF, status: "paid" | "unpaid" | "cancelled" | "overdue") {
//   const { label, color } = (() => {
//     switch (status) {
//       case "paid":
//         return { label: "PAID", color: "#047857" }
//       case "overdue":
//         return { label: "OVERDUE", color: "#b91c1c" }
//       case "cancelled":
//         return { label: "CANCELLED", color: "#7f1d1d" }
//       default:
//         return { label: "UNPAID", color: "#d97706" }
//     }
//   })()

//   doc.saveGraphicsState()
//   doc.setTextColor(color)
//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(36)
//   doc.text(label, 150, 65, { angle: -30 })
//   doc.restoreGraphicsState()
// }

// function drawOutstandingSummary(
//   doc: import("jspdf").jsPDF,
//   topY: number,
//   summary: OutstandingSummary | undefined,
// ): number {
//   if (!summary || summary.outstandingCount === 0) {
//     return topY
//   }

//   const text = `Outstanding dues: ${formatCurrency(summary.totalOutstanding)} across ${summary.outstandingCount} ${
//     summary.outstandingCount === 1 ? "invoice" : "invoices"
//   }`
//   const height = 18

//   doc.setFillColor("#fef3c7")
//   doc.roundedRect(14, topY + 6, 182, height, 3, 3, "F")

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(11)
//   doc.setTextColor("#92400e")
//   doc.text(text, 20, topY + 18)

//   doc.setFont("helvetica", "normal")
//   doc.setTextColor("#111827")

//   return topY + height + 8
// }


// function formatOutstandingPeriods(payments: MaintenancePayment[]): string {
//     console.log('the paymenst are ')
//     console.log(payments)
//   if (!payments.length) return "—"

//   return payments
//     .map(
//       (p) =>
//         new Date(p.year ?? new Date().getFullYear(), (p.month ?? 1) - 1, 1).toLocaleDateString("en-GB", {
//           month: "long",
//           year: "numeric",
//         }),
//     )
//     .join(", ")
// }


// function addPaymentDetailsTable(
//   doc: import("jspdf").jsPDF,
//   autoTable: PdfLibs["autoTable"],
//   rows: Array<Record<string, string>>,
//   startY: number,
// ) {
//   autoTable(doc, {
//     startY,
//     head: [
//       [
//         { content: "Description", styles: { fillColor: hexToRgb(BRAND_PRIMARY), textColor: "#f9fafb" } },
//         { content: "Details", styles: { fillColor: hexToRgb(BRAND_PRIMARY), textColor: "#f9fafb" } },
//       ],
//     ],
//     body: rows.map((row) => [row.label, row.value]),
//     styles: {
//       font: "helvetica",
//       fontSize: 11,
//       textColor: "#111827",
//       cellPadding: 4,
//     },
//     alternateRowStyles: {
//       fillColor: "#f9fafb",
//     },
//     columnStyles: {
//       0: { cellWidth: 80 },
//       1: { cellWidth: 100 },
//     },
//   })
// }

// function hexToRgb(hex: string): [number, number, number] {
//   const normalized = hex.replace("#", "")
//   const bigint = Number.parseInt(normalized, 16)
//   return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
// }

// function safeName(value: string | null | undefined) {
//   return value?.trim() || "Resident"
// }

// function safeApartment(value: string | null | undefined) {
//   return value?.trim() ? `Apartment ${value}` : "—"
// }

// export function formatCurrency(amount: number, currency = "PKR"): string {
//   return new Intl.NumberFormat("en-PK", {
//     style: "currency",
//     currency,
//     maximumFractionDigits: 0,
//   }).format(Number.isFinite(amount) ? amount : 0)
// }

// export function getMaintenanceInvoiceNumber(payment: MaintenancePayment) {
//   const month = String(payment.month ?? 0).padStart(2, "0")
//   const suffix =
//     typeof payment.id === "string" ? payment.id.slice(-6).toUpperCase() : String(payment.id ?? 0).padStart(6, "0")
//   return `MT-${payment.year ?? "0000"}${month}-${suffix}`
// }

// export function getBookingInvoiceNumber(booking: Booking) {
//   const datePart = booking.booking_date ? booking.booking_date.replaceAll("-", "") : "00000000"
//   const suffix =
//     typeof booking.id === "string" ? booking.id.slice(-6).toUpperCase() : String(booking.id ?? 0).padStart(6, "0")
//   return `BK-${datePart}-${suffix}`
// }

// function formatDate(value: string | number | Date | null | undefined) {
//   if (!value) return "—"
//   const date = value instanceof Date ? value : new Date(value)
//   if (Number.isNaN(date.getTime())) return "—"
//   return date.toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   })
// }

// function formatTime(value: string | null | undefined) {
//   if (!value) return "--:--"
//   const [hoursStr, minutesStr = "00"] = value.split(":")
//   const hours = Number.parseInt(hoursStr, 10)
//   if (Number.isNaN(hours)) return value
//   const period = hours >= 12 ? "PM" : "AM"
//   const normalized = hours % 12 === 0 ? 12 : hours % 12
//   return `${normalized}:${minutesStr.padStart(2, "0")} ${period}`
// }

// function buildBookingTimeRange(booking: Booking) {
//   if (!booking.start_time || !booking.end_time) return "—"
//   return `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
// }

// export async function generateMaintenanceInvoicePdf(
//   payment: MaintenancePayment & { profiles?: Partial<Profile> | null },
//   summary?: OutstandingSummary,
// ) {
//   const { jsPDF, autoTable } = await loadPdfLibs()
//   const doc = new jsPDF()

//   drawBrandHeader(doc, "Maintenance Invoice")

//   const invoiceNumber = getMaintenanceInvoiceNumber(payment)
//   const profile = payment.profiles ?? {}
//   const billingPeriod = payment.month
//     ? new Date(payment.year ?? new Date().getFullYear(), (payment.month ?? 1) - 1, 1).toLocaleDateString("en-GB", {
//         month: "long",
//         year: "numeric",
//       })
//     : "—"

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(14)
//   doc.text(`Invoice #${invoiceNumber}`, 14, 46)
//   doc.setFontSize(12)
//   doc.setFont("helvetica", "normal")
//   doc.text(`Issued: ${formatDate(payment.created_at)}`, 14, 53)
//   doc.text(
//     `Due: ${formatDate(payment.due_date ?? new Date(payment.year ?? 2025, (payment.month ?? 1) - 1, 10))}`,
//     14,
//     60,
//   )

//   doc.setFont("helvetica", "bold")
//   doc.text("Resident", 130, 46)
//   doc.setFont("helvetica", "normal")
//   doc.text(safeName(profile.name), 130, 53)
//   doc.text(safeApartment(profile.apartment_number), 130, 60)
//   if (profile.phone_number) {
//     doc.text(profile.phone_number, 130, 67)
//   }

// const isPaid = payment.status === "paid" || payment.status === "cancelled"

// addPaymentDetailsTable(
//   doc,
//   autoTable,
//   [
//     {
//       label: "Billing Periods",
//       value: isPaid
//         ? billingPeriod // ✅ only that month
//         : summary?.months ?? billingPeriod, // ✅ all outstanding months
//     },
//     {
//       label: "Amount",
//       value: isPaid
//         ? formatCurrency(payment.amount ?? profile.maintenance_charges ?? 0) // ✅ just this invoice
//         : formatCurrency(summary?.totalOutstanding ?? 0), // ✅ all unpaid invoices
//     },
//     { label: "Status", value: (payment.status ?? "unpaid").replaceAll("-", " ").toUpperCase() },
//     { label: "Paid On", value: formatDate(payment.paid_date) },
//     { label: "Reference", value: payment.payment_reference ?? "—" },
//   ],
//   78,
// )


// //   addPaymentDetailsTable(
// //     doc,
// //     autoTable,
// //     [
// //       { 
// //   label: "Billing Periods", 
// //     value: summary?.months
// // //   value: summary?.months ? formatOutstandingPeriods(summary.months) : billingPeriod 
// // },

// //     //   { label: "Amount", value: formatCurrency(payment.amount ?? profile.maintenance_charges ?? 0) },
// //             { label: "Amount", value: formatCurrency(summary?.totalOutstanding ?? 0) },
// //       { label: "Status", value: (payment.status ?? "unpaid").replaceAll("-", " ").toUpperCase() },
// //       { label: "Paid On", value: formatDate(payment.paid_date) },
// //       { label: "Reference", value: payment.payment_reference ?? "—" },
// //     ],
// //     78,
// //   )

//   const tableBottom = (doc as any).lastAutoTable?.finalY ?? 98
// //   const afterSummary = drawOutstandingSummary(doc, tableBottom, summary)
// const afterSummary = isPaid ? tableBottom : drawOutstandingSummary(doc, tableBottom, summary)


//   drawFooter(doc)

//   const statusForStamp =
//     payment.status === "paid"
//       ? "paid"
//       : payment.status === "overdue"
//         ? "overdue"
//         : payment.status === "cancelled"
//           ? "cancelled"
//           : "unpaid"

//   drawStatusStamp(doc, statusForStamp)

//   doc.setDrawColor(hexToRgb(BRAND_ACCENT)[0], hexToRgb(BRAND_ACCENT)[1], hexToRgb(BRAND_ACCENT)[2])
//   doc.roundedRect(14, afterSummary + 4, 182, 30, 3, 3, "S")
//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(12)
//   doc.text("Notes", 20, afterSummary + 12)
//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(11)
//   doc.text("Thank you for keeping your maintenance dues up to date with Green Three.", 20, afterSummary + 21)

//   const fileName = `maintenance-invoice-${invoiceNumber}.pdf`
//   const blob = doc.output("blob")

//   return { blob, fileName }
// }

// export async function generateBookingInvoicePdf(booking: Booking & { profiles?: Partial<Profile> | null }) {
//   const { jsPDF, autoTable } = await loadPdfLibs()
//   const doc = new jsPDF()

//   drawBrandHeader(doc, "Community Hall Booking Invoice")

//   const invoiceNumber = getBookingInvoiceNumber(booking)
//   const profile = booking.profiles ?? {}

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(14)
//   doc.text(`Invoice #${invoiceNumber}`, 14, 46)
//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(12)
//   doc.text(`Issued: ${formatDate(booking.created_at)}`, 14, 53)
//   doc.text(`Event Date: ${formatDate(booking.booking_date)}`, 14, 60)

//   doc.setFont("helvetica", "bold")
//   doc.text("Resident", 130, 46)
//   doc.setFont("helvetica", "normal")
//   doc.text(safeName(profile.name), 130, 53)
//   doc.text(safeApartment(profile.apartment_number), 130, 60)
//   if (profile.phone_number) {
//     doc.text(profile.phone_number, 130, 67)
//   }

//   const rows: Array<Record<string, string>> = [
//     { label: "Time Slot", value: buildBookingTimeRange(booking) },
//     { label: "Hall Booking Status", value: (booking.status ?? "pending").replaceAll("-", " ").toUpperCase() },
//     { label: "Payment Status", value: (booking.payment_status ?? "pending").replaceAll("-", " ").toUpperCase() },
//     { label: "Amount", value: formatCurrency(booking.booking_charges ?? 0) },
//     { label: "Payment Reference", value: booking.payment_reference ?? "—" },
//   ]

//   addPaymentDetailsTable(doc, autoTable, rows, 78)

//   drawFooter(doc)

//   const stampStatus =
//     booking.status === "cancelled" ? "cancelled" : booking.payment_status === "paid" ? "paid" : "unpaid"

//   drawStatusStamp(doc, stampStatus)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(12)
//   doc.text("Notes", 14, 130)
//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(11)
//   doc.text(
//     [
//       "Please present this invoice during hall check-in.",
//       "For any changes, contact the Green Three admin office at your earliest convenience.",
//     ],
//     14,
//     137,
//   )

//   const fileName = `booking-invoice-${invoiceNumber}.pdf`
//   const blob = doc.output("blob")

//   return { blob, fileName }
// }



import type { Booking, MaintenancePayment, Profile } from "@/lib/supabase"

type PdfLibs = {
  jsPDF: typeof import("jspdf").jsPDF
  autoTable: (doc: import("jspdf").jsPDF, options: any) => void
}


type OutstandingSummary = {
  totalOutstanding: number
  outstandingCount: number
  months: string[]
}

const BRAND_NAME = "Green Three"
const BRAND_PRIMARY = "#047857"
const BRAND_ACCENT = "#064e3b"

let pdfLibsPromise: Promise<PdfLibs> | null = null

async function loadPdfLibs(): Promise<PdfLibs> {
  if (!pdfLibsPromise) {
    pdfLibsPromise = Promise.all([
      import("jspdf").then((module) => module.jsPDF),
      import("jspdf-autotable").then((module) => module.default),
    ]).then(([jsPDFConstructor, autoTable]) => ({
      jsPDF: jsPDFConstructor,
      autoTable,
    }))
  }

  return pdfLibsPromise
}

function drawBrandHeader(doc: import("jspdf").jsPDF, title: string) {
  doc.setFillColor(BRAND_PRIMARY)
  doc.rect(0, 0, 210, 30, "F")

  doc.setTextColor("#f9fafb")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text(BRAND_NAME, 14, 19)

  doc.setFontSize(12)
  doc.text(title, 150, 19)

  doc.setDrawColor("#e5e7eb")
  doc.line(10, 36, 200, 36)
  doc.setTextColor("#111827")
}

function drawFooter(doc: import("jspdf").jsPDF) {
  const pageHeight = doc.internal.pageSize.height
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor("#6b7280")
  doc.text(`${BRAND_NAME} · Automated invoice generated on ${formatDate(new Date())}`, 14, pageHeight - 12)
}

function drawStatusStamp(doc: import("jspdf").jsPDF, status: "paid" | "unpaid") {
  const { label, color } =
    status === "paid" ? { label: "PAID", color: "#047857" } : { label: "UNPAID", color: "#d97706" }

  const pageHeight = doc.internal.pageSize.height
  doc.saveGraphicsState()
  doc.setTextColor(color)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(36)
  doc.text(label, 150, pageHeight - 40, { angle: -30 })
  doc.restoreGraphicsState()
}

function drawOutstandingSummary(
  doc: import("jspdf").jsPDF,
  topY: number,
  summary: OutstandingSummary | undefined,
): number {
  if (!summary || summary.outstandingCount === 0) {
    return topY
  }

  const text = `Outstanding dues: ${formatCurrency(summary.totalOutstanding)} across ${summary.outstandingCount} ${
    summary.outstandingCount === 1 ? "invoice" : "invoices"
  }`
  const height = 18

  doc.setFillColor("#fef3c7")
  doc.roundedRect(14, topY + 6, 182, height, 3, 3, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor("#92400e")
  doc.text(text, 20, topY + 18)

  doc.setFont("helvetica", "normal")
  doc.setTextColor("#111827")

  return topY + height + 8
}

function formatOutstandingPeriods(payments: MaintenancePayment[]): string {
  if (!payments.length) return "—"

  return payments
    .map((p) =>
      new Date(p.year ?? new Date().getFullYear(), (p.month ?? 1) - 1, 1).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    )
    .join(", ")
}

function addPaymentDetailsTable(
  doc: import("jspdf").jsPDF,
  autoTable: PdfLibs["autoTable"],
  rows: Array<Record<string, string>>,
  startY: number,
) {
  autoTable(doc, {
    startY,
    head: [
      [
        { content: "Description", styles: { fillColor: hexToRgb(BRAND_PRIMARY), textColor: "#f9fafb" } },
        { content: "Details", styles: { fillColor: hexToRgb(BRAND_PRIMARY), textColor: "#f9fafb" } },
      ],
    ],
    body: rows.map((row) => [row.label, row.value]),
    styles: {
      font: "helvetica",
      fontSize: 11,
      textColor: "#111827",
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: "#f9fafb",
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 100 },
    },
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "")
  const bigint = Number.parseInt(normalized, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function safeName(value: string | null | undefined) {
  return value?.trim() || "Resident"
}

function safeApartment(value: string | null | undefined) {
  return value?.trim() ? `Apartment ${value}` : "—"
}

export function formatCurrency(amount: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function getMaintenanceInvoiceNumber(payment: MaintenancePayment) {
  const month = String(payment.month ?? 0).padStart(2, "0")
  const suffix =
    typeof payment.id === "string" ? payment.id.slice(-6).toUpperCase() : String(payment.id ?? 0).padStart(6, "0")
  return `MT-${payment.year ?? "0000"}${month}-${suffix}`
}

export function getBookingInvoiceNumber(booking: Booking) {
  const datePart = booking.booking_date ? booking.booking_date.replaceAll("-", "") : "00000000"
  const suffix =
    typeof booking.id === "string" ? booking.id.slice(-6).toUpperCase() : String(booking.id ?? 0).padStart(6, "0")
  return `BK-${datePart}-${suffix}`
}

function formatDate(value: string | number | Date | null | undefined) {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTime(value: string | null | undefined) {
  if (!value) return "--:--"
  const [hoursStr, minutesStr = "00"] = value.split(":")
  const hours = Number.parseInt(hoursStr, 10)
  if (Number.isNaN(hours)) return value
  const period = hours >= 12 ? "PM" : "AM"
  const normalized = hours % 12 === 0 ? 12 : hours % 12
  return `${normalized}:${minutesStr.padStart(2, "0")} ${period}`
}

function buildBookingTimeRange(booking: Booking) {
  if (!booking.start_time || !booking.end_time) return "—"
  return `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
}

export async function generateMaintenanceInvoicePdf(
  payment: MaintenancePayment & { profiles?: Partial<Profile> | null },
  summary?: OutstandingSummary,
) {
  const { jsPDF, autoTable } = await loadPdfLibs()
  const doc = new jsPDF()

  drawBrandHeader(doc, "Maintenance Invoice")

  const invoiceNumber = getMaintenanceInvoiceNumber(payment)
  const profile = payment.profiles ?? {}
  const billingPeriod = payment.month
    ? new Date(payment.year ?? new Date().getFullYear(), (payment.month ?? 1) - 1, 1).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "—"

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(`Invoice #${invoiceNumber}`, 14, 46)
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(`Issued: ${formatDate(payment.created_at)}`, 14, 53)
  // doc.text(
  //   `Due: ${formatDate(payment.due_date ?? new Date(payment.year ?? 2025, (payment.month ?? 1) - 1, 10))}`,
  //   14,
  //   60,
  // )

  doc.setFont("helvetica", "bold")
  doc.text("Resident", 130, 46)
  doc.setFont("helvetica", "normal")
  doc.text(safeName(profile.name), 130, 53)
  doc.text(safeApartment(profile.apartment_number), 130, 60)
  if (profile.phone_number) {
    doc.text(profile.phone_number, 130, 67)
  }

  const isPaid = payment.status === "paid"

  addPaymentDetailsTable(
    doc,
    autoTable,
    [
      {
        label: "Billing Periods",
        value: isPaid ? billingPeriod : (summary?.months?.join(", ") ?? billingPeriod),
      },
      {
        label: "Amount",
        value: isPaid
          ? formatCurrency(payment.amount ?? profile.maintenance_charges ?? 0)
          : formatCurrency(summary?.totalOutstanding ?? 0),
      },
      { label: "Status", value: (payment.status ?? "unpaid").toUpperCase() },
      { label: "Paid On", value: formatDate(payment.paid_date) },
      { label: "Reference", value: payment.payment_reference ?? "—" },
    ],
    78,
  )

  const tableBottom = (doc as any).lastAutoTable?.finalY ?? 98
  const afterSummary = isPaid ? tableBottom : drawOutstandingSummary(doc, tableBottom, summary)

  drawFooter(doc)

  const statusForStamp = payment.status === "paid" ? "paid" : "unpaid"
  drawStatusStamp(doc, statusForStamp)

  doc.setDrawColor(hexToRgb(BRAND_ACCENT)[0], hexToRgb(BRAND_ACCENT)[1], hexToRgb(BRAND_ACCENT)[2])
  doc.roundedRect(14, afterSummary + 4, 182, 30, 3, 3, "S")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Notes", 20, afterSummary + 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text("Thank you for keeping your maintenance dues up to date with Green Three.", 20, afterSummary + 21)

  const fileName = `maintenance-invoice-${invoiceNumber}.pdf`
  const blob = doc.output("blob")

  return { blob, fileName }
}

// export async function generateBookingInvoicePdf(booking: Booking & { profiles?: Partial<Profile> | null }) {
export async function generateBookingInvoicePdf(booking: any) {

  const { jsPDF, autoTable } = await loadPdfLibs()
  const doc = new jsPDF()

  drawBrandHeader(doc, "Community Hall Booking Invoice")

  const invoiceNumber = getBookingInvoiceNumber(booking)
  const profile = booking.profiles ?? {}

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(`Invoice #${invoiceNumber}`, 14, 46)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.text(`Issued: ${formatDate(booking.created_at)}`, 14, 53)
  doc.text(`Event Date: ${formatDate(booking.booking_date)}`, 14, 60)

  doc.setFont("helvetica", "bold")
  doc.text("Resident", 130, 46)
  doc.setFont("helvetica", "normal")
  doc.text(safeName(profile.name), 130, 53)
  doc.text(safeApartment(profile.apartment_number), 130, 60)
  if (profile.phone_number) {
    doc.text(profile.phone_number, 130, 67)
  }

  const rows: Array<Record<string, string>> = [
    { label: "Time Slot", value: buildBookingTimeRange(booking) },
    { label: "Hall Booking Status", value: (booking.status ?? "pending").replaceAll("-", " ").toUpperCase() },
    { label: "Payment Status", value: (booking.payment_status ?? "pending").replaceAll("-", " ").toUpperCase() },
    { label: "Amount", value: formatCurrency(booking.booking_charges ?? 0) },
    { label: "Payment Reference", value: booking.payment_reference ?? "—" },
  ]

  addPaymentDetailsTable(doc, autoTable, rows, 78)

  drawFooter(doc)

  const stampStatus = booking.status === "cancelled" ? "unpaid" : booking.payment_status === "paid" ? "paid" : "unpaid"
  drawStatusStamp(doc, stampStatus)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Notes", 14, 130)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(
    [
      "Please present this invoice during hall check-in.",
      "For any changes, contact the Green Three admin office at your earliest convenience.",
    ],
    14,
    137,
  )

  const fileName = `booking-invoice-${invoiceNumber}.pdf`
  const blob = doc.output("blob")

  return { blob, fileName }
}
