import mongoose, { Document, Schema } from "mongoose"

const planSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  price: { type: Number, required: true },
  offerPrice: { type: Number, default: 0 },
})

const configSchema = new Schema(
  {
    name: { type: String, required: true },
    tagline: { type: String },
    logo: { type: String },
    contact: {
      phone: { type: String },
      email: { type: String },
      address: { type: String },
    },
    sessions: {
      morning: {
        name: { type: String, default: "Morning" },
        start: { type: String, required: true },
        end: { type: String, required: true },
      },
      evening: {
        name: { type: String, default: "Evening" },
        start: { type: String, required: true },
        end: { type: String, required: true },
      },
    },
    closingTime: { type: String, required: true },
    plans: [planSchema],
    paymentModes: [{ type: String }],
    memberStatus: [{ type: String }],
    attendance: {
      maxSessionsPerDay: { type: Number, default: 2 },
      autoExitEnabled: { type: Boolean, default: true },
    },
    regNumberPrefix: { type: String, default: "HF" },
    operatingMode: {
      type: String,
      enum: ["sessions", "continuous", "24hours"],
      default: "sessions",
    },
    continuousSession: {
      start: { type: String, default: "06:00" },
      end: { type: String, default: "22:00" },
    },
  },
  { timestamps: true },
)

export interface IPlan {
  id: string
  name: string
  duration: number
  price: number
  offerPrice?: number
}

export interface IConfig extends Document {
  name: string
  tagline?: string
  logo?: string
  contact: {
    phone?: string
    email?: string
    address?: string
  }
  sessions: {
    morning: { name: string; start: string; end: string }
    evening: { name: string; start: string; end: string }
  }
  closingTime: string
  plans: IPlan[]
  paymentModes: string[]
  memberStatus: string[]
  attendance: {
    maxSessionsPerDay: number
    autoExitEnabled: boolean
  }
  regNumberPrefix: string
  operatingMode: "sessions" | "continuous" | "24hours"
  continuousSession: {
    start: string
    end: string
  }
}

const Config = mongoose.models.Config || mongoose.model<IConfig>("Config", configSchema)

export default Config