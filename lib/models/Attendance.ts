import mongoose, { Document, Model, Schema } from "mongoose"

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId
  member: mongoose.Types.ObjectId
  date: Date // Normalized to start of day
  session: "morning" | "evening"
  checkInTime: Date
  checkOutTime: Date | null
  isAutoCheckout: boolean
  createdAt: Date
  updatedAt: Date
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member reference is required"],
    },
    date: {
      type: Date,
      required: true,
    },
    session: {
      type: String,
      enum: ["morning", "evening", "continuous", "full-day"],
      required: [true, "Session is required"],
    },
    checkInTime: {
      type: Date,
      required: [true, "Check-in time is required"],
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    isAutoCheckout: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for unique attendance per member + date + session
AttendanceSchema.index({ member: 1, date: 1, session: 1 }, { unique: true })
AttendanceSchema.index({ date: 1 })
AttendanceSchema.index({ member: 1, date: -1 })

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema)

export default Attendance
