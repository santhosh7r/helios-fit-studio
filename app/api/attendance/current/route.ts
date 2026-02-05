import { NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Attendance from "@/lib/models/Attendance"

// Get members currently in the gym
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const currentlyInside = await Attendance.find({
      date: { $gte: today, $lte: endOfDay },
      checkOutTime: null,
    })
      .populate("member", "fullName registrationNumber phone")
      .sort({ checkInTime: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: currentlyInside,
      count: currentlyInside.length,
    })
  } catch (error) {
    console.error("Get current members error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch current members" },
      { status: 500 }
    )
  }
}
