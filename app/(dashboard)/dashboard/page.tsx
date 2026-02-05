"use client"

import React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { GYM_CONFIG, getCurrentSession } from "@/lib/config"
import { format, formatDistanceToNow } from "date-fns"
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ClipboardCheck,
  CreditCard,
  IndianRupee,
  Phone,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json())

interface DashboardStats {
  members: {
    total: number
    active: number
    expired: number
    paused: number
  }
  alerts: {
    expiringThisWeek: number
    pendingPayments: number
  }
  attendance: {
    today: number
    currentlyInGym: number
  }
  revenue: {
    thisMonth: number
    paymentsThisMonth: number
  }
  priorityList: Array<{
    _id: string
    fullName: string
    registrationNumber: string
    phone: string
    membershipExpiryDate: string
    outstandingBalance: number
  }>
  expiringList: Array<{
    _id: string
    fullName: string
    registrationNumber: string
    phone: string
    membershipExpiryDate: string
  }>
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<{ success: boolean; data: DashboardStats }>(
    "/api/dashboard/stats",
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  const { data: configData } = useSWR<{ success: boolean; data: any }>(
    "/api/config",
    fetcher
  )

  const config = configData?.data || GYM_CONFIG
  const [currentSession, setCurrentSession] = useState<string | null>(null)

  useEffect(() => {
    if (config) {
      setCurrentSession(getCurrentSession(config))
    }
    const interval = setInterval(() => {
      if (config) {
        setCurrentSession(getCurrentSession(config))
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [config])

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load dashboard data. Please refresh the page.
      </div>
    )
  }

  const stats = data?.data

  const getSessionDisplayName = () => {
    if (!currentSession) return "Gym Currently Closed"
    
    if (currentSession === "full-day") return "24/7 Access Active"
    if (currentSession === "continuous") return "Gym Open"
    
    // For morning/evening
    const sessionName = config.sessions?.[currentSession as keyof typeof config.sessions]?.name || 
                       GYM_CONFIG.sessions[currentSession as keyof typeof GYM_CONFIG.sessions].name
    return `${sessionName} Session Active`
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to {config.name} Management System
        </p>
      </div>

      {/* Session Status */}
      <Card className={currentSession ? "border-green-500 bg-green-50/50" : "border-amber-500 bg-amber-50/50"}>
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${currentSession ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="font-medium">
              {getSessionDisplayName()}
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/kiosk" target="_blank">
              Check-In
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Members"
          value={stats?.members.total}
          icon={Users}
          loading={isLoading}
        />
        <StatsCard
          title="Active Members"
          value={stats?.members.active}
          icon={UserCheck}
          loading={isLoading}
          className="text-green-600"
        />
        <StatsCard
          title="Expired"
          value={stats?.members.expired}
          icon={UserX}
          loading={isLoading}
          className="text-destructive"
        />
        <StatsCard
          title="Currently Inside"
          value={stats?.attendance.currentlyInGym}
          icon={ClipboardCheck}
          loading={isLoading}
          className="text-blue-600"
        />
      </div>

      {/* Alert Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Expiring This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-bold">{stats?.alerts.expiringThisWeek || 0}</div>
            )}
            <p className="text-sm text-muted-foreground">members need renewal</p>
          </CardContent>
        </Card>

        <Card className="border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <CreditCard className="h-5 w-5" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-bold">{stats?.alerts.pendingPayments || 0}</div>
            )}
            <p className="text-sm text-muted-foreground">members with outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            This Month&apos;s Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(stats?.revenue.thisMonth || 0)}
              </span>
              <span className="text-sm text-muted-foreground">
                from {stats?.revenue.paymentsThisMonth || 0} payments
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority List - MOST IMPORTANT */}
      <Card className="border-2 border-red-500">
        <CardHeader className="bg-red-50 rounded-t-lg">
          <CardTitle className="text-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Priority: Members Expiring This Week
          </CardTitle>
          <CardDescription className="text-red-600">
            These members need to pay immediately to continue their membership
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : stats?.priorityList && stats.priorityList.length > 0 ? (
            <div className="divide-y">
              {stats.priorityList.map((member) => (
                <Link
                  key={member._id}
                  href={`/dashboard/members/${member._id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{member.fullName}</span>
                      <Badge variant="outline" className="text-xs">
                        {member.registrationNumber}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </span>
                      <span className={`flex items-center gap-1 ${new Date(member.membershipExpiryDate) < new Date() ? "text-destructive font-bold" : "text-amber-600"}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(member.membershipExpiryDate) < new Date() ? "Expired " : "Expires "}
                        {formatDistanceToNow(new Date(member.membershipExpiryDate), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No members expiring this week. Great!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Soon List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Expiring Soon (14 Days)</CardTitle>
              <CardDescription>Members who will need renewal soon</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/members?status=Active&expiring=true">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats?.expiringList && stats.expiringList.length > 0 ? (
            <div className="divide-y">
              {stats.expiringList.slice(0, 5).map((member) => (
                <Link
                  key={member._id}
                  href={`/dashboard/members/${member._id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-medium">{member.fullName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({member.registrationNumber})
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(member.membershipExpiryDate), "MMM d")}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No members expiring in the next 14 days
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  loading,
  className,
}: {
  title: string
  value?: number
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
  className?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-12 mt-1" />
            ) : (
              <p className={`text-2xl font-bold ${className || ""}`}>{value ?? 0}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${className || "text-muted-foreground"} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  )
}
