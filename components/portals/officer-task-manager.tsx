"use client";

import { useState, useEffect } from "react";
import {
  User,
  Ticket,
  TicketStatus,
  Comment,
  AuditLog,
  Severity,
  UserRole,
} from "@/lib/types";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Zap,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowLeft,
  Image as ImageIcon,
  MapPin,
  Calendar as CalendarIcon,
  User as UserIcon,
  Tag,
  Activity,
  Shield,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  MessageSquare,
  Mail,
  Phone,
  Eye,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Printer,
  Copy,
  ExternalLink,
  Bell,
  Loader2,
  Plus,
  EyeOff,
  CheckSquare,
  TrendingUp,
  BarChart,
  Map,
  Layers,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  Star,
  Target,
  Award,
  Trophy,
  Navigation,
  Group,
  Building2,
  Users as UsersIcon,
  BarChart3,
  Cpu,
  Target as TargetIcon,
  Percent,
  Home,
} from "lucide-react";
// Add this import at the top with your other imports
import CalendarSchedulingModal from "../portals/CalendarSchedulingModal"; // Adjust path as needed
import IncidentDetailModal from "../portals/IncidentDetailModal";
const supabase = getSupabase()
// Extended types for this component
interface StaffStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  onHold: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface FieldStaffUser extends User {
  stats: StaffStats;
  availabilityStatus: "available" | "busy" | "idle";
  performance: number;
  currentLocation?: { lat: number; lng: number } | null;
  skills: string[];
  availability_hours?: any;
  timezone?: string;
  max_concurrent_tasks?: number;
  preferred_categories?: string[];
}

interface CalendarEvent {
  id: string;
  staff_id: string;
  staff_name: string;
  incident_id?: string;
  event_type: "assignment" | "break" | "training" | "meeting" | "unavailable";
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  color: string;
}

interface StaffWithCalendar extends FieldStaffUser {
  events: CalendarEvent[];
  workload: {
    today_hours: number;
    week_hours: number;
    today_events: number;
    week_events: number;
  };
}

interface NearbyTicket extends Ticket {
  distance: number; // in kilometers
}

interface OfficerTaskManagerProps {
  currentUser: User;
  onBack: () => void;
}

// Interface for the incident row from Supabase
interface IncidentRow {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
  reported_by: string;
  assigned_to?: string;
  resolved_by?: string;
  created_at: string;
  resolved_at?: string;
  closed_at?: string;
  estimated_completion?: string;
  images: string[];
  tags: string[];
  duplicate_of?: string;
  is_duplicate: boolean;
  on_hold_reason?: string;
  resolution_notes?: string;
  priority: number;
  scheduled_start?: string;
  scheduled_end?: string;
  estimated_duration_hours?: number;
  is_team_assignment?: boolean;
  parent_ticket_id?: string;
  team_name?: string;
  ml_analysis?: any;
  ml_confidence_score?: number;
  detection_count?: number;
  coverage_ratio?: number;
}

// Interface for the profile row from Supabase
interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  created_at: string;
  availability_hours?: any;
  timezone?: string;
  max_concurrent_tasks?: number;
  preferred_categories?: string[];
}

// New interfaces for multi-day and team assignments
interface Team {
  id: string;
  name: string;
  members: string[]; // Array of staff names
  lead: string;
  department: string;
  capabilities: string[];
}

interface MultiDaySchedule {
  startDate: Date;
  endDate: Date;
  days: {
    date: Date;
    startTime: Date;
    endTime: Date;
    hours: number;
  }[];
  totalHours: number;
}

interface TeamAssignment {
  teamId: string;
  teamName: string;
  memberNames: string[];
  leadStaff: string;
}

