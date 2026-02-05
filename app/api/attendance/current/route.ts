import { verifyAuth } from "@/lib/auth";
import Attendance from "@/lib/models/Attendance";
import "@/lib/models/Member"; // Ensure Member model is registered
import { connectDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";

// Get members currently in the gym
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    await connectDB()

    // Find all members who haven't checked out
    const currentlyInside = await Attendance.find({
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
