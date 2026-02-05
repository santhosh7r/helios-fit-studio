// Gym Configuration - Easy to customize for any gym
export const GYM_CONFIG = {
  // Gym Identity
  name: "Helios Fit Studio",
  tagline: "Your Strength, Our Mission",
  logo: "/logo.png",

  // Contact Info
  contact: {
    phone: "+91 98765 43210",
    email: "info@heliosfitness.com",
    address: "123 Fitness Street, Gym City",
  },

  // Session Timings (24-hour format)
  sessions: {
    morning: {
      name: "Morning",
      start: "05:00",
      end: "01:30",
    },
    evening: {
      name: "Evening",
      start: "16:00",
      end: "21:30",
    },
  },

  // Gym Operating Hours
  closingTime: "21:30", // Auto-exit time for attendance

  // Membership Plans
  plans: [
    { id: "monthly", name: "Monthly", duration: 30, price: 1000 },
    { id: "quarterly", name: "Quarterly", duration: 90, price: 2700 },
    { id: "half-yearly", name: "Half Yearly", duration: 180, price: 5000 },
    { id: "yearly", name: "Yearly", duration: 365, price: 9000 },
    { id: "custom", name: "Custom", duration: 0, price: 0 }, // Duration set manually
  ],

  // Payment Modes
  paymentModes: ["Cash", "UPI", "Card", "Bank Transfer"],

  // Member Status Options
  memberStatus: ["Active", "Expired", "Paused"],

  // Attendance Settings
  attendance: {
    maxSessionsPerDay: 2,
    autoExitEnabled: true,
  },

  // Registration Number Prefix
  regNumberPrefix: "HF",

  // Operating Mode
  operatingMode: "sessions",
  continuousSession: {
    start: "06:00",
    end: "22:00",
  },
} as const;

// Helper to get current session
export function getCurrentSession(config: any = GYM_CONFIG): "morning" | "evening" | "continuous" | "full-day" | null {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const mode = config.operatingMode || "sessions";

  if (mode === "24hours") {
    return "full-day";
  }

  const parseTime = (time: string, defaultValue: string) => {
    // Handle simplified time format or missing time
    if (!time) time = defaultValue;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Check if current time is within range, supporting cross-midnight
  const isTimeInRange = (current: number, start: number, end: number) => {
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // Cross-midnight (e.g. 23:00 to 02:00)
      return current >= start || current <= end;
    }
  };

  if (mode === "continuous") {
    const start = parseTime(config.continuousSession?.start, GYM_CONFIG.continuousSession.start);
    const end = parseTime(config.continuousSession?.end, GYM_CONFIG.continuousSession.end);
    
    if (isTimeInRange(currentTime, start, end)) {
      return "continuous";
    }
    return null;
  }

  // Default "sessions" mode
  const morningStart = parseTime(config.sessions?.morning?.start, GYM_CONFIG.sessions.morning.start);
  const morningEnd = parseTime(config.sessions?.morning?.end, GYM_CONFIG.sessions.morning.end);
  const eveningStart = parseTime(config.sessions?.evening?.start, GYM_CONFIG.sessions.evening.start);
  const eveningEnd = parseTime(config.sessions?.evening?.end, GYM_CONFIG.sessions.evening.end);

  if (isTimeInRange(currentTime, morningStart, morningEnd)) {
    return "morning";
  }
  if (isTimeInRange(currentTime, eveningStart, eveningEnd)) {
    return "evening";
  }

  return null;
}

// Helper to check if gym is open
export function isGymOpen(): boolean {
  return getCurrentSession() !== null;
}

// Helper to calculate expiry date
export function calculateExpiryDate(
  startDate: Date,
  durationDays: number,
): Date {
  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + durationDays);
  return expiry;
}

// Helper to get plan by ID
export function getPlanById(planId: string, config?: any) {
  const plans = config?.plans || GYM_CONFIG.plans;
  return plans.find((p: any) => p.id === planId);
}

// Type exports
export type SessionType = "morning" | "evening" | "continuous" | "full-day";
export type MemberStatus = "Active" | "Expired" | "Paused";
export type PaymentMode = (typeof GYM_CONFIG.paymentModes)[number];
