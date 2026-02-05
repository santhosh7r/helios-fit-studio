"use client"

import React from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { GYM_CONFIG, getCurrentSession } from "@/lib/config"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Dumbbell,
  LogIn,
  LogOut,
  XCircle
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface MarkResult {
  success: boolean
  message?: string
  error?: string
  memberName?: string
  action?: "checkin" | "checkout" | "completed" | "limit_reached"
  isExpired?: boolean
}

export default function KioskPage() {
  const [regNumber, setRegNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<MarkResult | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState<any>(GYM_CONFIG)

  // Fetch config once on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setConfig(data.data)
        }
      })
      .catch((err) => console.error("Failed to load config", err))
  }, [])

  // Update time and session every second
  useEffect(() => {
    // Immediate update
    setCurrentTime(new Date())
    setCurrentSession(getCurrentSession(config))

    const timer = setInterval(() => {
      setCurrentTime(new Date())
      setCurrentSession(getCurrentSession(config))
    }, 1000)
    return () => clearInterval(timer)
  }, [config])

  // Auto-clear result after 5 seconds
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setResult(null)
        setRegNumber("")
        inputRef.current?.focus()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [result])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!regNumber.trim() || isProcessing) return

    setIsProcessing(true)
    setResult(null)

    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: regNumber.trim() }),
      })

      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ success: false, error: "Connection error. Please try again." })
    }

    setIsProcessing(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const getResultIcon = () => {
    if (!result) return null
    
    if (result.success) {
      if (result.action === "checkin") {
        return <LogIn className="h-16 w-16 text-green-500" />
      }
      return <LogOut className="h-16 w-16 text-blue-500" />
    }
    
    if (result.isExpired) {
      return <AlertTriangle className="h-16 w-16 text-amber-500" />
    }
    
    return <XCircle className="h-16 w-16 text-destructive" />
  }

  const getResultColor = () => {
    if (!result) return ""
    if (result.success) {
      return result.action === "checkin" ? "border-green-500 bg-green-50" : "border-blue-500 bg-blue-50"
    }
    if (result.isExpired) return "border-amber-500 bg-amber-50"
    return "border-destructive bg-destructive/10"
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">{config.name}</h1>
              <p className="text-sm opacity-90">Check-In</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold">
              {currentTime ? formatTime(currentTime) : <span className="opacity-0">00:00:00 PM</span>}
            </p>
            <p className="text-sm opacity-90">
              {currentSession ? (
                <span className="flex items-center gap-1 justify-end">
                  <CheckCircle className="h-3 w-3" />
                  {config.sessions[currentSession as keyof typeof config.sessions].name} Session
                </span>
              ) : (
                <span className="flex items-center gap-1 justify-end text-amber-300">
                  <Clock className="h-3 w-3" />
                  Gym Closed
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-6">
            {/* Session Info */}
            {!currentSession && (
              <Alert className="border-amber-500 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Gym is currently closed. 
                  {config.operatingMode === "continuous" ? (
                    ` Hours: ${config.continuousSession?.start || "06:00"} - ${config.continuousSession?.end || "22:00"}`
                  ) : (
                    ` Sessions: Morning (${config.sessions.morning.start} - ${config.sessions.morning.end}), Evening (${config.sessions.evening.start} - ${config.sessions.evening.end})`
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Result Display */}
            {result && (
              <div className={`p-6 rounded-lg border-2 text-center ${getResultColor()}`}>
                <div className="flex justify-center mb-4">
                  {getResultIcon()}
                </div>
                {result.memberName && (
                  <p className="text-xl font-bold mb-2">{result.memberName}</p>
                )}
                <p className={`text-lg ${result.success ? "text-foreground" : "text-destructive"}`}>
                  {result.message || result.error}
                </p>
              </div>
            )}

            {/* Input Form */}
            {!result && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold">Mark Attendance</h2>
                  <p className="text-muted-foreground mt-1">
                    Enter your registration number
                  </p>
                </div>

                <Input
                  ref={inputRef}
                  type="text"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                  placeholder={`e.g., ${config.regNumberPrefix}0001`}
                  className="text-center text-2xl h-16 font-mono tracking-wider"
                  disabled={isProcessing || !currentSession}
                  autoComplete="off"
                  autoFocus
                />

                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg"
                  disabled={!regNumber.trim() || isProcessing || !currentSession}
                >
                  {isProcessing ? "Processing..." : "Submit"}
                </Button>
              </form>
            )}

            {/* Tap to retry */}
            {result && (
              <Button 
                variant="outline" 
                className="w-full bg-transparent"
                onClick={() => {
                  setResult(null)
                  setRegNumber("")
                  inputRef.current?.focus()
                }}
              >
                Tap to Continue
              </Button>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>
          {config.operatingMode === "24hours" ? (
            "Open 24 Hours | 7 Days a Week"
          ) : config.operatingMode === "continuous" ? (
             `Gym Hours: ${config.continuousSession?.start || "06:00"} - ${config.continuousSession?.end || "22:00"}`
          ) : (
            `Session Hours: Morning ${config.sessions.morning.start} - ${config.sessions.morning.end} | Evening ${config.sessions.evening.start} - ${config.sessions.evening.end}`
          )}
        </p>
      </footer>
    </div>
  )
}
