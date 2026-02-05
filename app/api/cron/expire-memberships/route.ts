import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Member from "@/lib/models/Member"

// This endpoint should be called by a daily cron job
// It marks members as expired if their membership has ended

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get("Authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const now = new Date()

    // Find all active members whose membership has expired
    const result = await Member.updateMany(
      {
        status: "Active",
        membershipExpiryDate: { $lt: now },
      },
      {
        $set: {
          status: "Expired",
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: "Membership expiry check completed",
      expiredCount: result.modifiedCount,
    })
  } catch (error) {
    console.error("Expire memberships cron error:", error)
    return NextResponse.json(
      { success: false, error: "Membership expiry check failed" },
      { status: 500 }
    )
  }
}
