"use client"

import { useState, useCallback } from "react"
import { LoginScreen } from "@/components/login-screen"
import { MenuScreen, type MealChoice, type MenuConfig } from "@/components/menu-screen"
import { ConfirmationScreen } from "@/components/confirmation-screen"

type Screen = "login" | "menu" | "confirmation"

const MENU_CONFIG: MenuConfig = {
  vegLabel: "Veg Meal",
  vegDescription: "Dal tadka, seasonal sabzi, roti, jeera rice, salad, and dessert.",
  nonvegLabel: "Non-Veg Meal",
  nonvegDescription: "Chicken curry, roti, jeera rice, salad, and dessert.",
  nonvegAvailable: true,
  cutoffHour: 18,
  cutoffMinute: 0,
}

function formatTimestamp() {
  return new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login")
  const [employeeId, setEmployeeId] = useState("")
  const [submittedChoice, setSubmittedChoice] = useState<MealChoice | "opted-out" | null>(null)
  const [timestamp, setTimestamp] = useState("")

  const handleLogin = useCallback((id: string) => {
    setEmployeeId(id)
    setScreen("menu")
  }, [])

  const handleSubmit = useCallback((choice: MealChoice | "opted-out") => {
    setSubmittedChoice(choice)
    setTimestamp(formatTimestamp())
    setScreen("confirmation")
  }, [])

  const handleBack = useCallback(() => {
    setSubmittedChoice(null)
    setScreen("menu")
  }, [])

  const handleLogout = useCallback(() => {
    setEmployeeId("")
    setSubmittedChoice(null)
    setTimestamp("")
    setScreen("login")
  }, [])

  switch (screen) {
    case "login":
      return <LoginScreen onLogin={handleLogin} />
    case "menu":
      return (
        <MenuScreen
          employeeId={employeeId}
          config={MENU_CONFIG}
          onSubmit={handleSubmit}
          onLogout={handleLogout}
        />
      )
    case "confirmation":
      return (
        <ConfirmationScreen
          employeeId={employeeId}
          status={submittedChoice!}
          timestamp={timestamp}
          onBack={handleBack}
          onLogout={handleLogout}
        />
      )
  }
}
