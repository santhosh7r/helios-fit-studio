import { verifyAuth } from "@/lib/auth"
import Member from "@/lib/models/Member"
import { connectDB } from "@/lib/mongodb"
import { NextResponse } from "next/server"

// Get all members with filtering and pagination
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Build query
    const query: Record<string, unknown> = {}
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { registrationNumber: { $regex: search, $options: "i" } },
      ]
    }
    
    if (status && status !== "all") {
      query.status = status
    }

    const skip = (page - 1) * limit
    const sortOptions: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const [members, total] = await Promise.all([
      Member.find(query).sort(sortOptions).skip(skip).limit(limit).lean(),
      Member.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get members error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch members" },
      { status: 500 }
    )
  }
}

// Create new member
export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { fullName, phone, address, registrationNumber, joinDate, membershipPlan, notes } = body
    
    // Validate required fields
    if (!fullName || !phone || !address || !registrationNumber) {
      return NextResponse.json(
        { success: false, error: "Full name, phone, address and registration number are required" },
        { status: 400 }
      )
    }

    // Check for duplicate phone
    const existingMember = await Member.findOne({ phone })
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "A member with this phone number already exists" },
        { status: 400 }
      )
    }

    // Check for duplicate registration number
    const existingReg = await Member.findOne({ registrationNumber })
    if (existingReg) {
      return NextResponse.json(
        { success: false, error: "A member with this registration number already exists" },
        { status: 400 }
      )
    }

    const member = await Member.create({
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      registrationNumber: registrationNumber.trim().toUpperCase(),
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      membershipPlan: membershipPlan || "monthly",
      status: "Active",
      notes: notes || "",
    })

    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch (error) {
    console.error("Create member error:", error)
    
    // Handle Mongoose validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to create member" },
      { status: 500 }
    )
  }
}
