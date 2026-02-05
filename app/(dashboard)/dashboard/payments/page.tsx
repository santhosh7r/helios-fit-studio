"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { Calendar, CreditCard, IndianRupee } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json())

interface Payment {
  _id: string
  member: {
    _id: string
    fullName: string
    registrationNumber: string
    phone: string
  } | null
  amount: number
  paymentDate: string
  paymentMode: string
  planId: string
  planDuration: number
  startDate: string
  expiryDate: string
  receiptNumber: string
  isPartialPayment: boolean
  totalPlanAmount: number
  balanceRemaining: number
}

export default function PaymentsPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const queryParams = new URLSearchParams()
  if (startDate) queryParams.set("startDate", startDate)
  if (endDate) queryParams.set("endDate", endDate)

  const { data, error, isLoading } = useSWR(
    `/api/payments?${queryParams.toString()}`,
    fetcher
  )

  // Calculate totals
  const payments = (data?.data || []) as Payment[]
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View and manage payment records</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(totalAmount)}
                </p>
              </div>
              <IndianRupee className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              Failed to load payments
            </div>
          ) : payments.length > 0 ? (
            <div className="divide-y">
              {payments.map((payment) => (
                <div key={payment._id} className="block">
                {payment.member ? (
                  <Link
                    href={`/dashboard/members/${payment.member._id}`}
                    className="block p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{payment.member.fullName}</span>
                          <Badge variant="outline" className="text-xs">
                            {payment.member.registrationNumber}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payment.paymentDate), "MMM d, yyyy h:mm a")}
                          </span>
                          <span>{payment.receiptNumber}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{payment.amount}</p>
                        <div className="flex items-center gap-1 justify-end">
                          <Badge variant="secondary" className="text-xs">
                            {payment.paymentMode}
                          </Badge>
                          {payment.isPartialPayment && (
                            <Badge variant="outline" className="text-xs text-amber-600">
                              Partial
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="block p-4 bg-muted/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-muted-foreground italic">Deleted Member</span>
                          <Badge variant="outline" className="text-xs">
                           N/A
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payment.paymentDate), "MMM d, yyyy h:mm a")}
                          </span>
                          <span>{payment.receiptNumber}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{payment.amount}</p>
                        <div className="flex items-center gap-1 justify-end">
                          <Badge variant="secondary" className="text-xs">
                            {payment.paymentMode}
                          </Badge>
                          {payment.isPartialPayment && (
                            <Badge variant="outline" className="text-xs text-amber-600">
                              Partial
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No payments found for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
