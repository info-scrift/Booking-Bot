"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [router, supabase])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
