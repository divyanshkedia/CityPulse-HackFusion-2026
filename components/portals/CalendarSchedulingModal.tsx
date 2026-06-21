"use client";

import { useState, useEffect } from "react";
import { User, Ticket } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Save,
  Zap,
  Loader2,
  Sun,
  Moon,
  CalendarDays,
  Grid,
  List,
  ArrowRight,
  CheckSquare,
  Bell,
  Target,
} from "lucide-react";
const supabase = getSupabase()
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: "assignment" | "break" | "training" | "meeting" | "unavailable";
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  color: string;
  incident_id?: string;
  location?: string;
}

interface CalendarSchedulingModalProps {
  staff: User;
  ticket: Ticket;
  onClose: () => void;
  onAssign: (
    staffName: string,
    startTime: Date,
    endTime: Date,
  ) => Promise<void>;
  currentUser: User;
}

export default function CalendarSchedulingModal({
  staff,
  ticket,
  onClose,
  onAssign,
  currentUser,
}: CalendarSchedulingModalProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [view, setView] = useState<"day" | "week">("week");
  const [suggestedSlots, setSuggestedSlots] = useState<any[]>([]);
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [selectedTimeRange, setSelectedTimeRange] = useState<{
    start: string;
    end: string;
  }>({
    start: "09:00",
    end: "17:00",
  });

  // Fetch staff calendar events
  const loadStaffCalendar = async () => {
    setLoading(true);
    try {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const { data: eventsData, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("staff_id", staff.id)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      setEvents(eventsData || []);

      // Generate suggested time slots based on availability
      generateSuggestedSlots();
    } catch (error) {
      console.error("Error loading calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate suggested time slots
  const generateSuggestedSlots = () => {
    const today = new Date();
    const slots = [];

    // Generate slots for next 3 days
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Morning slot (9 AM - 12 PM)
      const morningStart = new Date(date);
      morningStart.setHours(9, 0, 0, 0);
      const morningEnd = new Date(date);
      morningEnd.setHours(12, 0, 0, 0);

      // Afternoon slot (1 PM - 4 PM)
      const afternoonStart = new Date(date);
      afternoonStart.setHours(13, 0, 0, 0);
      const afternoonEnd = new Date(date);
      afternoonEnd.setHours(16, 0, 0, 0);

      slots.push({
        date: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: "Morning (9 AM - 12 PM)",
        start: morningStart,
        end: morningEnd,
      });

      slots.push({
        date: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: "Afternoon (1 PM - 4 PM)",
        start: afternoonStart,
        end: afternoonEnd,
      });
    }

    setSuggestedSlots(slots);
  };

  // Check if time slot conflicts with existing events
  const checkSlotConflict = (start: Date, end: Date): boolean => {
    return events.some((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return start < eventEnd && end > eventStart;
    });
  };

  // Check if time slot is available for a specific day
  const isTimeSlotAvailable = (day: Date, hour: number): boolean => {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(day);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return !events.some((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return (
        eventStart.toDateString() === day.toDateString() &&
        eventStart.getHours() <= hour &&
        eventEnd.getHours() >= hour
      );
    });
  };

  // Get event at specific time slot
  const getEventAtTime = (
    day: Date,
    hour: number,
  ): CalendarEvent | undefined => {
    return events.find((event) => {
      const eventStart = new Date(event.start_time);
      return (
        eventStart.toDateString() === day.toDateString() &&
        eventStart.getHours() <= hour &&
        new Date(event.end_time).getHours() >= hour
      );
    });
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!selectedTimeSlot) {
      alert("Please select a time slot");
      return;
    }

    if (checkSlotConflict(selectedTimeSlot.start, selectedTimeSlot.end)) {
      alert("Selected time slot conflicts with existing events");
      return;
    }

    try {
      // First create the calendar event
      const { error: eventError } = await supabase
        .from("calendar_events")
        .insert({
          staff_id: staff.id,
          staff_name: staff.name,
          incident_id: ticket.id,
          event_type: "assignment",
          title: `Task: ${ticket.title}`,
          description: `Assigned by ${currentUser.name}`,
          start_time: selectedTimeSlot.start.toISOString(),
          end_time: selectedTimeSlot.end.toISOString(),
          location: ticket.location,
          status: "scheduled",
          color: "#3b82f6",
          created_by: currentUser.name,
        });

      if (eventError) throw eventError;

      // Update the ticket
      const { error: ticketError } = await supabase
        .from("incidents")
        .update({
          assigned_to: staff.name,
          status: "assigned",
          scheduled_start: selectedTimeSlot.start.toISOString(),
          scheduled_end: selectedTimeSlot.end.toISOString(),
          estimated_duration_hours: estimatedHours,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (ticketError) throw ticketError;

      // Log audit
      await supabase.from("audit_logs").insert({
        incident_id: ticket.id,
        action: "assignment_with_schedule",
        actor: currentUser.name,
        actor_role: currentUser.role,
        field_changed: "assigned_to",
        old_value: ticket.assignedTo || "",
        new_value: staff.name,
        timestamp: new Date().toISOString(),
      });

      alert("Task assigned and scheduled successfully!");
      onAssign(staff.name, selectedTimeSlot.start, selectedTimeSlot.end);
      onClose();
    } catch (error) {
      console.error("Assignment failed:", error);
      alert("Failed to assign task");
    }
  };

  // Navigate weeks
  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === "prev" ? -7 : 7));
    setSelectedDate(newDate);
  };

  // Navigate days
  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === "prev" ? -1 : 1));
    setSelectedDate(newDate);
  };

  useEffect(() => {
    loadStaffCalendar();
  }, [selectedDate]);

  // Generate week days
  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Generate time slots for day view
  const getTimeSlots = () => {
    const slots = [];
    const [startHour] = selectedTimeRange.start.split(":").map(Number);
    const [endHour] = selectedTimeRange.end.split(":").map(Number);

    for (let hour = startHour; hour < endHour; hour++) {
      const start = new Date(selectedDate);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(hour + 1, 0, 0, 0);
      slots.push({ hour, start, end });
    }
    return slots;
  };

  // Handle time slot click
  const handleTimeSlotClick = (day: Date, hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(day);
    end.setHours(hour + estimatedHours, 0, 0, 0);

    // Check if any of the selected hours conflict
    let hasConflict = false;
    for (let h = hour; h < hour + estimatedHours; h++) {
      if (!isTimeSlotAvailable(day, h)) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      alert(
        `Selected time slot conflicts with existing events. Please choose a different time.`,
      );
      return;
    }

    setSelectedTimeSlot({ start, end });
  };

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Schedule Assignment
                  </h2>
                  <p className="text-gray-600">
                    Assigning to:{" "}
                    <span className="font-semibold">{staff.name}</span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {ticket.ticketNumber}: {ticket.title}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(90vh-140px)]">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Calendar */}
              <div className="lg:col-span-2">
                {/* Calendar Navigation */}
                <Card className="p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          view === "week"
                            ? () => navigateWeek("prev")
                            : () => navigateDay("prev")
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {view === "week"
                          ? `Week of ${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - 
                          ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : selectedDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          view === "week"
                            ? () => navigateWeek("next")
                            : () => navigateDay("next")
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={view === "day" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setView("day")}
                      >
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Day
                      </Button>
                      <Button
                        variant={view === "week" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setView("week")}
                      >
                        <Grid className="h-4 w-4 mr-2" />
                        Week
                      </Button>
                    </div>
                  </div>

                  {/* Time Range Selector */}
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Working Hours
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={selectedTimeRange.start}
                          onChange={(e) =>
                            setSelectedTimeRange({
                              ...selectedTimeRange,
                              start: e.target.value,
                            })
                          }
                          className="w-32"
                        />
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <Input
                          type="time"
                          value={selectedTimeRange.end}
                          onChange={(e) =>
                            setSelectedTimeRange({
                              ...selectedTimeRange,
                              end: e.target.value,
                            })
                          }
                          className="w-32"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (hours)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="8"
                        value={estimatedHours}
                        onChange={(e) =>
                          setEstimatedHours(parseInt(e.target.value) || 1)
                        }
                        className="w-20"
                      />
                    </div>
                  </div>

                  {/* Week Calendar */}
                  {view === "week" ? (
                    <div className="border rounded-lg overflow-hidden">
                      {/* Header with days */}
                      <div className="grid grid-cols-8 border-b">
                        <div className="p-3 text-sm font-medium text-gray-600 border-r bg-gray-50">
                          Time
                        </div>
                        {weekDays.map((day, index) => (
                          <div
                            key={index}
                            className={`p-3 text-center border-r ${
                              day.toDateString() === new Date().toDateString()
                                ? "bg-blue-50"
                                : "bg-gray-50"
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {day.toLocaleDateString("en-US", {
                                weekday: "short",
                              })}
                            </div>
                            <div
                              className={`text-lg font-bold ${
                                day.toDateString() === new Date().toDateString()
                                  ? "text-blue-600"
                                  : "text-gray-700"
                              }`}
                            >
                              {day.getDate()}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Time slots */}
                      <div className="max-h-[400px] overflow-y-auto">
                        {timeSlots.map((slot, slotIndex) => (
                          <div
                            key={slotIndex}
                            className="grid grid-cols-8 border-b"
                          >
                            <div className="p-3 text-sm text-gray-600 border-r bg-gray-50">
                              <div className="flex items-center justify-between">
                                <span>
                                  {slot.start.toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {slot.hour < 12 ? (
                                    <Sun className="h-3 w-3" />
                                  ) : (
                                    <Moon className="h-3 w-3" />
                                  )}
                                </span>
                              </div>
                            </div>
                            {weekDays.map((day, dayIndex) => {
                              const isAvailable = isTimeSlotAvailable(
                                day,
                                slot.hour,
                              );
                              const event = getEventAtTime(day, slot.hour);
                              const isSelected =
                                selectedTimeSlot &&
                                selectedTimeSlot.start.getDate() ===
                                  day.getDate() &&
                                selectedTimeSlot.start.getHours() <=
                                  slot.hour &&
                                selectedTimeSlot.end.getHours() > slot.hour;

                              return (
                                <div
                                  key={dayIndex}
                                  className={`p-3 border-r relative ${
                                    isSelected
                                      ? "bg-blue-100 border-blue-300"
                                      : event
                                        ? "bg-red-50 cursor-not-allowed"
                                        : "hover:bg-gray-50 cursor-pointer"
                                  }`}
                                  onClick={() => {
                                    if (isAvailable) {
                                      handleTimeSlotClick(day, slot.hour);
                                    }
                                  }}
                                >
                                  {event ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div
                                        className="w-full h-full rounded"
                                        style={{
                                          backgroundColor: event.color + "20",
                                          borderLeft: `4px solid ${event.color}`,
                                        }}
                                      >
                                        <div className="p-2">
                                          <p className="text-xs font-medium truncate">
                                            {event.title}
                                          </p>
                                          <p className="text-xs text-gray-600 truncate">
                                            {new Date(
                                              event.start_time,
                                            ).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : isSelected ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-full h-full bg-blue-100 rounded border-2 border-blue-300">
                                        <div className="p-2">
                                          <p className="text-xs font-medium text-blue-700">
                                            Selected
                                          </p>
                                          <p className="text-xs text-blue-600">
                                            {selectedTimeSlot.start.toLocaleTimeString(
                                              [],
                                              {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              },
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-full flex items-center justify-center">
                                      {isAvailable ? (
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Day View
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">
                          {selectedDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {
                              events.filter(
                                (e) =>
                                  new Date(e.start_time).toDateString() ===
                                  selectedDate.toDateString(),
                              ).length
                            }{" "}
                            events
                          </Badge>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {timeSlots.map((slot, index) => {
                          const isAvailable = isTimeSlotAvailable(
                            selectedDate,
                            slot.hour,
                          );
                          const event = getEventAtTime(selectedDate, slot.hour);
                          const isSelected =
                            selectedTimeSlot &&
                            selectedTimeSlot.start.getHours() <= slot.hour &&
                            selectedTimeSlot.end.getHours() > slot.hour;

                          return (
                            <div
                              key={index}
                              className={`p-4 border-b flex items-center justify-between ${
                                isSelected
                                  ? "bg-blue-50 border-blue-300"
                                  : event
                                    ? "bg-red-50"
                                    : "hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                if (isAvailable) {
                                  handleTimeSlotClick(selectedDate, slot.hour);
                                }
                              }}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-12 text-center ${
                                    isSelected
                                      ? "text-blue-700 font-bold"
                                      : event
                                        ? "text-red-700"
                                        : "text-gray-700"
                                  }`}
                                >
                                  {slot.start.toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </div>
                                <div className="flex-1">
                                  {event ? (
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: event.color }}
                                      ></div>
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {event.title}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          {new Date(
                                            event.start_time,
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}{" "}
                                          -
                                          {new Date(
                                            event.end_time,
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  ) : isSelected ? (
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                      <div>
                                        <p className="font-medium text-blue-700">
                                          Selected Time Slot
                                        </p>
                                        <p className="text-sm text-blue-600">
                                          {selectedTimeSlot.start.toLocaleTimeString(
                                            [],
                                            {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            },
                                          )}{" "}
                                          -
                                          {selectedTimeSlot.end.toLocaleTimeString(
                                            [],
                                            {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            },
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-3 h-3 rounded-full ${
                                          isAvailable
                                            ? "bg-green-500"
                                            : "bg-gray-300"
                                        }`}
                                      ></div>
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {isAvailable
                                            ? "Available"
                                            : "Unavailable"}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Click to schedule for {estimatedHours}{" "}
                                          hour{estimatedHours !== 1 ? "s" : ""}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                {event ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Booked
                                  </Badge>
                                ) : isSelected ? (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                    Selected
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {isAvailable ? "Available" : "Busy"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Existing Events */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Scheduled Events
                    </h3>
                    <Badge variant="outline">
                      {events.length} events this week
                    </Badge>
                  </div>
                  {events.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">
                        No events scheduled for this week
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="p-4 border rounded-lg"
                          style={{
                            borderLeftColor: event.color,
                            borderLeftWidth: "4px",
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {event.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {event.description}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="capitalize"
                              style={{
                                borderColor: event.color,
                                color: event.color,
                              }}
                            >
                              {event.event_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(
                                event.start_time,
                              ).toLocaleDateString()}{" "}
                              {new Date(event.start_time).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}{" "}
                              -
                              {new Date(event.end_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Right Column - Assignment Details */}
              <div className="space-y-6">
                {/* Task Details */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Task Details
                    </h3>
                    <Badge
                      className={`
                        ${
                          ticket.severity === "critical"
                            ? "bg-red-100 text-red-800"
                            : ticket.severity === "high"
                              ? "bg-orange-100 text-orange-800"
                              : ticket.severity === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                        }
                      `}
                    >
                      {ticket.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Task ID</p>
                      <p className="font-medium">{ticket.ticketNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Title</p>
                      <p className="font-medium">{ticket.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <p className="font-medium">{ticket.location}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Category</p>
                      <Badge variant="outline">{ticket.category}</Badge>
                    </div>
                  </div>
                </Card>

                {/* Selected Time Slot */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Selected Time
                  </h3>
                  {selectedTimeSlot ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <p className="font-medium text-gray-900">
                                {selectedTimeSlot.start.toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <p className="text-gray-600">
                                {selectedTimeSlot.start.toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )}{" "}
                                -
                                {selectedTimeSlot.end.toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTimeSlot(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Estimated Duration
                          </label>
                          <div className="flex gap-2">
                            <select
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                              value={estimatedHours}
                              onChange={(e) => {
                                const hours = parseInt(e.target.value);
                                setEstimatedHours(hours);
                                const newEnd = new Date(selectedTimeSlot.start);
                                newEnd.setHours(
                                  selectedTimeSlot.start.getHours() + hours,
                                );
                                setSelectedTimeSlot({
                                  ...selectedTimeSlot,
                                  end: newEnd,
                                });
                              }}
                            >
                              <option value="1">1 hour</option>
                              <option value="2">2 hours</option>
                              <option value="3">3 hours</option>
                              <option value="4">4 hours</option>
                              <option value="8">Full day (8 hours)</option>
                            </select>
                            <Button
                              variant="outline"
                              onClick={() => {
                                // Auto-schedule from now
                                const start = new Date();
                                const end = new Date(start);
                                end.setHours(start.getHours() + estimatedHours);
                                setSelectedTimeSlot({ start, end });
                              }}
                            >
                              Now
                            </Button>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button
                            onClick={handleAssign}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Schedule & Assign
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">
                        Select a time slot from the calendar
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Click on any available time slot to schedule this task
                      </p>
                    </div>
                  )}
                </Card>

                {/* Suggested Slots */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Quick Schedule
                  </h3>
                  <div className="space-y-3">
                    {suggestedSlots.map((slot, index) => {
                      const isConflict = checkSlotConflict(
                        slot.start,
                        slot.end,
                      );
                      const isToday =
                        slot.start.toDateString() === new Date().toDateString();

                      return (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start h-auto py-3 relative"
                          onClick={() => {
                            if (!isConflict) {
                              setSelectedTimeSlot({
                                start: slot.start,
                                end: slot.end,
                              });
                            }
                          }}
                          disabled={isConflict}
                        >
                          <div className="text-left flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                isToday ? "bg-blue-100" : "bg-gray-100"
                              }`}
                            >
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{slot.date}</p>
                                {isToday && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Today
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {slot.time}
                              </p>
                              {isConflict && (
                                <p className="text-xs text-red-600 mt-1">
                                  Conflicts with existing event
                                </p>
                              )}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </Card>

                {/* Staff Availability */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Staff Availability
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Available
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Current Tasks
                      </span>
                      <span className="font-medium">3 active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">This Week</span>
                      <span className="font-medium">
                        {events.length} events
                      </span>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-2">Legend</p>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-xs">Available</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-xs">Booked</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-xs">Selected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
