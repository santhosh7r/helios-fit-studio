"use client"

import React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { GYM_CONFIG } from "@/lib/config"
import { format } from "date-fns"
import {
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Edit,
  IndianRupee,
  Phone,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json())

interface Payment {
  _id: string
  amount: number
  paymentDate: string
  paymentMode: string
  planId: string
  planName?: string
  planDuration: number
  startDate: string
  expiryDate: string
  receiptNumber: string
  isPartialPayment: boolean
  balanceRemaining: number
}

interface Attendance {
  _id: string
  date: string
  session: string
  checkInTime: string
  checkOutTime?: string
}

interface MemberDetail {
  _id: string
  fullName: string
  phone: string
  registrationNumber: string
  joinDate: string
  membershipPlan: string
  status: "Active" | "Expired" | "Paused"
  membershipStartDate?: string
  membershipExpiryDate?: string
  outstandingBalance: number
  notes: string
  payments: Payment[]
  attendance: Attendance[]
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [showPartial, setShowPartial] = useState(false)
  const [editData, setEditData] = useState<Partial<MemberDetail>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMode: "Cash",
    planId: "monthly",
    customDuration: "",
    customAmount: "",
    customPlanName: "",
    startDate: "",
    notes: "",
  })

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: MemberDetail }>(
    `/api/members/${id}`,
    fetcher
  )
  const { data: configData } = useSWR<{ success: boolean; data: any }>("/api/config", fetcher)
  const plans = configData?.data?.plans || GYM_CONFIG.plans

  const member = data?.data

  const handleEdit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editData),
      })

      if (res.ok) {
        setIsEditing(false)
        mutate()
      }
    } catch {
      console.error("Update failed")
    }
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (res.ok) {
        router.push("/dashboard/members")
      }
    } catch {
      console.error("Delete failed")
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const plan = GYM_CONFIG.plans.find((p) => p.id === paymentData.planId)
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberId: id,
          amount: Number(paymentData.amount),
          paymentMode: paymentData.paymentMode,
          planId: paymentData.planId,
          customDuration: paymentData.planId === "custom" ? Number(paymentData.customDuration) : undefined,
          customAmount: paymentData.planId === "custom" 
            ? (showPartial ? Number(paymentData.customAmount || paymentData.amount) : Number(paymentData.amount))
            : plan?.price,
          customPlanName: (paymentData as any).customPlanName,
          startDate: paymentData.startDate || undefined,
          notes: (paymentData.planId === "custom" && (paymentData as any).customPlanName 
            ? `Plan: ${(paymentData as any).customPlanName}. ` 
            : "") + paymentData.notes,
        }),
      })

      if (res.ok) {
        setIsPaymentOpen(false)
        setPaymentData({
          amount: "",
          paymentMode: "Cash",
          planId: "monthly",
          customDuration: "",
          customAmount: "",
          customPlanName: "",
          startDate: "",
          notes: "",
        })
        mutate()
      }
    } catch {
      console.error("Payment failed")
    }
    setIsSubmitting(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
      case "Expired":
        return <Badge variant="destructive">Expired</Badge>
      case "Paused":
        return <Badge variant="secondary">Paused</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">Member not found</p>
        <Button asChild>
          <Link href="/dashboard/members">Back to Members</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/members">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Members
        </Link>
      </Button>

      {/* Member Info Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-2xl">{member.fullName}</CardTitle>
                {getStatusBadge(member.status)}
              </div>
              <CardDescription className="mt-1">
                {member.registrationNumber} | Joined {format(new Date(member.joinDate), "MMM d, yyyy")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditData(member)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={editData.fullName || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, fullName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editData.phone || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) =>
                          setEditData({ ...editData, status: value as MemberDetail["status"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Expired">Expired</SelectItem>
                          <SelectItem value="Paused">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={editData.notes || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, notes: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleEdit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Member</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {member.fullName} and all their payment and
                      attendance records. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{member.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Expiry Date</p>
                <p className="font-medium">
                  {member.membershipExpiryDate
                    ? format(new Date(member.membershipExpiryDate), "MMM d, yyyy")
                    : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="font-medium capitalize">{member.membershipPlan}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className={`font-medium ${member.outstandingBalance > 0 ? "text-destructive" : ""}`}>
                  ₹{member.outstandingBalance || 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record Payment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Record Payment</CardTitle>
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <IndianRupee className="h-4 w-4 mr-2" />
                  New Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a new payment for {member.fullName}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select
                      value={paymentData.planId}
                      onValueChange={(value) => {
                        const isClearance = value === "balance_clearance"
                        setPaymentData({ 
                          ...paymentData, 
                          planId: value,
                          amount: isClearance ? String(member.outstandingBalance) : "",
                          // Reset custom fields if switching away from custom (or to clearance)
                          customDuration: "",
                          customAmount: "",
                          customPlanName: "",
                        } as any)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan: any) => {
                          const price = plan.offerPrice && plan.offerPrice > 0 ? plan.offerPrice : plan.price
                          const hasOffer = plan.offerPrice && plan.offerPrice > 0
                          
                          return (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} 
                              {price > 0 && ` - ₹${price}`}
                              {hasOffer && <span className="line-through text-xs text-muted-foreground ml-1">₹{plan.price}</span>}
                              {price > 0 && ` (${plan.duration} days)`}
                            </SelectItem>
                          )
                        })}
                        {member.outstandingBalance > 0 && (
                          <SelectItem value="balance_clearance" className="text-green-600 font-medium">
                            Clear Outstanding Balance (₹{member.outstandingBalance})
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentData.planId === "custom" && (
                    <>
                      <div className="space-y-2">
                        <Label>Custom Plan Name (optional)</Label>
                        <Input
                          list="plan-templates"
                          value={(paymentData as any).customPlanName || ""}
                          onChange={(e) => {
                            const name = e.target.value
                            const matchedPlan = plans.find((p: any) => p.name === name)
                            
                            setPaymentData(prev => ({
                              ...prev,
                              customPlanName: name,
                              // Auto-fill details if a known plan is selected/typed
                              customDuration: matchedPlan ? String(matchedPlan.duration) : prev.customDuration,
                              customAmount: matchedPlan ? String(matchedPlan.offerPrice || matchedPlan.price) : prev.customAmount,
                              amount: matchedPlan ? String(matchedPlan.offerPrice || matchedPlan.price) : prev.amount
                            } as any))
                          }}
                          placeholder="Select offer or type name"
                        />
                        <datalist id="plan-templates">
                           {plans.filter((p: any) => p.id !== "custom").map((plan: any) => (
                             <option key={plan.id} value={plan.name} />
                           ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (days)</Label>
                        <Input
                          type="number"
                          value={paymentData.customDuration}
                          onChange={(e) =>
                            setPaymentData({ ...paymentData, customDuration: e.target.value })
                          }
                          required
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 py-2">
                        <input
                          type="checkbox"
                          id="isPartial"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={showPartial}
                          onChange={(e) => setShowPartial(e.target.checked)}
                        />
                        <Label htmlFor="isPartial" className="font-normal cursor-pointer">
                          This is a partial payment (set total price)
                        </Label>
                      </div>

                      {showPartial && (
                        <div className="space-y-2">
                          <Label>Total Plan Amount</Label>
                          <Input
                            type="number"
                            value={paymentData.customAmount}
                            onChange={(e) =>
                              setPaymentData({ ...paymentData, customAmount: e.target.value })
                            }
                            placeholder="Full price of the plan"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {paymentData.planId !== "balance_clearance" && (
                    <div className="space-y-2">
                       <Label>Start Date (optional)</Label>
                       <div className="text-xs text-muted-foreground mb-1">
                          {member.membershipExpiryDate && new Date(member.membershipExpiryDate) > new Date() ? (
                            <span>Current plan expires on <span className="font-medium text-foreground">{format(new Date(member.membershipExpiryDate), "MMM d, yyyy")}</span>. By default, new plan will start after this date.</span>
                          ) : (
                            <span>Membership expired. By default, new plan starts Today.</span>
                          )}
                       </div>
                       <Input 
                         type="date"
                         value={paymentData.startDate}
                         onChange={(e) => setPaymentData({ ...paymentData, startDate: e.target.value })}
                         placeholder="Leave empty for auto-start"
                       />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Amount Received</Label>
                    <Input
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, amount: e.target.value })
                      }
                      placeholder={
                        paymentData.planId === "balance_clearance"
                          ? `Outstanding Due: ₹${member.outstandingBalance}`
                          : paymentData.planId !== "custom"
                            ? (() => {
                                const p = plans.find((p: any) => p.id === paymentData.planId)
                                return `Plan price: ₹${p?.offerPrice && p?.offerPrice > 0 ? p.offerPrice : (p?.price || 0)}`
                              })()
                            : "Enter amount"
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select
                      value={paymentData.paymentMode}
                      onValueChange={(value) =>
                        setPaymentData({ ...paymentData, paymentMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GYM_CONFIG.paymentModes.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input
                      value={paymentData.notes}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, notes: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => setIsPaymentOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? "Processing..." : "Record Payment"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {member.payments?.length > 0 ? (
            <div className="divide-y">
              {member.payments.map((payment) => (
                <div key={payment._id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-base mb-1">
                        {payment.planName || plans.find((p: any) => p.id === payment.planId)?.name || (payment.planId === "balance_clearance" ? "Balance Clearance" : "Payment")}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">₹{payment.amount}</span>
                        <Badge variant="outline" className="text-xs">
                          {payment.paymentMode}
                        </Badge>
                        {payment.isPartialPayment && (
                          <Badge variant="secondary" className="text-xs">
                            Partial
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(payment.paymentDate), "MMM d, yyyy")} |{" "}
                        {payment.receiptNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valid: {format(new Date(payment.startDate), "MMM d")} -{" "}
                        {format(new Date(payment.expiryDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No payment records
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {member.attendance?.length > 0 ? (
            <div className="divide-y">
              {member.attendance.slice(0, 10).map((record) => (
                <div key={record._id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {format(new Date(record.date), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {record.session} Session
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>In: {format(new Date(record.checkInTime), "h:mm a")}</p>
                    {record.checkOutTime && (
                      <p className="text-muted-foreground">
                        Out: {format(new Date(record.checkOutTime), "h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No attendance records
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
