import { verifyAuth } from "@/lib/auth"
import { GYM_CONFIG } from "@/lib/config"
import Attendance from "@/lib/models/Attendance"
import Member from "@/lib/models/Member"
import Payment from "@/lib/models/Payment"
import { connectDB } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const timeZone = GYM_CONFIG.timezone || "Asia/Kolkata"
    const now = new Date()
    
    // Today's date range (Timezone Aware)
    const localDateStr = now.toLocaleDateString("en-CA", { timeZone })
    const todayStart = new Date(localDateStr)

    const todayEnd = new Date(todayStart)
    todayEnd.setHours(23, 59, 59, 999)

    // This week's date range
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // This month's date range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Execute all queries in parallel
    const [
      totalMembers,
      activeMembers,
      expiredMembers,
      pausedMembers,
      expiringThisWeek,
      membersWithPendingPayment,
      todayAttendance,
      currentlyInGym,
      monthlyRevenue,
      pendingPaymentList,
      expiringList,
    ] = await Promise.all([
      // Total members
      Member.countDocuments(),
      
      // Active members
      Member.countDocuments({ status: "Active" }),
      
      // Expired members
      Member.countDocuments({ status: "Expired" }),
      
      // Paused members
      Member.countDocuments({ status: "Paused" }),
      
      // Members expiring this week
      Member.countDocuments({
        status: "Active",
        membershipExpiryDate: { $gte: todayStart, $lte: weekEnd },
      }),
      
      // Members with outstanding balance
      Member.countDocuments({
        outstandingBalance: { $gt: 0 },
      }),
      
      // Today's attendance count
      Attendance.countDocuments({
        date: { $gte: todayStart, $lte: todayEnd },
      }),
      
      // Currently in gym
      Attendance.countDocuments({
        checkOutTime: null,
      }),
      
      // This month's revenue
      Payment.aggregate([
        {
          $match: {
            paymentDate: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      
      // Priority list: Members who expired recently or need to pay this week
      Member.find({
        status: { $in: ["Active", "Expired"] },
        membershipExpiryDate: { 
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          $lte: weekEnd 
        },
      })
        .select("fullName registrationNumber phone membershipExpiryDate outstandingBalance status")
        .sort({ membershipExpiryDate: 1 })
        .limit(10)
        .lean(),
      
      // Members expiring soon list
      Member.find({
        status: "Active",
        membershipExpiryDate: { 
          $gte: todayStart, 
          $lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // Next 14 days
        },
      })
        .select("fullName registrationNumber phone membershipExpiryDate")
        .sort({ membershipExpiryDate: 1 })
        .limit(15)
        .lean(),
    ])

    const revenue = monthlyRevenue[0] || { total: 0, count: 0 }

    return NextResponse.json({
      success: true,
      data: {
        members: {
          total: totalMembers,
          active: activeMembers,
          expired: expiredMembers,
          paused: pausedMembers,
        },
        alerts: {
          expiringThisWeek,
          pendingPayments: membersWithPendingPayment,
        },
        attendance: {
          today: todayAttendance,
          currentlyInGym,
        },
        revenue: {
          thisMonth: revenue.total,
          paymentsThisMonth: revenue.count,
        },
        priorityList: pendingPaymentList,
        expiringList,
      },
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}