export default function OfficerTaskManager({
  currentUser,
  onBack,
}: OfficerTaskManagerProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [fieldStaff, setFieldStaff] = useState<FieldStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTicketForDetail, setSelectedTicketForDetail] =
    useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"tickets" | "staff">("tickets");
  const [nearbyTickets, setNearbyTickets] = useState<NearbyTicket[]>([]);
  const [showGroupSuggestion, setShowGroupSuggestion] = useState(false);
  const [selectedTicketsForGrouping, setSelectedTicketsForGrouping] = useState<
    string[]
  >([]);

  // Calendar states
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedStaffForCalendar, setSelectedStaffForCalendar] =
    useState<StaffWithCalendar | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Detail modal states
  const [activeDetailTab, setActiveDetailTab] = useState<
    "details" | "comments" | "audit" | "media"
  >("details");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ticketComments, setTicketComments] = useState<Comment[]>([]);
  const [ticketAuditLogs, setTicketAuditLogs] = useState<AuditLog[]>([]);
  const [assignedUserDetail, setAssignedUserDetail] = useState<User | null>(
    null,
  );
  const [reportedByUserDetail, setReportedByUserDetail] = useState<User | null>(
    null,
  );

  // Tax removal states
  const [showTaxRemovalWarning, setShowTaxRemovalWarning] = useState(false);
  const [ticketsWithTax, setTicketsWithTax] = useState<string[]>([]);

  // Assignment loading state
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Find nearby tickets for grouping suggestions
  const findNearbyTickets = (
    ticket: Ticket,
    allTickets: Ticket[],
    radiusKm: number = 5,
  ): NearbyTicket[] => {
    if (!ticket.latitude || !ticket.longitude) return [];

    return allTickets
      .filter(
        (t) =>
          t.id !== ticket.id &&
          t.latitude &&
          t.longitude &&
          (t.status === "open" || t.status === "assigned" || t.status === "in_progress") &&
          (!t.assignedTo || t.assignedTo.trim() === "") // Only show unassigned
      )
      .map((t) => ({
        ...t,
        distance: calculateDistance(
          ticket.latitude!,
          ticket.longitude!,
          t.latitude!,
          t.longitude!,
        ),
      }))
      .filter((t) => t.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5); // Show top 5 nearby tickets
  };

  // Group multiple tickets together
  const handleGroupTickets = (ticketIds: string[]) => {
    setSelectedTicketsForGrouping(ticketIds);
    // Find the main ticket (first selected or highest priority)
    const mainTicket = tickets.find(t => t.id === ticketIds[0]);
    if (mainTicket) {
      setSelectedTicket(mainTicket);
      // Update nearby tickets to show all selected tickets
      const groupedNearbyTickets = tickets
        .filter(t => ticketIds.includes(t.id) && t.id !== mainTicket.id)
        .map(t => ({
          ...t,
          distance: calculateDistance(
            mainTicket.latitude!,
            mainTicket.longitude!,
            t.latitude!,
            t.longitude!,
          ),
        })) as NearbyTicket[];
      setNearbyTickets(groupedNearbyTickets);
      setShowGroupSuggestion(true);
    }
  };

  // Toggle ticket selection for grouping
  const toggleTicketForGrouping = (ticketId: string) => {
    setSelectedTicketsForGrouping(prev => {
      if (prev.includes(ticketId)) {
        return prev.filter(id => id !== ticketId);
      } else {
        return [...prev, ticketId];
      }
    });
  };

  // Remove tax-related content from tickets
  const removeTaxFromTickets = async (ticketIds: string[]) => {
    try {
      for (const ticketId of ticketIds) {
        const { data: ticket } = await supabase
          .from("incidents")
          .select("*")
          .eq("id", ticketId)
          .single();

        if (ticket) {
          const updateData: any = {};

          // Remove tax tags
          if (ticket.tags && Array.isArray(ticket.tags)) {
            updateData.tags = ticket.tags.filter(
              (tag) =>
                ![
                  "tax",
                  "tax-related",
                  "financial",
                  "taxation",
                  "revenue",
                ].includes(tag.toLowerCase()),
            );
          }

          // Update category if tax-related
          if (ticket.category?.toLowerCase().includes("tax")) {
            updateData.category = "Administrative";
          }

          // Update description if needed
          if (ticket.description?.toLowerCase().includes("tax")) {
            updateData.description = ticket.description
              .replace(/tax/gi, "fee")
              .replace(/Tax/gi, "Fee")
              .replace(/TAX/gi, "FEE");
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("incidents")
              .update(updateData)
              .eq("id", ticketId);

            // Log the tax removal
            await supabase.from("audit_logs").insert({
              incident_id: ticketId,
              action: "tax_removal",
              actor: currentUser.name,
              actor_role: currentUser.role,
              field_changed: "tax_fields",
              old_value: JSON.stringify({
                tags: ticket.tags,
                category: ticket.category,
                description: ticket.description,
              }),
              new_value: JSON.stringify(updateData),
              timestamp: new Date().toISOString(),
              details: { taxRemoved: true, removedBy: currentUser.name },
            });
          }
        }
      }
      return true;
    } catch (error) {
      console.error("Error removing tax:", error);
      return false;
    }
  };

  // Check if ticket has tax-related content
  const hasTaxContent = (ticket: Ticket): boolean => {
    const taxKeywords = ["tax", "taxation", "revenue", "irs", "vat", "gst"];
    const description = ticket.description?.toLowerCase() || "";
    const category = ticket.category?.toLowerCase() || "";
    const tags = ticket.tags?.map((tag) => tag.toLowerCase()) || [];

    return taxKeywords.some(
      (keyword) =>
        description.includes(keyword) ||
        category.includes(keyword) ||
        tags.some((tag) => tag.includes(keyword)),
    );
  };

  // Format ML analysis for display
  const formatMLAnalysis = (mlAnalysis: any) => {
    if (!mlAnalysis) return null;
    
    try {
      if (typeof mlAnalysis === 'string') {
        return JSON.parse(mlAnalysis);
      }
      return mlAnalysis;
    } catch (error) {
      console.error("Error parsing ML analysis:", error);
      return null;
    }
  };

  // Get ML analysis badge color based on confidence
  const getMLConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (score >= 0.4) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // Get ML detection count badge color
  const getDetectionCountColor = (count: number) => {
    if (count === 0) return "bg-gray-100 text-gray-800 border-gray-200";
    if (count <= 3) return "bg-blue-100 text-blue-800 border-blue-200";
    if (count <= 10) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // Get coverage ratio badge color
  const getCoverageRatioColor = (ratio: number) => {
    if (ratio >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (ratio >= 0.5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (ratio >= 0.2) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // Load data with error handling
  const loadData = async () => {
    console.log("🔄 Starting to load data...");
    setLoading(true);
    setError(null);

    try {
      // Get tickets with location data and ML analysis
      console.log("📋 Fetching tickets...");
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("incidents")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: false });

      if (ticketsError) {
        console.error("❌ Tickets error:", ticketsError);
        throw new Error(`Failed to load tickets: ${ticketsError.message}`);
      }

      console.log("✅ Tickets loaded:", ticketsData?.length || 0);

      if (ticketsData) {
        const formattedTickets: Ticket[] = ticketsData.map(
          (incident: IncidentRow) => ({
            id: incident.id,
            ticketNumber: `TKT-${incident.ticket_number?.toString().padStart(6, "0")}`,
            title: incident.title,
            description: incident.description,
            category: incident.category as any,
            severity: incident.severity as Severity,
            status: incident.status as TicketStatus,
            location: incident.location,
            latitude: incident.latitude,
            longitude: incident.longitude,
            reportedBy: incident.reported_by,
            assignedTo: incident.assigned_to,
            reportedAt: incident.created_at,
            resolvedAt: incident.resolved_at,
            closedAt: incident.closed_at,
            estimatedCompletion: incident.estimated_completion,
            actualCompletion: incident.resolved_at,
            images: incident.images || [],
            tags: incident.tags || [],
            comments: [], // Will load separately
            audit: [], // Will load separately
            duplicateOf: incident.duplicate_of || undefined,
            isDuplicate: incident.is_duplicate || false,
            onHoldReason: incident.on_hold_reason || undefined,
            resolutionNotes: incident.resolution_notes || undefined,
            priority: incident.priority || 0,
            scheduled_start: incident.scheduled_start,
            scheduled_end: incident.scheduled_end,
            estimated_duration_hours: incident.estimated_duration_hours,
            isTeamAssignment: incident.is_team_assignment || false,
            parentTicketId: incident.parent_ticket_id || undefined,
            teamName: incident.team_name || undefined,
            ml_analysis: formatMLAnalysis(incident.ml_analysis),
            ml_confidence_score: incident.ml_confidence_score || 0,
            detection_count: incident.detection_count || 0,
            coverage_ratio: incident.coverage_ratio || 0,
          }),
        );
        setTickets(formattedTickets);
        console.log("✅ Formatted tickets:", formattedTickets.length);

        // Check for tax content
        const taxTicketIds = formattedTickets
          .filter((t) => hasTaxContent(t))
          .map((t) => t.id);

        if (taxTicketIds.length > 0) {
          setTicketsWithTax(taxTicketIds);
          console.log(
            `⚠️ Found ${taxTicketIds.length} tickets with tax content`,
          );
        }
      }

      // Get field staff with extended profile data
      console.log("👥 Fetching field staff...");
      const { data: staffData, error: staffError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "field_staff")
        .order("full_name", { ascending: true });

      if (staffError) {
        console.error("❌ Staff error:", staffError);
        throw new Error(`Failed to load staff: ${staffError.message}`);
      }

      console.log("✅ Staff loaded:", staffData?.length || 0);

      if (staffData && staffData.length > 0) {
        // Get all assigned tickets for stats
        const { data: allTickets } = await supabase
          .from("incidents")
          .select("assigned_to, status, severity")
          .not("assigned_to", "is", null);

        console.log("📊 All assigned tickets:", allTickets?.length || 0);

        const staff: FieldStaffUser[] = staffData.map((profile: ProfileRow) => {
          const assignedTickets =
            allTickets?.filter(
              (t: any) =>
                t.assigned_to && t.assigned_to.trim() === profile.full_name,
            ) || [];

          const stats: StaffStats = {
            total: assignedTickets.length,
            open: assignedTickets.filter((t: any) => t.status === "open")
              .length,
            assigned: assignedTickets.filter(
              (t: any) => t.status === "assigned",
            ).length,
            inProgress: assignedTickets.filter(
              (t: any) => t.status === "in_progress",
            ).length,
            onHold: assignedTickets.filter((t: any) => t.status === "on_hold")
              .length,
            resolved: assignedTickets.filter((t: any) =>
              ["resolved", "closed"].includes(t.status),
            ).length,
            critical: assignedTickets.filter(
              (t: any) => t.severity === "critical",
            ).length,
            high: assignedTickets.filter((t: any) => t.severity === "high")
              .length,
            medium: assignedTickets.filter((t: any) => t.severity === "medium")
              .length,
            low: assignedTickets.filter((t: any) => t.severity === "low")
              .length,
          };

          const availabilityStatus: "available" | "busy" | "idle" =
            stats.inProgress > 0
              ? "busy"
              : stats.total > 0
                ? "available"
                : "idle";

          const performance =
            stats.total > 0
              ? Math.round((stats.resolved / stats.total) * 100)
              : 0;

          return {
            id: profile.id,
            name: profile.full_name || "Unknown Staff",
            email: profile.email || "",
            role: profile.role as UserRole,
            department: profile.department || "Field Operations",
            createdAt: profile.created_at,
            lastLogin: new Date().toISOString(),
            stats,
            availabilityStatus,
            performance,
            currentLocation: null,
            skills: [],
            availability_hours: profile.availability_hours,
            timezone: profile.timezone,
            max_concurrent_tasks: profile.max_concurrent_tasks,
            preferred_categories: profile.preferred_categories,
          };
        });

        setFieldStaff(staff);
        console.log("✅ Formatted staff:", staff.length);
      } else {
        console.log("⚠️ No field staff found");
        setFieldStaff([]);
      }

      console.log("✅ All data loaded successfully!");
    } catch (error: any) {
      console.error("❌ Load data error:", error);
      setError(error.message || "Failed to load data");
    } finally {
      setLoading(false);
      console.log("✅ Loading complete");
    }
  };

  // Load incident details
  const loadIncidentDetails = async (ticket: Ticket) => {
    try {
      // Load comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .eq("incident_id", ticket.id)
        .order("created_at", { ascending: false });

      if (commentsData) {
        const formattedComments: Comment[] = commentsData.map(
          (comment: any) => ({
            id: comment.id,
            author: comment.author,
            authorRole: comment.author_role as UserRole,
            content: comment.content,
            createdAt: comment.created_at,
            edited: false,
          }),
        );
        setTicketComments(formattedComments);
      }

      // Load audit logs
      const { data: auditData } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("incident_id", ticket.id)
        .order("timestamp", { ascending: false });

      if (auditData) {
        const formattedAuditLogs: AuditLog[] = auditData.map((log: any) => ({
          id: log.id,
          action: log.action,
          actor: log.actor,
          actorRole: log.actor_role as UserRole,
          timestamp: log.timestamp,
          details: {},
          fieldChanged: log.field_changed,
          oldValue: log.old_value,
          newValue: log.new_value,
        }));
        setTicketAuditLogs(formattedAuditLogs);
      }

      // Load assigned user
      if (ticket.assignedTo) {
        const { data: assignedData } = await supabase
          .from("profiles")
          .select("*")
          .eq("full_name", ticket.assignedTo)
          .single();

        if (assignedData) {
          setAssignedUserDetail({
            id: assignedData.id,
            name: assignedData.full_name,
            email: assignedData.email,
            role: assignedData.role as UserRole,
            department: assignedData.department,
            createdAt: assignedData.created_at,
            lastLogin: new Date().toISOString(),
          });
        }
      }

      // Load reported by user
      if (ticket.reportedBy) {
        const { data: reportedData } = await supabase
          .from("profiles")
          .select("*")
          .or(`full_name.eq.${ticket.reportedBy},email.eq.${ticket.reportedBy}`)
          .single();

        if (reportedData) {
          setReportedByUserDetail({
            id: reportedData.id,
            name: reportedData.full_name,
            email: reportedData.email,
            role: reportedData.role as UserRole,
            department: reportedData.department,
            createdAt: reportedData.created_at,
            lastLogin: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Error loading incident details:", error);
    }
  };

  // Load staff calendar
  const loadStaffCalendar = async (
    staffId: string,
    startDate?: Date,
    endDate?: Date,
  ) => {
    try {
      const weekStart = startDate || new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = endDate || new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const { data: events, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("staff_id", staffId)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString())
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Calendar load error:", error);
        return [];
      }

      return events || [];
    } catch (error) {
      console.error("Error loading calendar:", error);
      return [];
    }
  };

  // Open calendar modal for assignment
  const handleOpenCalendarForAssignment = async (ticket: Ticket) => {
    setSelectedTicket(ticket);

    // Check if ticket has tax content
    if (hasTaxContent(ticket)) {
      setShowTaxRemovalWarning(true);
      return;
    }

    // Find nearby tickets for grouping suggestions
    const nearby = findNearbyTickets(ticket, tickets);
    setNearbyTickets(nearby);
    setShowGroupSuggestion(nearby.length > 0);

    setAssignModalOpen(true);
  };

  // Open calendar modal for specific staff
  const handleViewCalendar = async (staff: FieldStaffUser, ticket?: Ticket) => {
    const events = await loadStaffCalendar(staff.id);

    const staffWithCalendar: StaffWithCalendar = {
      ...staff,
      events: events,
      workload: {
        today_hours: 0,
        week_hours: 0,
        today_events: events.filter(
          (e) =>
            new Date(e.start_time).toDateString() === new Date().toDateString(),
        ).length,
        week_events: events.length,
      },
    };

    setSelectedStaffForCalendar(staffWithCalendar);
    if (ticket) {
      setSelectedTicket(ticket);
    }
    setCalendarModalOpen(true);
  };

  // Handle assignment from calendar modal with timeout protection
  const handleAssignFromCalendar = async (
    staffName: string,
    startTime: Date,
    endTime: Date,
    groupedTicketIds: string[] = [],
    isMultiDay: boolean = false,
    multiDaySchedule?: MultiDaySchedule,
    teamAssignment?: TeamAssignment,
  ) => {
    if (!selectedTicket) return;

    console.log("📅 Starting assignment process...");
    console.log("Staff:", staffName);
    console.log("Start:", startTime);
    console.log("Grouped tickets:", groupedTicketIds);
    console.log("Selected for grouping:", selectedTicketsForGrouping);

    // Set timeout to prevent infinite hanging
    const timeoutId = setTimeout(() => {
      console.warn("Assignment is taking too long, forcing reset...");
      setAssigning(false);
      setCalendarModalOpen(false);
      setAssignModalOpen(false);
      setSelectedTicket(null);
      setSelectedTicketsForGrouping([]);
      alert("Assignment timed out. Please try again.");
    }, 30000); // 30 second timeout

    setAssigning(true);
    setAssignmentError(null);

    try {
      // Combine selected tickets for grouping with groupedTicketIds
      const allTicketIds = [...new Set([
        selectedTicket.id,
        ...selectedTicketsForGrouping,
        ...groupedTicketIds
      ])];

      console.log("Processing all tickets:", allTicketIds);

      // Process each ticket
      for (const ticketId of allTicketIds) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) continue;

        console.log(`Processing ticket: ${ticket.ticketNumber}`);

        // Calculate duration based on number of tickets
        let estimatedDuration = Math.round(
          (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60),
        );
        
        // If multiple tickets, divide time equally
        if (allTicketIds.length > 1) {
          estimatedDuration = Math.round(estimatedDuration / allTicketIds.length);
        }

        // Update ticket with assignment
        const updateData: any = {
          assigned_to: staffName,
          status: "assigned",
          scheduled_start: startTime.toISOString(),
          scheduled_end: endTime.toISOString(),
          estimated_duration_hours: estimatedDuration,
          updated_at: new Date().toISOString(),
        };

        // Preserve images
        if (ticket.images && ticket.images.length > 0) {
          updateData.images = ticket.images;
        }

        // Preserve ML analysis data
        if (ticket.ml_analysis) {
          updateData.ml_analysis = ticket.ml_analysis;
        }
        if (ticket.ml_confidence_score !== undefined) {
          updateData.ml_confidence_score = ticket.ml_confidence_score;
        }
        if (ticket.detection_count !== undefined) {
          updateData.detection_count = ticket.detection_count;
        }
        if (ticket.coverage_ratio !== undefined) {
          updateData.coverage_ratio = ticket.coverage_ratio;
        }

        // Remove tax-related fields
        if (hasTaxContent(ticket)) {
          console.log(`Removing tax content from ${ticket.ticketNumber}`);
          updateData.tags =
            ticket.tags?.filter(
              (tag) =>
                ![
                  "tax",
                  "tax-related",
                  "financial",
                  "taxation",
                  "revenue",
                ].includes(tag.toLowerCase()),
            ) || [];

          if (ticket.category?.toLowerCase().includes("tax")) {
            updateData.category = "Administrative";
          }

          if (ticket.description?.toLowerCase().includes("tax")) {
            updateData.description = ticket.description
              .replace(/tax/gi, "fee")
              .replace(/Tax/gi, "Fee")
              .replace(/TAX/gi, "FEE");
          }
        }

        const { error: incidentError } = await supabase
          .from("incidents")
          .update(updateData)
          .eq("id", ticketId);

        if (incidentError) {
          console.error(`Error updating ticket ${ticket.ticketNumber}:`, incidentError);
          throw incidentError;
        }

        // Create calendar event
        const calendarEvent = {
          staff_id: fieldStaff.find((s) => s.name === staffName)?.id,
          staff_name: staffName,
          incident_id: ticketId,
          event_type: "assignment",
          title: `Task: ${ticket.title}`,
          description: `Assigned by ${currentUser.name}`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: ticket.location,
          status: "scheduled",
          color: "#3b82f6",
          created_by: currentUser.name,
        };

        const { error: eventError } = await supabase
          .from("calendar_events")
          .insert(calendarEvent);

        if (eventError) {
          console.error(`Error creating calendar event for ${ticket.ticketNumber}:`, eventError);
          throw eventError;
        }

        // Log audit
        await supabase.from("audit_logs").insert({
          incident_id: ticketId,
          action: isMultiDay ? "multi_day_assignment" : "assignment",
          actor: currentUser.name,
          actor_role: currentUser.role,
          field_changed: "assigned_to",
          old_value: ticket.assignedTo || "",
          new_value: staffName,
          timestamp: new Date().toISOString(),
          details: {
            isMultiDay,
            groupedTickets: allTicketIds.length - 1,
            taxRemoved: hasTaxContent(ticket),
          },
        });
      }

      console.log("✅ Assignment completed successfully!");

      // Clean up and close modals
      clearTimeout(timeoutId);
      
      setCalendarModalOpen(false);
      setAssignModalOpen(false);
      setSelectedTicket(null);
      setSelectedStaffForCalendar(null);
      setSelectedTicketsForGrouping([]);
      setNearbyTickets([]);
      setAssigning(false);

      const successMessage = allTicketIds.length > 1
        ? `${allTicketIds.length} tickets assigned to ${staffName}!`
        : `Task assigned to ${staffName}${isMultiDay ? " (Multi-day schedule)" : ""}!`;

      alert(successMessage);
      loadData();
    } catch (error: any) {
      console.error("❌ Assignment failed:", error);
      clearTimeout(timeoutId);
      setAssignmentError(error.message || "Failed to assign ticket");
      setAssigning(false);
      alert(`Assignment failed: ${error.message}`);
    }
  };

  // Quick assign
  const handleQuickAssign = async (staffName: string) => {
    if (!selectedTicket) return;

    setAssigning(true);
    try {
      const updateData: any = {
        assigned_to: staffName,
        status: "assigned",
        updated_at: new Date().toISOString(),
      };

      // Preserve images
      if (selectedTicket.images && selectedTicket.images.length > 0) {
        updateData.images = selectedTicket.images;
      }

      // Preserve ML analysis data
      if (selectedTicket.ml_analysis) {
        updateData.ml_analysis = selectedTicket.ml_analysis;
      }
      if (selectedTicket.ml_confidence_score !== undefined) {
        updateData.ml_confidence_score = selectedTicket.ml_confidence_score;
      }
      if (selectedTicket.detection_count !== undefined) {
        updateData.detection_count = selectedTicket.detection_count;
      }
      if (selectedTicket.coverage_ratio !== undefined) {
        updateData.coverage_ratio = selectedTicket.coverage_ratio;
      }

      // Remove tax-related fields
      if (hasTaxContent(selectedTicket)) {
        updateData.tags =
          selectedTicket.tags?.filter(
            (tag) =>
              ![
                "tax",
                "tax-related",
                "financial",
                "taxation",
                "revenue",
              ].includes(tag.toLowerCase()),
          ) || [];

        if (selectedTicket.category?.toLowerCase().includes("tax")) {
          updateData.category = "Administrative";
        }

        if (selectedTicket.description?.toLowerCase().includes("tax")) {
          updateData.description = selectedTicket.description
            .replace(/tax/gi, "fee")
            .replace(/Tax/gi, "Fee")
            .replace(/TAX/gi, "FEE");
        }
      }

      const { error } = await supabase
        .from("incidents")
        .update(updateData)
        .eq("id", selectedTicket.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        incident_id: selectedTicket.id,
        action: "assignment",
        actor: currentUser.name,
        actor_role: currentUser.role,
        field_changed: "assigned_to",
        old_value: selectedTicket.assignedTo || "",
        new_value: staffName,
        timestamp: new Date().toISOString(),
        details: {
          taxRemoved: hasTaxContent(selectedTicket),
        },
      });

      setAssignModalOpen(false);
      setSelectedTicket(null);
      setSelectedTicketsForGrouping([]);
      setAssigning(false);
      alert(`Task assigned to ${staffName}`);
      loadData();
    } catch (error) {
      console.error("Assignment failed:", error);
      setAssigning(false);
      alert("Failed to assign ticket");
    }
  };

  // Handle view ticket details
  const handleViewTicketDetails = async (ticket: Ticket) => {
    setSelectedTicketForDetail(ticket);
    setActiveDetailTab("details");
    await loadIncidentDetails(ticket);
    setDetailModalOpen(true);
  };

  // Handle tax removal confirmation
  const handleTaxRemovalConfirm = async () => {
    if (!selectedTicket) return;

    setAssigning(true);
    try {
      // Remove tax from selected ticket
      const success = await removeTaxFromTickets([selectedTicket.id]);

      if (success) {
        setShowTaxRemovalWarning(false);
        // Now open the assignment modal
        const nearby = findNearbyTickets(selectedTicket, tickets);
        setNearbyTickets(nearby);
        setShowGroupSuggestion(nearby.length > 0);
        setAssignModalOpen(true);
      } else {
        alert("Failed to remove tax content. Please try again.");
      }
    } catch (error) {
      console.error("Tax removal error:", error);
      alert("Error removing tax content");
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    console.log("🚀 Component mounted, loading data...");
    loadData();

    const channel = supabase
      .channel("task-manager")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => {
          console.log("🔔 Incidents changed, reloading...");
          loadData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          console.log("🔔 Profiles changed, reloading...");
          loadData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        () => {
          console.log("🔔 Calendar events changed, reloading...");
          loadData();
        },
      )
      .subscribe();

    return () => {
      console.log("🛑 Component unmounting, cleaning up...");
      supabase.removeChannel(channel);
      setAssigning(false);
    };
  }, []);

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (severityFilter !== "all" && ticket.severity !== severityFilter)
      return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        ticket.title.toLowerCase().includes(term) ||
        ticket.ticketNumber.toLowerCase().includes(term) ||
        (ticket.assignedTo && ticket.assignedTo.toLowerCase().includes(term)) ||
        ticket.location.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const unassignedTickets = filteredTickets.filter(
    (t) => !t.assignedTo || t.assignedTo.trim() === "",
  );
  const assignedTickets = filteredTickets.filter(
    (t) => t.assignedTo && t.assignedTo.trim() !== "",
  );

  // Helper functions
  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "assigned":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "on_hold":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            Loading task manager...
          </p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error Loading Data
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
          </div>
          <div className="space-y-3">
            <Button onClick={loadData} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={onBack} variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // No data state
  if (tickets.length === 0 && fieldStaff.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2 hover:bg-white hover:shadow-sm border border-gray-200 mb-6"
          >
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <Card className="max-w-2xl mx-auto p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              No Data Available
            </h2>
            <p className="text-gray-600 mb-8">
              There are no tickets or field staff members in the system yet.
            </p>
            <div className="space-y-3">
              <Button onClick={loadData} className="w-full max-w-xs">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <p className="text-sm text-gray-500">
                Check the browser console for details
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={onBack}
              className="gap-2 hover:bg-white hover:shadow-sm border border-gray-200"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>

            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Task Management
                  </h1>
                </div>
                <p className="text-gray-600">
                  Assign and schedule tasks for field staff
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {fieldStaff.length}
                  </div>
                  <div className="text-sm text-gray-600">Field Staff</div>
                </div>
                <div className="h-12 w-px bg-gray-300"></div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {unassignedTickets.length}
                  </div>
                  <div className="text-sm text-gray-600">Need Assignment</div>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={activeView === "tickets" ? "default" : "outline"}
                onClick={() => setActiveView("tickets")}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Tickets ({filteredTickets.length})
              </Button>
              <Button
                variant={activeView === "staff" ? "default" : "outline"}
                onClick={() => setActiveView("staff")}
                className="gap-2"
              >
                <UsersIcon className="h-4 w-4" />
                Field Staff ({fieldStaff.length})
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border border-gray-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {filteredTickets.length}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-red-200 bg-red-50 hover:border-red-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Critical</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {
                    filteredTickets.filter((t) => t.severity === "critical")
                      .length
                  }
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-blue-200 bg-blue-50 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Unassigned</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {unassignedTickets.length}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-green-200 bg-green-50 hover:border-green-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Assigned</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {assignedTickets.length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content - Tickets View */}
        {activeView === "tickets" && (
          <>
            {/* Filters */}
            <Card className="p-6 mb-8 border border-gray-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Severity</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setSeverityFilter("all");
                    setSelectedTicketsForGrouping([]);
                  }}
                  className="h-11"
                  variant="outline"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </Card>

            {/* Tax removal warning */}
            {ticketsWithTax.length > 0 && (
              <Card className="mb-6 border border-amber-200 bg-amber-50">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {ticketsWithTax.length} ticket
                        {ticketsWithTax.length > 1 ? "s" : ""} contain
                        tax-related content
                      </p>
                      <p className="text-sm text-amber-600">
                        Tax content will be automatically removed during
                        assignment
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      if (
                        confirm(
                          `Remove tax content from ${ticketsWithTax.length} tickets?`,
                        )
                      ) {
                        removeTaxFromTickets(ticketsWithTax);
                      }
                    }}
                  >
                    Remove All Tax
                  </Button>
                </div>
              </Card>
            )}

            {/* Grouping controls */}
            {selectedTicketsForGrouping.length > 0 && (
              <Card className="mb-6 border border-blue-200 bg-blue-50">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Group className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">
                        {selectedTicketsForGrouping.length} ticket
                        {selectedTicketsForGrouping.length > 1 ? "s" : ""} selected for grouping
                      </p>
                      <p className="text-sm text-blue-600">
                        These tickets will be assigned together
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => setSelectedTicketsForGrouping([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        if (selectedTicketsForGrouping.length > 0) {
                          const mainTicket = tickets.find(t => t.id === selectedTicketsForGrouping[0]);
                          if (mainTicket) {
                            handleOpenCalendarForAssignment(mainTicket);
                          }
                        }
                      }}
                      disabled={assigning}
                    >
                      {assigning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Assign ${selectedTicketsForGrouping.length} Tickets`
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Unassigned Tickets */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  Unassigned Tickets
                  <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                    {unassignedTickets.length}
                  </span>
                </h2>
                {selectedTicketsForGrouping.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Select multiple tickets to assign together
                  </div>
                )}
              </div>

              {unassignedTickets.length === 0 ? (
                <Card className="p-8 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    All Clear!
                  </h3>
                  <p className="text-gray-600">
                    All tickets have been assigned.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {unassignedTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className={`p-5 border ${selectedTicketsForGrouping.includes(ticket.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group ${
                        hasTaxContent(ticket)
                          ? "border-l-4 border-l-amber-400"
                          : ""
                      }`}
                      onClick={() => {
                        if (selectedTicketsForGrouping.length > 0) {
                          toggleTicketForGrouping(ticket.id);
                        } else {
                          handleOpenCalendarForAssignment(ticket);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {hasTaxContent(ticket) && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-2 py-1 rounded text-xs font-medium">
                                Tax Content
                              </Badge>
                            )}
                            {selectedTicketsForGrouping.includes(ticket.id) && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-2 py-1 rounded text-xs font-medium">
                                Selected for Grouping
                              </Badge>
                            )}
                            <Badge
                              className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(ticket.severity)}`}
                            >
                              {ticket.severity.toUpperCase()}
                            </Badge>
                            <Badge
                              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}
                            >
                              {ticket.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                            {ticket.title}
                          </h3>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTicketDetails(ticket);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">
                            {ticket.location}
                          </span>
                          {ticket.latitude && ticket.longitude && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({ticket.latitude.toFixed(4)},{" "}
                              {ticket.longitude.toFixed(4)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm">
                          <Tag className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-700">
                            {ticket.category}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {ticket.description}
                      </p>

                      {/* ML Analysis Section */}
                      {(ticket.ml_analysis || ticket.ml_confidence_score || ticket.detection_count || ticket.coverage_ratio) && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Cpu className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-900">ML Analysis</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {ticket.ml_confidence_score !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Confidence</span>
                                <Badge className={`text-xs ${getMLConfidenceColor(ticket.ml_confidence_score)}`}>
                                  {(ticket.ml_confidence_score * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            )}
                            {ticket.detection_count !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Detections</span>
                                <Badge className={`text-xs ${getDetectionCountColor(ticket.detection_count)}`}>
                                  {ticket.detection_count}
                                </Badge>
                              </div>
                            )}
                            {ticket.coverage_ratio !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Coverage</span>
                                <Badge className={`text-xs ${getCoverageRatioColor(ticket.coverage_ratio)}`}>
                                  {(ticket.coverage_ratio * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            )}
                            {ticket.ml_analysis && (
                              <div className="col-span-2">
                                <p className="text-xs text-gray-600 truncate">
                                  {typeof ticket.ml_analysis === 'object' 
                                    ? JSON.stringify(ticket.ml_analysis).slice(0, 100) + '...'
                                    : ticket.ml_analysis.slice(0, 100) + '...'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Images preview */}
                      {ticket.images && ticket.images.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-xs font-medium text-gray-700">
                              {ticket.images.length} image{ticket.images.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {ticket.images.slice(0, 3).map((img, index) => (
                              <div key={index} className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                <img 
                                  src={img} 
                                  alt={`Ticket image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://via.placeholder.com/64x64/cccccc/666666?text=Image+${index + 1}`;
                                  }}
                                />
                                {index === 2 && ticket.images.length > 3 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white text-xs">+{ticket.images.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Reported:{" "}
                          {new Date(ticket.reportedAt).toLocaleDateString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ticket.ticketNumber}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Tickets */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  Assigned Tickets
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {assignedTickets.length}
                  </span>
                </h2>
              </div>

              {assignedTickets.length === 0 ? (
                <Card className="p-8 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Active Assignments
                  </h3>
                  <p className="text-gray-600">
                    Assign tickets to get started.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {assignedTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="p-5 border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => handleViewTicketDetails(ticket)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {ticket.isTeamAssignment && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-2 py-1 rounded text-xs font-medium">
                                Team Task
                              </Badge>
                            )}
                            <Badge
                              className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(ticket.severity)}`}
                            >
                              {ticket.severity.toUpperCase()}
                            </Badge>
                            <Badge
                              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}
                            >
                              {ticket.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                            {ticket.title}
                          </h3>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCalendarForAssignment(ticket);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900 font-medium">
                            {ticket.assignedTo}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">
                            {ticket.location}
                          </span>
                          {ticket.latitude && ticket.longitude && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({ticket.latitude.toFixed(4)},{" "}
                              {ticket.longitude.toFixed(4)})
                            </span>
                          )}
                        </div>
                        {ticket.scheduled_start && (
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-900">
                              Scheduled:{" "}
                              {new Date(
                                ticket.scheduled_start,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {ticket.description}
                      </p>

                      {/* ML Analysis Section for Assigned Tickets */}
                      {(ticket.ml_analysis || ticket.ml_confidence_score || ticket.detection_count || ticket.coverage_ratio) && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Cpu className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-900">ML Analysis</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {ticket.ml_confidence_score !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Confidence</span>
                                <Badge className={`text-xs ${getMLConfidenceColor(ticket.ml_confidence_score)}`}>
                                  {(ticket.ml_confidence_score * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            )}
                            {ticket.detection_count !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Detections</span>
                                <Badge className={`text-xs ${getDetectionCountColor(ticket.detection_count)}`}>
                                  {ticket.detection_count}
                                </Badge>
                              </div>
                            )}
                            {ticket.coverage_ratio !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Coverage</span>
                                <Badge className={`text-xs ${getCoverageRatioColor(ticket.coverage_ratio)}`}>
                                  {(ticket.coverage_ratio * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            )}
                            {ticket.ml_analysis && (
                              <div className="col-span-2">
                                <p className="text-xs text-gray-600 truncate">
                                  {typeof ticket.ml_analysis === 'object' 
                                    ? JSON.stringify(ticket.ml_analysis).slice(0, 100) + '...'
                                    : ticket.ml_analysis.slice(0, 100) + '...'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Images preview for Assigned Tickets */}
                      {ticket.images && ticket.images.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-xs font-medium text-gray-700">
                              {ticket.images.length} image{ticket.images.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {ticket.images.slice(0, 3).map((img, index) => (
                              <div key={index} className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                <img 
                                  src={img} 
                                  alt={`Ticket image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://via.placeholder.com/64x64/cccccc/666666?text=Image+${index + 1}`;
                                  }}
                                />
                                {index === 2 && ticket.images.length > 3 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white text-xs">+{ticket.images.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Due:{" "}
                          {ticket.estimatedCompletion
                            ? new Date(
                                ticket.estimatedCompletion,
                              ).toLocaleDateString()
                            : "No deadline"}
                        </span>
                        <div className="flex items-center gap-2">
                          {ticket.parentTicketId && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-50"
                            >
                              Sub-task
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {ticket.ticketNumber}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Staff View */}
        {activeView === "staff" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {fieldStaff.length === 0 ? (
              <div className="col-span-2">
                <Card className="p-12 text-center">
                  <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No Field Staff
                  </h3>
                  <p className="text-gray-600">
                    No field staff members found in the system.
                  </p>
                </Card>
              </div>
            ) : (
              fieldStaff.map((staff) => (
                <Card
                  key={staff.id}
                  className="p-6 border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl">
                          {staff.name.charAt(0)}
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                            staff.availabilityStatus === "available"
                              ? "bg-green-500"
                              : staff.availabilityStatus === "busy"
                                ? "bg-yellow-500"
                                : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {staff.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {staff.department}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              staff.availabilityStatus === "available"
                                ? "bg-green-500"
                                : staff.availabilityStatus === "busy"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                            }`}
                          />
                          <span className="text-xs capitalize">
                            {staff.availabilityStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-blue-600 to-blue-700">
                      {staff.performance}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">
                        {staff.stats.total}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">
                        {staff.stats.inProgress}
                      </div>
                      <div className="text-xs text-gray-600">Active</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        {staff.stats.resolved}
                      </div>
                      <div className="text-xs text-gray-600">Done</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">
                        {staff.stats.critical}
                      </div>
                      <div className="text-xs text-gray-600">Critical</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const unassignedTicket = unassignedTickets[0];
                        if (unassignedTicket) {
                          setSelectedTicket(unassignedTicket);
                          setSelectedStaffForCalendar({
                            ...staff,
                            events: [],
                            workload: {
                              today_hours: 0,
                              week_hours: 0,
                              today_events: 0,
                              week_events: 0,
                            },
                          } as StaffWithCalendar);
                          setCalendarModalOpen(true);
                        } else {
                          alert("No unassigned tickets available");
                        }
                      }}
                      disabled={unassignedTickets.length === 0 || assigning}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Schedule & Assign
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewCalendar(staff)}
                      disabled={assigning}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tax Removal Warning Modal */}
        {showTaxRemovalWarning && selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Tax Content Detected
                    </h3>
                    <p className="text-sm text-gray-600">
                      This ticket contains tax-related content
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-amber-800">
                    <strong>Title:</strong> {selectedTicket.title}
                  </p>
                  <p className="text-sm text-amber-800 mt-2">
                    <strong>Category:</strong> {selectedTicket.category}
                  </p>
                  {selectedTicket.tags?.some((tag) =>
                    tag.toLowerCase().includes("tax"),
                  ) && (
                    <p className="text-sm text-amber-800 mt-2">
                      <strong>Tax Tags:</strong>{" "}
                      {selectedTicket.tags
                        ?.filter((tag) => tag.toLowerCase().includes("tax"))
                        .join(", ")}
                    </p>
                  )}
                </div>

                <p className="text-gray-700 mb-6">
                  Tax-related content (tags, categories, descriptions) will be
                  automatically removed during assignment. This action cannot be
                  undone.
                </p>

                <div className="flex gap-3">
                  <Button
                    onClick={handleTaxRemovalConfirm}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    disabled={assigning}
                  >
                    {assigning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Remove Tax & Continue"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowTaxRemovalWarning(false)}
                    className="flex-1"
                    disabled={assigning}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Assignment Modal with Staff Selection */}
        {assignModalOpen && selectedTicket && !showTaxRemovalWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Assign Ticket{selectedTicketsForGrouping.length > 0 ? ` (${selectedTicketsForGrouping.length + 1} tickets)` : ''}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Select field staff member and schedule time
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAssignModalOpen(false);
                      setSelectedTicket(null);
                      setNearbyTickets([]);
                      setSelectedTicketsForGrouping([]);
                    }}
                    className="h-8 w-8 p-0"
                    disabled={assigning}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {selectedTicket.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-sm text-gray-600">
                          {selectedTicket.ticketNumber}
                        </span>
                        <Badge
                          className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(selectedTicket.severity)}`}
                        >
                          {selectedTicket.severity}
                        </Badge>
                        <Badge
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedTicket.status)}`}
                        >
                          {selectedTicket.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {selectedTicket.location}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Tickets for Grouping */}
                {selectedTicketsForGrouping.length > 0 && (
                  <Card className="mb-6 border border-blue-200">
                    <div className="p-4 bg-blue-50 rounded-t-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Group className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">
                          Selected for Grouping
                        </h4>
                        <Badge className="ml-auto bg-blue-600">
                          {selectedTicketsForGrouping.length + 1} tickets
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        The following tickets will be assigned together:
                      </p>
                      <div className="space-y-2">
                        {/* Main ticket */}
                        <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-300">
                          <div>
                            <p className="font-medium text-sm">
                              {selectedTicket.title} (Main)
                            </p>
                            <p className="text-xs text-gray-600">
                              {selectedTicket.ticketNumber}
                            </p>
                          </div>
                          <Badge
                            className={`text-xs ${getSeverityColor(selectedTicket.severity)}`}
                          >
                            {selectedTicket.severity}
                          </Badge>
                        </div>
                        
                        {/* Selected tickets */}
                        {selectedTicketsForGrouping.map((ticketId) => {
                          const ticket = tickets.find(t => t.id === ticketId);
                          if (!ticket) return null;
                          
                          return (
                            <div
                              key={ticketId}
                              className="flex items-center justify-between p-2 bg-white rounded border"
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {ticket.title}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {ticket.ticketNumber}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleTicketForGrouping(ticketId)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                                <Badge
                                  className={`text-xs ${getSeverityColor(ticket.severity)}`}
                                >
                                  {ticket.severity}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Nearby Tickets Suggestion */}
                {showGroupSuggestion && nearbyTickets.length > 0 && (
                  <Card className="mb-6 border border-blue-200">
                    <div className="p-4 bg-blue-50 rounded-t-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Group className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">
                          Grouping Suggestion
                        </h4>
                        <Badge className="ml-auto">Nearby Tickets</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Consider grouping these nearby tickets together to
                        optimize travel:
                      </p>
                      <div className="space-y-2">
                        {nearbyTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className={`flex items-center justify-between p-2 rounded border ${selectedTicketsForGrouping.includes(ticket.id) ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200'}`}
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {ticket.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {ticket.ticketNumber}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleTicketForGrouping(ticket.id)}
                                className="h-6 w-6 p-0"
                              >
                                {selectedTicketsForGrouping.includes(ticket.id) ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Plus className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                              <Badge variant="outline" className="text-xs">
                                {ticket.distance.toFixed(1)} km
                              </Badge>
                              <Badge
                                className={`text-xs ${getSeverityColor(ticket.severity)}`}
                              >
                                {ticket.severity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedTicketsForGrouping.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              onClick={() => {
                                // Include all nearby tickets in selection
                                const allNearbyIds = nearbyTickets.map(t => t.id);
                                setSelectedTicketsForGrouping(prev => 
                                  [...new Set([...prev, ...allNearbyIds])]
                                );
                              }}
                              disabled={assigning}
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Select All Nearby
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setSelectedTicketsForGrouping([])}
                              disabled={assigning}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Clear All
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {fieldStaff.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No field staff available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Individual Staff Assignment */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Assign to Staff Member
                      </h4>
                      <div className="space-y-3">
                        {fieldStaff.map((staff) => (
                          <div
                            key={staff.id}
                            className="p-4 border rounded-lg hover:border-blue-300 hover:bg-gray-50 transition-all cursor-pointer"
                            onClick={() => {
                              if (assigning) return;
                              setSelectedStaffForCalendar({
                                ...staff,
                                events: [],
                                workload: {
                                  today_hours: 0,
                                  week_hours: 0,
                                  today_events: 0,
                                  week_events: 0,
                                },
                              } as StaffWithCalendar);
                              setAssignModalOpen(false);
                              setCalendarModalOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div
                                    className={`h-3 w-3 rounded-full ${
                                      staff.availabilityStatus === "available"
                                        ? "bg-green-500"
                                        : staff.availabilityStatus === "busy"
                                          ? "bg-yellow-500"
                                          : "bg-gray-400"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {staff.name}
                                  </p>
                                  <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <span>{staff.stats.total} tasks</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      {staff.performance}% performance
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      View Calendar
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Calendar Modal */}
        {calendarModalOpen && selectedStaffForCalendar && selectedTicket && (
          <CalendarSchedulingModal
            staff={selectedStaffForCalendar}
            ticket={selectedTicket}
            onClose={() => {
              setCalendarModalOpen(false);
              setSelectedStaffForCalendar(null);
              setAssigning(false);
              setSelectedTicketsForGrouping([]);
            }}
            onAssign={handleAssignFromCalendar}
            currentUser={currentUser}
            nearbyTickets={nearbyTickets}
            isAssigning={assigning}
            assignmentError={assignmentError}
            selectedTicketsForGrouping={selectedTicketsForGrouping}
          />
        )}

        {/* Ticket Detail Modal */}
        {detailModalOpen && selectedTicketForDetail && (
          <IncidentDetailModal
            ticket={selectedTicketForDetail}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedTicketForDetail(null);
              setTicketComments([]);
              setTicketAuditLogs([]);
              setAssignedUserDetail(null);
              setReportedByUserDetail(null);
            }}
            currentUser={currentUser}
            assignedUser={assignedUserDetail}
            reportedByUser={reportedByUserDetail}
            comments={ticketComments}
            auditLogs={ticketAuditLogs}
          />
        )}
      </div>
    </div>
  );
}