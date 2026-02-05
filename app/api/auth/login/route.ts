import { NextResponse } from "next/server"
import { loginUser } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      )
    }

    const result = await loginUser(username, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set("auth_token", result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return NextResponse.json({
      success: true,
      user: result.user,
    })
  } catch (error) {
    console.error("Login API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
