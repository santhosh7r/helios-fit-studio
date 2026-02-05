import { verifyAuth } from "@/lib/auth"
import { calculateExpiryDate, getPlanById } from "@/lib/config"
import Member from "@/lib/models/Member"
import Payment from "@/lib/models/Payment"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import { NextResponse } from "next/server"

// Get all payments with filtering
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const memberId = searchParams.get("memberId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true }
    }
    
    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      query.member = new mongoose.Types.ObjectId(memberId)
    }
    
    if (startDate || endDate) {
      query.paymentDate = {}
      if (startDate) {
        (query.paymentDate as Record<string, Date>).$gte = new Date(startDate)
      }
      if (endDate) {
        (query.paymentDate as Record<string, Date>).$lte = new Date(endDate)
      }
    }

    const skip = (page - 1) * limit

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate("member", "fullName registrationNumber phone")
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get payments error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 }
    )
  }
}

// Record new payment
export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const {
      memberId,
      amount,
      paymentMode,
      planId,
      customDuration,
      customAmount,
      customPlanName,
      startDate,
      notes,
    } = body

    // Validate required fields
    if (!memberId || !amount || !paymentMode || !planId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return NextResponse.json({ success: false, error: "Invalid member ID" }, { status: 400 })
    }

    // Get member
    const member = await Member.findById(memberId)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    // Get dynamic config
    const config = await import("@/lib/models/Config").then(mod => mod.default.findOne().lean())

    // Get plan details from dynamic config, fallback to default if not found
    let plan = getPlanById(planId, config || undefined)
    
    // Special handling for 'custom' plan if not found in config
    if (!plan && planId === "custom") {
      plan = { id: "custom", name: "Custom", duration: 0, price: 0 } as any
    }

    if (!plan && planId !== "balance_clearance") {
      return NextResponse.json({ success: false, error: "Invalid plan" }, { status: 400 })
    }

    // Calculate dates
    const planDuration = planId === "custom" 
      ? customDuration 
      : (planId === "balance_clearance" ? 1 : (plan?.duration || 0))
      
    const planPrice = plan?.offerPrice && plan?.offerPrice > 0 ? plan.offerPrice : (plan?.price || 0)
    const totalPlanAmount = planId === "custom" ? customAmount : planPrice

    if (planId !== "balance_clearance" && (!planDuration || planDuration < 1)) {
      return NextResponse.json({ success: false, error: "Invalid plan duration" }, { status: 400 })
    }

    // Determine start date
    let paymentStartDate: Date
    
    if (startDate) {
      paymentStartDate = new Date(startDate)
    } else if (
      planId !== "balance_clearance" &&
      member.membershipExpiryDate && 
      new Date(member.membershipExpiryDate) > new Date()
    ) {
      // Renewal extends from current expiry ONLY if not balance clearance
      paymentStartDate = new Date(member.membershipExpiryDate)
    } else {
      paymentStartDate = new Date()
    }

    // For balance clearance, expiry is same as start (no duration)
    const expiryDate = planId === "balance_clearance" 
      ? paymentStartDate 
      : calculateExpiryDate(paymentStartDate, planDuration)
      
    const nextDueDate = new Date(expiryDate)
    if (planId !== "balance_clearance") {
        nextDueDate.setDate(nextDueDate.getDate() - 7) // Remind 7 days before expiry
    }

    // Check if partial payment
    const isPartialPayment = amount < totalPlanAmount
    const balanceRemaining = Math.max(0, totalPlanAmount - amount)

    // Generate receipt number
    const date = new Date()
    const prefix = `RCP${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
    const count = await Payment.countDocuments({
      receiptNumber: { $regex: `^${prefix}` },
    })
    const receiptNumber = `${prefix}${String(count + 1).padStart(4, "0")}`

    // Determine plan name for record
    let finalPlanName = plan?.name || planId
    if (planId === "balance_clearance") {
      finalPlanName = "Balance Clearance"
    } else if (planId === "custom") {
      finalPlanName = customPlanName || "Custom Plan"
    }

    // Create payment record
    const payment = await Payment.create({
      member: memberId,
      amount,
      paymentDate: new Date(),
      paymentMode,
      planId,
      planName: finalPlanName,
      planDuration,
      startDate: paymentStartDate,
      expiryDate,
      nextDueDate,
      isPartialPayment,
      totalPlanAmount,
      balanceRemaining,
      receiptNumber,
      notes: notes || "",
    })

    // Update member's membership details
    const updateData: Record<string, unknown> = {
      status: "Active",
    }

    if (planId !== "balance_clearance") {
      updateData.membershipPlan = planId === "custom" && customPlanName ? customPlanName : planId
      updateData.membershipStartDate = paymentStartDate
      updateData.membershipExpiryDate = expiryDate
    }

    // Update outstanding balance
    if (isPartialPayment) {
      updateData.outstandingBalance = (member.outstandingBalance || 0) + balanceRemaining
    } else {
      // Full payment might clear some outstanding balance
      updateData.outstandingBalance = Math.max(0, (member.outstandingBalance || 0) - (amount - totalPlanAmount))
    }

    await Member.findByIdAndUpdate(memberId, { $set: updateData })

    // Populate and return
    const populatedPayment = await Payment.findById(payment._id)
      .populate("member", "fullName registrationNumber phone")
      .lean()

    return NextResponse.json({ success: true, data: populatedPayment }, { status: 201 })
  } catch (error) {
    console.error("Create payment error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to record payment" },
      { status: 500 }
    )
  }
}
