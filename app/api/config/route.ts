import { verifyAuth } from "@/lib/auth"
import { GYM_CONFIG } from "@/lib/config"
import Config from "@/lib/models/Config"
import { connectDB } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Public endpoint for gym configuration
    // const auth = await verifyAuth()
    // if (!auth.success) {
    //   return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    // }

    await connectDB()

    let config = await Config.findOne().lean()

    if (!config) {
      // Seed initial config if not exists
      config = await Config.create(GYM_CONFIG)
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error("Get config error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch configuration" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Only allow admin/owner to update config
    // Assuming verifyAuth returns payload with role or we check it here
    // For now simple auth check is used as in other routes

    await connectDB()

    const body = await request.json()
    
    // Update config
    // We assume there's only one config document
    const config = await Config.findOneAndUpdate({}, { $set: body }, { new: true, upsert: true }).lean()

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error("Update config error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update configuration" },
      { status: 500 }
    )
  }
}
