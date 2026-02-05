import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const result = await getCurrentUser()

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
