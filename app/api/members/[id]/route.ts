import { verifyAuth } from "@/lib/auth"
import Attendance from "@/lib/models/Attendance"
import Member from "@/lib/models/Member"
import Payment from "@/lib/models/Payment"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import { NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Get single member with payment history
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid member ID" }, { status: 400 })
    }

    await connectDB()

    const member = await Member.findById(id).lean()
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    // Get payment history (exclude soft-deleted)
    const payments = await Payment.find({ 
      member: id,
      isDeleted: { $ne: true }
    })
      .sort({ paymentDate: -1 })
      .limit(10)
      .lean()

    // Get recent attendance
    const attendance = await Attendance.find({ member: id })
      .sort({ date: -1 })
      .limit(30)
      .lean()

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        payments,
        attendance,
      },
    })
  } catch (error) {
    console.error("Get member error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch member" },
      { status: 500 }
    )
  }
}

// Update member
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid member ID" }, { status: 400 })
    }

    await connectDB()

    const body = await request.json()
    const { fullName, phone, status, membershipPlan, notes } = body

    // Check for duplicate phone (excluding current member)
    if (phone) {
      const existingMember = await Member.findOne({ 
        phone, 
        _id: { $ne: id } 
      })
      if (existingMember) {
        return NextResponse.json(
          { success: false, error: "A member with this phone number already exists" },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (fullName !== undefined) updateData.fullName = fullName.trim()
    if (phone !== undefined) updateData.phone = phone.trim()
    if (status !== undefined) updateData.status = status
    if (membershipPlan !== undefined) updateData.membershipPlan = membershipPlan
    if (notes !== undefined) updateData.notes = notes

    const member = await Member.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: member })
  } catch (error) {
    console.error("Update member error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update member" },
      { status: 500 }
    )
  }
}

// Delete member
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid member ID" }, { status: 400 })
    }

    await connectDB()

    const member = await Member.findByIdAndDelete(id)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    // Also delete related records
    // Keep payments for financial records
    await Promise.all([
      // Payment.deleteMany({ member: id }), // Don't delete payments
      Attendance.deleteMany({ member: id }),
    ])

    return NextResponse.json({ success: true, message: "Member deleted successfully" })
  } catch (error) {
    console.error("Delete member error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete member" },
      { status: 500 }
    )
  }
}
