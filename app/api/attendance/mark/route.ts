import { getCurrentSession, GYM_CONFIG } from "@/lib/config"
import Attendance from "@/lib/models/Attendance"
import Config from "@/lib/models/Config"
import Member from "@/lib/models/Member"
import { connectDB } from "@/lib/mongodb"
import { NextResponse } from "next/server"

// Simple rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 10 // Max 10 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const requests = rateLimitMap.get(identifier) || []
  
  // Remove old requests
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW)
  
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false
  }
  
  recentRequests.push(now)
  rateLimitMap.set(identifier, recentRequests)
  return true
}

// Mark attendance (public endpoint for kiosk)
export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { registrationNumber } = body

    if (!registrationNumber) {
      return NextResponse.json(
        { success: false, error: "Registration number is required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Get dynamic config
    let config = await Config.findOne().lean()
    if (!config) {
      config = GYM_CONFIG as any
    }

    // Check if gym is open (session time)
    const currentSession = getCurrentSession(config)
    if (!currentSession) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Gym is currently closed. Please come during session hours.",
          sessions: config?.sessions || GYM_CONFIG.sessions,
        },
        { status: 400 }
      )
    }

    // Find member
    const member = await Member.findOne({
      registrationNumber: registrationNumber.toUpperCase(),
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found. Please check your registration number." },
        { status: 404 }
      )
    }

    // Check membership status
    if (member.status === "Paused") {
      return NextResponse.json(
        { success: false, error: "Your membership is paused. Please contact the gym." },
        { status: 400 }
      )
    }

    // Check if expired
    const isExpired = member.status === "Expired" || 
      (member.membershipExpiryDate && new Date(member.membershipExpiryDate) < new Date())

    if (isExpired) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Your membership has expired. Please renew to continue.",
          memberName: member.fullName,
          isExpired: true,
        },
        { status: 400 }
      )
    }

    // Get today's date (normalized to start of day in Gym Timezone)
    // Uses Gym time (default Asia/Kolkata) to determine "Today"
    const timeZone = (config as any)?.timezone || "Asia/Kolkata"
    const now = new Date()
    // Get YYYY-MM-DD in Gym Timezone
    const localDateStr = now.toLocaleDateString("en-CA", { timeZone })
    // Create Date object for that YYYY-MM-DD (UTC Midnight)
    // This ensures that 1AM IST sits in the correct "Day" bucket
    const today = new Date(localDateStr)

    // Check today's attendance for this member
    const todayRecords = await Attendance.find({
      member: member._id,
      date: today,
    }).sort({ checkInTime: 1 })

    // Check session count
    const uniqueSessions = new Set(todayRecords.map(r => r.session))
    
    // Check if already marked for current session
    const currentSessionRecord = todayRecords.find(r => r.session === currentSession)

    if (currentSessionRecord) {
      // Already checked in for this session
      // Determine session name safely
      let sessionName = "Session"
      if (currentSession === "full-day") sessionName = "Full Day"
      else if (currentSession === "continuous") sessionName = "Day"
      else if (currentSession === "morning" || currentSession === "evening") {
        sessionName = config?.sessions?.[currentSession]?.name || GYM_CONFIG.sessions[currentSession].name
      }

      if (currentSessionRecord.checkOutTime) {
        // Both IN and OUT already marked
        return NextResponse.json({
          success: false,
          error: `You have already completed your ${sessionName} session.`,
          memberName: member.fullName,
          action: "completed",
        })
      } else {
        // Mark OUT
        currentSessionRecord.checkOutTime = new Date()
        await currentSessionRecord.save()

        return NextResponse.json({
          success: true,
          message: `Goodbye, ${member.fullName}! Checked out from ${sessionName} session.`,
          memberName: member.fullName,
          action: "checkout",
          checkOutTime: currentSessionRecord.checkOutTime,
        })
      }
    } else {
      // Not checked in for current session
      
      // Determine session name safely
      let sessionName = "Session"
      if (currentSession === "full-day") sessionName = "Full Day"
      else if (currentSession === "continuous") sessionName = "Day"
      else if (currentSession === "morning" || currentSession === "evening") {
        sessionName = config?.sessions?.[currentSession]?.name || GYM_CONFIG.sessions[currentSession].name
      }

      const maxSessions = config?.attendance?.maxSessionsPerDay || GYM_CONFIG.attendance.maxSessionsPerDay
      if (uniqueSessions.size >= maxSessions) {
        return NextResponse.json({
          success: false,
          error: `You have reached the maximum ${maxSessions} sessions for today.`,
          memberName: member.fullName,
          action: "limit_reached",
        })
      }

      // Create new check-in
      const attendance = await Attendance.create({
        member: member._id,
        date: today,
        session: currentSession,
        checkInTime: new Date(),
        checkOutTime: null,
        isAutoCheckout: false,
      })

      return NextResponse.json({
        success: true,
        message: `Welcome, ${member.fullName}! Checked in for ${sessionName} session.`,
        memberName: member.fullName,
        action: "checkin",
        checkInTime: attendance.checkInTime,
      })
    }
  } catch (error) {
    console.error("Mark attendance error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to mark attendance. Please try again." },
      { status: 500 }
    )
  }
}
