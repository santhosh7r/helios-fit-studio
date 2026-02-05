import mongoose, { Document, Model, Schema } from "mongoose"

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId
  member: mongoose.Types.ObjectId
  amount: number
  paymentDate: Date
  paymentMode: "Cash" | "UPI" | "Card" | "Bank Transfer"
  planId: string
  planName: string // Snapshot of plan name
  planDuration: number // in days
  startDate: Date
  expiryDate: Date
  nextDueDate: Date
  isPartialPayment: boolean
  totalPlanAmount: number
  balanceRemaining: number
  receiptNumber: string
  notes: string
  isDeleted: boolean // Soft delete
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member reference is required"],
    },
    isDeleted: { type: Boolean, default: false },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [1, "Amount must be at least 1"],
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank Transfer"],
      required: [true, "Payment mode is required"],
    },
    planId: {
      type: String,
      required: [true, "Plan ID is required"],
    },
    planName: {
      type: String,
      required: [true, "Plan Name is required"],
    },
    planDuration: {
      type: Number,
      required: [true, "Plan duration is required"],
      min: 0,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    nextDueDate: {
      type: Date,
      required: [true, "Next due date is required"],
    },
    isPartialPayment: {
      type: Boolean,
      default: false,
    },
    totalPlanAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceRemaining: {
      type: Number,
      default: 0,
      min: 0,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
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

// Indexes
PaymentSchema.index({ member: 1, paymentDate: -1 })
PaymentSchema.index({ paymentDate: -1 })

// Generate unique receipt number
PaymentSchema.pre("save", async function () {
  if (this.isNew && !this.receiptNumber) {
    const date = new Date()
    const prefix = `RCP${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
    const count = await mongoose.models.Payment.countDocuments({
      receiptNumber: { $regex: `^${prefix}` },
    })
    this.receiptNumber = `${prefix}${String(count + 1).padStart(4, "0")}`
  }
})

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema)

export default Payment
