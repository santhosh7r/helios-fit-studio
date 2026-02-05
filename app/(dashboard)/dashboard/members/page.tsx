"use client"

import React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
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
import { GYM_CONFIG } from "@/lib/config"
import { format } from "date-fns"
import { ArrowRight, Calendar, Phone, Plus, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json())

interface Member {
  _id: string
  fullName: string
  phone: string
  registrationNumber: string
  joinDate: string
  membershipPlan: string
  status: "Active" | "Expired" | "Paused"
  membershipExpiryDate?: string
  outstandingBalance: number
}

export default function MembersPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [newMember, setNewMember] = useState({
    fullName: "",
    phone: "",
    address: "",
    registrationNumber: "",
    membershipPlan: "monthly",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const queryParams = new URLSearchParams()
  if (search) queryParams.set("search", search)
  if (status && status !== "all") queryParams.set("status", status)

  const { data, error, isLoading, mutate } = useSWR(
    `/api/members?${queryParams.toString()}`,
    fetcher
  )

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError("")

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newMember),
      })

      const result = await res.json()

      if (result.success) {
        setIsAddingMember(false)
        setNewMember({
          fullName: "",
          phone: "",
          address: "",
          registrationNumber: "",
          membershipPlan: "monthly",
        })
        mutate()
      } else {
        setSubmitError(result.error || "Failed to add member")
      }
    } catch {
      setSubmitError("Failed to add member")
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

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage gym members</p>
        </div>

        <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
                <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input
                  id="registrationNumber"
                  value={newMember.registrationNumber}
                  onChange={(e) =>
                    setNewMember({ ...newMember, registrationNumber: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={newMember.fullName}
                  onChange={(e) =>
                    setNewMember({ ...newMember, fullName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  pattern="[0-9]{10}"
                  placeholder="10-digit number"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newMember.address}
                  onChange={(e) =>
                    setNewMember({ ...newMember, address: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Initial Plan</Label>
                <Select
                  value={newMember.membershipPlan}
                  onValueChange={(value) =>
                    setNewMember({ ...newMember, membershipPlan: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GYM_CONFIG.plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} {plan.price > 0 && `- ₹${plan.price}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setIsAddingMember(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or reg number..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isLoading
              ? "Loading..."
              : `${data?.pagination?.total || 0} Members`}
          </CardTitle>
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
              Failed to load members
            </div>
          ) : data?.data?.length > 0 ? (
            <div className="divide-y">
              {data.data.map((member: Member) => (
                <Link
                  key={member._id}
                  href={`/dashboard/members/${member._id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{member.fullName}</span>
                      <Badge variant="outline" className="text-xs">
                        {member.registrationNumber}
                      </Badge>
                      {getStatusBadge(member.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </span>
                      {member.membershipExpiryDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {format(new Date(member.membershipExpiryDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {member.outstandingBalance > 0 && (
                        <span className="text-destructive">
                          Balance: ₹{member.outstandingBalance}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No members found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
