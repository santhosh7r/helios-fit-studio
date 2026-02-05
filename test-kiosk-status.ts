import { getCurrentSession, GYM_CONFIG } from "./lib/config"
import Config from "./lib/models/Config"
import { connectDB } from "./lib/mongodb"

async function test() {
  try {
    console.log("1. Connecting to Database...")
    await connectDB()
    console.log("✓ Connected")

    console.log("\n2. Fetching Gym Configuration...")
    let config = await Config.findOne().lean()
    
    if (!config) {
      console.log("⚠ No custom config found in DB, using default GYM_CONFIG")
      config = GYM_CONFIG
    } else {
      console.log("✓ Found custom config in DB")
    }

    console.log("\n3. Current Session Settings:")
    console.log(JSON.stringify(config.sessions, null, 2))

    console.log("\n4. Checking Session Status...")
    const now = new Date()
    console.log("Current Time:", now.toLocaleTimeString('en-US', { hour12: false }))
    
    const session = getCurrentSession(config)
    
    if (session) {
      console.log(`\n✅ GYM IS OPEN. Current Session: ${session.toUpperCase()}`)
    } else {
      console.log("\n❌ GYM IS CLOSED")
    }

  } catch (error) {
    console.error("Test failed:", error)
  }
  process.exit(0)
}

test()
