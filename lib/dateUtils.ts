export function isDateFormat(message: string): boolean {
  return /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(message)
}

export function parseDate(dateString: string): string | null {
  try {
    const cleanDate = dateString.replace(/[/.]/g, "-")
    const [day, month, year] = cleanDate.split("-").map(Number)

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2024) {
      return null
    }

    // Create date in local timezone to avoid timezone conversion issues
    const date = new Date(year, month - 1, day)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return null
    }

    // Format as YYYY-MM-DD without timezone conversion
    const formattedYear = date.getFullYear()
    const formattedMonth = String(date.getMonth() + 1).padStart(2, "0")
    const formattedDay = String(date.getDate()).padStart(2, "0")

    return `${formattedYear}-${formattedMonth}-${formattedDay}`
  } catch (error) {
    return null
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function isWorkingDay(dateString: string, workingDays: number[]): boolean {
  const date = new Date(dateString + "T00:00:00")
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  const mondayBasedDay = dayOfWeek === 0 ? 7 : dayOfWeek // Convert Sunday from 0 to 7
  return workingDays.includes(mondayBasedDay)
}

export function getDayName(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", { weekday: "long" })
}
