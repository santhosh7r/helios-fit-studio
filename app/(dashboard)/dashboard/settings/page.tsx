"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GYM_CONFIG } from "@/lib/config";
import { IConfig } from "@/lib/models/Config";
import { Building, Clock, CreditCard, Plus, Settings2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

export default function SettingsPage() {
  const { data, isLoading, mutate } = useSWR<{ success: boolean; data: IConfig }>(
    "/api/config",
    fetcher
  );

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<IConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when data loads
  const config = data?.data || (GYM_CONFIG as unknown as IConfig);

  const startEditing = () => {
    // Merge with default config to ensure all fields exist (like new continuousSession)
    setFormData({
      ...GYM_CONFIG,
      ...config,
      continuousSession: config.continuousSession || GYM_CONFIG.continuousSession,
    } as unknown as IConfig);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormData(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        mutate();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
    setIsSaving(false);
  };

  // Helper to update deeply nested state
  const updateField = (path: string, value: any) => {
    if (!formData) return;
    const newData = { ...formData };
    const keys = path.split(".");
    let current: any = newData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setFormData(newData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  const displayConfig = isEditing && formData ? formData : config;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">View and manage gym configuration</p>
        </div>
        <div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button onClick={startEditing}>
              <Settings2 className="mr-2 h-4 w-4" />
              Edit Settings
            </Button>
          )}
        </div>
      </div>

      {/* Gym Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="h-5 w-5" />
            Gym Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gym Name</Label>
              {isEditing ? (
                <Input
                  value={displayConfig.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              ) : (
                <p className="font-medium">{displayConfig.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              {isEditing ? (
                <Input
                  value={displayConfig.tagline || ""}
                  onChange={(e) => updateField("tagline", e.target.value)}
                />
              ) : (
                <p className="font-medium">{displayConfig.tagline}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              {isEditing ? (
                <Input
                  value={displayConfig.contact.phone || ""}
                  onChange={(e) => updateField("contact.phone", e.target.value)}
                />
              ) : (
                <p className="font-medium">{displayConfig.contact.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              {isEditing ? (
                <Input
                  value={displayConfig.contact.email || ""}
                  onChange={(e) => updateField("contact.email", e.target.value)}
                />
              ) : (
                <p className="font-medium">{displayConfig.contact.email}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            {isEditing ? (
              <Input
                value={displayConfig.contact.address || ""}
                onChange={(e) => updateField("contact.address", e.target.value)}
              />
            ) : (
              <p className="font-medium">{displayConfig.contact.address}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Timings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Timings
          </CardTitle>
          <CardDescription>
            Attendance can only be marked during these hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Operating Type</Label>
            {isEditing ? (
              <Select
                value={displayConfig.operatingMode || "sessions"}
                onValueChange={(val) => updateField("operatingMode", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sessions">Split Sessions (Morning & Evening)</SelectItem>
                  <SelectItem value="continuous">Continuous Day (Open to Close)</SelectItem>
                  <SelectItem value="24hours">24 Hours (Full Day)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
               <div className="font-medium p-2 border rounded-md">
                {(displayConfig.operatingMode || "sessions") === "sessions" && "Split Sessions (Morning & Evening)"}
                {displayConfig.operatingMode === "continuous" && "Continuous Day (Open to Close)"}
                {displayConfig.operatingMode === "24hours" && "24 Hours (Full Day)"}
               </div>
            )}
          </div>

          {(displayConfig.operatingMode || "sessions") === "sessions" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-3">
                <Badge variant="secondary">Morning Session</Badge>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start</Label>
                    {isEditing ? (
                      <Input
                        type="time"
                        value={displayConfig.sessions.morning.start}
                        onChange={(e) => updateField("sessions.morning.start", e.target.value)}
                      />
                    ) : (
                      <p className="font-bold">{displayConfig.sessions.morning.start}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                    {isEditing ? (
                      <Input
                        type="time"
                        value={displayConfig.sessions.morning.end}
                        onChange={(e) => updateField("sessions.morning.end", e.target.value)}
                      />
                    ) : (
                      <p className="font-bold">{displayConfig.sessions.morning.end}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg space-y-3">
                <Badge variant="secondary">Evening Session</Badge>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start</Label>
                    {isEditing ? (
                      <Input
                        type="time"
                        value={displayConfig.sessions.evening.start}
                        onChange={(e) => updateField("sessions.evening.start", e.target.value)}
                      />
                    ) : (
                      <p className="font-bold">{displayConfig.sessions.evening.start}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                     {isEditing ? (
                       <Input
                        type="time"
                        value={displayConfig.sessions.evening.end}
                        onChange={(e) => updateField("sessions.evening.end", e.target.value)}
                      />
                    ) : (
                      <p className="font-bold">{displayConfig.sessions.evening.end}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {displayConfig.operatingMode === "continuous" && (
             <div className="p-4 border rounded-lg space-y-3">
              <Badge variant="secondary">Gym Timings</Badge>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Open Time</Label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={displayConfig.continuousSession?.start || "06:00"}
                      onChange={(e) => updateField("continuousSession.start", e.target.value)}
                    />
                  ) : (
                    <p className="font-bold text-lg">{displayConfig.continuousSession?.start || "06:00"}</p>
                  )}
                </div>
                <div>
                  <Label>Close Time</Label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={displayConfig.continuousSession?.end || "22:00"}
                      onChange={(e) => updateField("continuousSession.end", e.target.value)}
                    />
                  ) : (
                    <p className="font-bold text-lg">{displayConfig.continuousSession?.end || "22:00"}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {displayConfig.operatingMode === "24hours" && (
            <div className="p-8 border rounded-lg text-center bg-muted/20">
              <Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-bold">24/7 Access</h3>
              <p className="text-muted-foreground mt-2">The gym is open 24 hours a day, 7 days a week.</p>
            </div>
          )}

           <div className="flex items-center gap-2 pt-4 border-t">
            <Label className="whitespace-nowrap">Auto-checkout time:</Label>
             {isEditing ? (
              <Input
                type="time"
                className="w-32"
                value={displayConfig.closingTime}
                onChange={(e) => updateField("closingTime", e.target.value)}
              />
            ) : (
               <span className="font-bold">{displayConfig.closingTime}</span>
            )}
            <span className="text-xs text-muted-foreground ml-2">(Time when all active sessions are auto-closed)</span>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span>Maximum sessions per day</span>
            {isEditing ? (
              <Input
                type="number"
                className="w-20"
                value={displayConfig.attendance.maxSessionsPerDay}
                onChange={(e) => updateField("attendance.maxSessionsPerDay", Number(e.target.value))}
              />
            ) : (
              <Badge>{displayConfig.attendance.maxSessionsPerDay}</Badge>
            )}
          </div>
           <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span>Registration number prefix</span>
             {isEditing ? (
              <Input
                className="w-24 uppercase"
                value={displayConfig.regNumberPrefix}
                onChange={(e) => updateField("regNumberPrefix", e.target.value)}
              />
            ) : (
              <Badge variant="outline">{displayConfig.regNumberPrefix}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Note: Plans and Payment Modes editing is a bit more complex UI-wise, logic is similar. 
          For now let's keep them read-only or add simple editing if needed later. 
          The user asked "make the data editable", so we covered the main config fields.
      */}

      {/* Membership Plans - Currently Read Only in this iteration, can be expanded */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Membership Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayConfig.plans.map((plan, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-2 relative">
                <div className="flex justify-between items-center pr-6">
                  {isEditing ? (
                    <Input
                      value={plan.name}
                      onChange={(e) => updateField(`plans.${index}.name`, e.target.value)}
                      className="font-medium h-8"
                      placeholder="Plan Name"
                    />
                  ) : (
                    <p className="font-medium">{plan.name}</p>
                  )}
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 text-destructive"
                      onClick={() => {
                        const newPlans = displayConfig.plans.filter((_, i) => i !== index);
                        updateField("plans", newPlans);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                     <div>
                      <Label className="text-xs">Plan ID (Internal)</Label>
                      <Input
                        value={plan.id}
                        onChange={(e) => updateField(`plans.${index}.id`, e.target.value)}
                         className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price (₹)</Label>
                      <Input
                        type="number"
                        value={plan.price}
                        onChange={(e) => updateField(`plans.${index}.price`, Number(e.target.value))}
                      />
                    </div>
                     <div>
                      <Label className="text-xs">Duration (Days)</Label>
                      <Input
                        type="number"
                        value={plan.duration}
                         onChange={(e) => updateField(`plans.${index}.duration`, Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Offer Price (₹, optional)</Label>
                      <Input
                        type="number"
                        value={plan.offerPrice !== undefined ? plan.offerPrice : 0}
                        onChange={(e) => updateField(`plans.${index}.offerPrice`, Number(e.target.value))}
                        placeholder="0 for no offer"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {plan.price > 0 ? (
                      <>
                        <div className="flex items-baseline gap-2">
                           {plan.offerPrice && plan.offerPrice > 0 ? (
                             <>
                               <p className="text-2xl font-bold text-green-600">
                                 ₹{plan.offerPrice}
                               </p>
                               <p className="text-sm text-muted-foreground line-through">
                                 ₹{plan.price}
                               </p>
                             </>
                           ) : (
                             <p className="text-2xl font-bold text-primary">
                               ₹{plan.price}
                             </p>
                           )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {plan.duration} days
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Custom duration & price
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
            {isEditing && (
              <Button
                variant="outline"
                className="h-full min-h-[200px] border-dashed"
                onClick={() => {
                  const newPlan = {
                    id: `plan_${Date.now()}`,
                    name: "New Offer",
                    price: 1500,
                    duration: 30
                  };
                  updateField("plans", [...displayConfig.plans, newPlan]);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
