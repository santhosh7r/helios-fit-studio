import mongoose, { Document, Model, Schema } from "mongoose"

export interface IMember extends Document {
  _id: mongoose.Types.ObjectId
  fullName: string
  phone: string
  address: string
  registrationNumber: string
  joinDate: Date
  membershipPlan: string
  status: "Active" | "Expired" | "Paused"
  membershipStartDate: Date | null
  membershipExpiryDate: Date | null
  outstandingBalance: number
  notes: string
  createdAt: Date
  updatedAt: Date
}

const MemberSchema = new Schema<IMember>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [200, "Address cannot exceed 200 characters"],
    },
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    joinDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    membershipPlan: {
      type: String,
      required: true,
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["Active", "Expired", "Paused"],
      default: "Active",
    },
    membershipStartDate: {
      type: Date,
      default: null,
    },
    membershipExpiryDate: {
      type: Date,
      default: null,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for fast queries
MemberSchema.index({ status: 1 })
MemberSchema.index({ membershipExpiryDate: 1 })

// Prevent model recompilation in development
const Member: Model<IMember> =
  mongoose.models.Member || mongoose.model<IMember>("Member", MemberSchema)

export default Member
