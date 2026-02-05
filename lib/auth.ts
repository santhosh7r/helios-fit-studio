import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { connectDB } from "./mongodb"
import Admin, { IAdmin } from "./models/Admin"

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  throw new Error("Please define the JWT_SECRET environment variable")
}

export interface JWTPayload {
  userId: string
  username: string
  role: string
}

export interface AuthResult {
  success: boolean
  user?: JWTPayload
  error?: string
}

// Generate JWT token
export function generateToken(user: IAdmin): string {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    username: user.username,
    role: user.role,
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  })
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

// Get current user from cookies (for Server Components)
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    
    if (!token) {
      return { success: false, error: "No token found" }
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return { success: false, error: "Invalid token" }
    }
    
    return { success: true, user: payload }
  } catch {
    return { success: false, error: "Authentication failed" }
  }
}

// Verify auth for API routes
export async function verifyAuth(request: Request): Promise<AuthResult> {
  try {
    // Check Authorization header first
    const authHeader = request.headers.get("Authorization")
    let token: string | undefined
    
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7)
    } else {
      // Fall back to cookie
      const cookieHeader = request.headers.get("Cookie")
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split("=")
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        token = cookies["auth_token"]
      }
    }
    
    if (!token) {
      return { success: false, error: "No token provided" }
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return { success: false, error: "Invalid token" }
    }
    
    return { success: true, user: payload }
  } catch {
    return { success: false, error: "Authentication failed" }
  }
}

// Login function
export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: JWTPayload; error?: string }> {
  try {
    await connectDB()
    
    const admin = await Admin.findOne({ 
      $or: [{ username }, { email: username }],
      isActive: true 
    }).select("+password")
    
    if (!admin) {
      return { success: false, error: "Invalid credentials" }
    }
    
    const isMatch = await admin.comparePassword(password)
    if (!isMatch) {
      return { success: false, error: "Invalid credentials" }
    }
    
    // Update last login
    admin.lastLogin = new Date()
    await admin.save()
    
    const token = generateToken(admin)
    const user: JWTPayload = {
      userId: admin._id.toString(),
      username: admin.username,
      role: admin.role,
    }
    
    return { success: true, token, user }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "Login failed" }
  }
}

// Create initial admin (for setup)
export async function createInitialAdmin(
  username: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB()
    
    const existingAdmin = await Admin.findOne({})
    if (existingAdmin) {
      return { success: false, error: "Admin already exists" }
    }
    
    await Admin.create({
      username,
      email,
      password,
      role: "owner",
    })
    
    return { success: true }
  } catch (error) {
    console.error("Create admin error:", error)
    return { success: false, error: "Failed to create admin" }
  }
}
