"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { GYM_CONFIG, getCurrentSession } from "@/lib/config"
import { format } from "date-fns"
import { ExternalLink, LogIn, LogOut, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json())

interface AttendanceRecord {
  _id: string
  member: {
    _id: string
    fullName: string
    registrationNumber: string
    phone: string
  }
  date: string
  session: string
  checkInTime: string
  checkOutTime?: string
  isAutoCheckout: boolean
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [currentSession, setCurrentSession] = useState<string | null>(null)

  useEffect(() => {
    setCurrentSession(getCurrentSession())
    const interval = setInterval(() => {
      setCurrentSession(getCurrentSession())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const { data: attendanceData, isLoading: attendanceLoading } = useSWR(
    `/api/attendance?date=${selectedDate}`,
    fetcher
  )

  const { data: currentData, isLoading: currentLoading } = useSWR(
    "/api/attendance/current",
    fetcher,
    { refreshInterval: 10000 }
  )

  const records = (attendanceData?.data || []) as AttendanceRecord[]
  const currentlyInside = currentData?.data || []

  // Count by session
  const morningCount = records.filter((r) => r.session === "morning").length
  const eveningCount = records.filter((r) => r.session === "evening").length

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track gym attendance</p>
        </div>

        <Button asChild>
          <Link href="/kiosk" target="_blank">
            <ExternalLink className="h-4 w-4 mr-2" />
            Check-In
          </Link>
        </Button>
      </div>

      {/* Session Status */}
      <Card className={currentSession ? "border-green-500 bg-green-50/50" : "border-amber-500 bg-amber-50/50"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${currentSession ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="font-medium">
                {currentSession
                  ? `${GYM_CONFIG.sessions[currentSession as keyof typeof GYM_CONFIG.sessions].name} Session Active`
                  : "Gym Currently Closed"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Morning: {GYM_CONFIG.sessions.morning.start} - {GYM_CONFIG.sessions.morning.end} |
              Evening: {GYM_CONFIG.sessions.evening.start} - {GYM_CONFIG.sessions.evening.end}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currently Inside */}
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Currently Inside Gym
            <Badge variant="secondary">{currentlyInside.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {currentLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : currentlyInside.length > 0 ? (
            <div className="divide-y">
              {currentlyInside.map((record: AttendanceRecord) => (
                <Link
                  key={record._id}
                  href={`/dashboard/members/${record.member._id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <span className="font-medium">{record.member.fullName}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({record.member.registrationNumber})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="capitalize">
                      {record.session}
                    </Badge>
                    <span className="text-muted-foreground">
                      In: {format(new Date(record.checkInTime), "h:mm a")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No one is currently inside the gym
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">Select Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Morning</Badge>
                <span>{morningCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Evening</Badge>
                <span>{eveningCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Attendance for {format(new Date(selectedDate), "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attendanceLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : records.length > 0 ? (
            <div className="divide-y">
              {records.map((record) => (
                <Link
                  key={record._id}
                  href={`/dashboard/members/${record.member._id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{record.member.fullName}</span>
                      <Badge variant="outline" className="text-xs">
                        {record.member.registrationNumber}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{record.member.phone}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="capitalize mb-1">
                      {record.session}
                    </Badge>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <LogIn className="h-3 w-3" />
                        {format(new Date(record.checkInTime), "h:mm a")}
                      </span>
                      {record.checkOutTime ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <LogOut className="h-3 w-3" />
                          {format(new Date(record.checkOutTime), "h:mm a")}
                          {record.isAutoCheckout && (
                            <span className="text-xs text-muted-foreground">(auto)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Still inside</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No attendance records for this date
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
