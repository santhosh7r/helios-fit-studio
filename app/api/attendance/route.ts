import { verifyAuth } from "@/lib/auth"
import Attendance from "@/lib/models/Attendance"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import { NextResponse } from "next/server"

// Get attendance records
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const memberId = searchParams.get("memberId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const query: Record<string, unknown> = {}

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      query.date = { $gte: startOfDay, $lte: endOfDay }
    }

    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      query.member = new mongoose.Types.ObjectId(memberId)
    }

    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate("member", "fullName registrationNumber phone")
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get attendance error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch attendance records" },
      { status: 500 }
    )
  }
}

// Get current members in gym
export async function HEAD(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return new Response(null, { status: 401 })
    }

    await connectDB()

    const currentlyInside = await Attendance.countDocuments({
      checkOutTime: null,
    })

    return new Response(null, {
      status: 200,
      headers: { "X-Current-Count": currentlyInside.toString() },
    })
  } catch {
    return new Response(null, { status: 500 })
  }
}
