import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Member from "@/lib/models/Member"

// Public endpoint for kiosk - lookup member by registration number
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const regNumber = searchParams.get("regNumber")

    if (!regNumber) {
      return NextResponse.json(
        { success: false, error: "Registration number is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const member = await Member.findOne({
      registrationNumber: regNumber.toUpperCase(),
    }).select("_id fullName registrationNumber status membershipExpiryDate").lean()

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    // Check if membership is valid
    const isExpired = member.status === "Expired" || 
      (member.membershipExpiryDate && new Date(member.membershipExpiryDate) < new Date())

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        isExpired,
      },
    })
  } catch (error) {
    console.error("Member lookup error:", error)
    return NextResponse.json(
      { success: false, error: "Lookup failed" },
      { status: 500 }
    )
  }
}
