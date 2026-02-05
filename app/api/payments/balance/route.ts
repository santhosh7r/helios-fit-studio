import { NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Member from "@/lib/models/Member"
import mongoose from "mongoose"

// Pay outstanding balance
export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { memberId, amount } = body

    if (!memberId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Member ID and positive amount are required" },
        { status: 400 }
      )
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return NextResponse.json({ success: false, error: "Invalid member ID" }, { status: 400 })
    }

    const member = await Member.findById(memberId)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    const newBalance = Math.max(0, (member.outstandingBalance || 0) - amount)

    await Member.findByIdAndUpdate(memberId, {
      $set: { outstandingBalance: newBalance },
    })

    return NextResponse.json({
      success: true,
      data: {
        previousBalance: member.outstandingBalance || 0,
        amountPaid: amount,
        newBalance,
      },
    })
  } catch (error) {
    console.error("Pay balance error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process balance payment" },
      { status: 500 }
    )
  }
}
