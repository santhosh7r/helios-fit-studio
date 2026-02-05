"use client"

import React from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { GYM_CONFIG } from "@/lib/config"
import { AlertCircle, Dumbbell, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null)
  
  const { login, user, isLoading } = useAuth()
  const router = useRouter()

  const [config, setConfig] = useState(GYM_CONFIG)

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

  useEffect(() => {
    // Check if setup is required
    fetch("/api/auth/setup")
      .then(res => res.json())
      .then(data => {
        setSetupRequired(data.setupRequired)
        if (data.setupRequired) {
          router.push("/setup")
        }
      })
      .catch(() => setSetupRequired(false))
  }, [router])

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    const result = await login(username, password)

    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "Login failed")
    }

    setIsSubmitting(false)
  }

  if (isLoading || setupRequired === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (setupRequired) {
    return null // Will redirect to setup
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 flex items-center justify-center">
            {(config as any).logo ? (
              <img 
                src={(config as any).logo} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Dumbbell className="h-8 w-8 text-primary-foreground" />
              </div>
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{config.name}</CardTitle>
            <CardDescription className="mt-1">{config.tagline}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username or Email</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
