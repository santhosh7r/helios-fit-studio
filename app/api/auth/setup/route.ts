import { NextResponse } from "next/server"
import { createInitialAdmin } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Admin from "@/lib/models/Admin"

// Check if setup is needed
export async function GET() {
  try {
    await connectDB()
    const adminCount = await Admin.countDocuments()
    
    return NextResponse.json({
      setupRequired: adminCount === 0,
    })
  } catch (error) {
    console.error("Setup check error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Create initial admin
export async function POST(request: Request) {
  try {
    await connectDB()
    
    // Check if admin already exists
    const adminCount = await Admin.countDocuments()
    if (adminCount > 0) {
      return NextResponse.json(
        { success: false, error: "Admin already exists" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { username, email, password } = body

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const result = await createInitialAdmin(username, email, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Setup API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
