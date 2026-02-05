import bcrypt from "bcryptjs"
import mongoose, { Document, Model, Schema } from "mongoose"

export interface IAdmin extends Document {
  _id: mongoose.Types.ObjectId
  username: string
  email: string
  password: string
  role: "owner" | "trainer" | "staff"
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const AdminSchema = new Schema<IAdmin>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ["owner", "trainer", "staff"],
      default: "staff",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Hash password before saving
AdminSchema.pre("save", async function () {
  if (!this.isModified("password")) return
  
  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password method
AdminSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Indexes


const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema)

export default Admin
