"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GYM_CONFIG } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Dumbbell, AlertCircle, CheckCircle } from "lucide-react"

export default function SetupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  
  const router = useRouter()

  useEffect(() => {
    // Check if setup is needed
    fetch("/api/auth/setup")
      .then(res => res.json())
      .then(data => {
        if (!data.setupRequired) {
          router.push("/login")
        }
        setIsChecking(false)
      })
      .catch(() => {
        setIsChecking(false)
      })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(data.error || "Setup failed")
      }
    } catch {
      setError("Setup failed. Please try again.")
    }

    setIsSubmitting(false)
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Setup {GYM_CONFIG.name}</CardTitle>
            <CardDescription className="mt-1">Create your admin account to get started</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="border-green-500 bg-green-50 text-green-900">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Admin account created successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  minLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Admin Account"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
