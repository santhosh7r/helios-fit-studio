import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Attendance from "@/lib/models/Attendance"
import { GYM_CONFIG } from "@/lib/config"

// This endpoint should be called by a cron job at closing time
// For Vercel, set up a cron job in vercel.json to call this endpoint
// Example: every day at 21:30 IST

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get("Authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!GYM_CONFIG.attendance.autoExitEnabled) {
      return NextResponse.json({
        success: true,
        message: "Auto-exit is disabled",
        processed: 0,
      })
    }

    await connectDB()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Find all attendance records for today without checkout
    const result = await Attendance.updateMany(
      {
        date: { $gte: today, $lte: todayEnd },
        checkOutTime: null,
      },
      {
        $set: {
          checkOutTime: new Date(),
          isAutoCheckout: true,
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: `Auto-exit completed at ${GYM_CONFIG.closingTime}`,
      processed: result.modifiedCount,
    })
  } catch (error) {
    console.error("Auto-exit cron error:", error)
    return NextResponse.json(
      { success: false, error: "Auto-exit failed" },
      { status: 500 }
    )
  }
}
