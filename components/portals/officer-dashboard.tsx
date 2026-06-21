"use client";

import { useState, useEffect } from "react";
import { User, Ticket, TicketStatus } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";
import { fetchTickets } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TicketCard from "@/components/tickets/ticket-card";
import OfficerTaskManager from "@/components/portals/officer-task-manager";
import AuditTimeline from "@/components/tickets/audit-timeline";
import {
  Zap,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  BarChart,
  LogOut,
  Users,
} from "lucide-react";
const supabase = getSupabase()
interface OfficerDashboardProps {
  currentUser: User;
  onNavigate: (view: string) => void;
  currentView: string;
  onLogout: () => void;
}

export default function OfficerDashboard({
  currentUser,
  onNavigate,
  currentView,
  onLogout,
}: OfficerDashboardProps) {
  // 1. STATE: Live Data
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldStaff, setFieldStaff] = useState<User[]>([]);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // 2. FETCH DATA FROM SUPABASE
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all tickets
      const ticketsData = await fetchTickets();
      setTickets(ticketsData);

      // Fetch field staff from profiles table
      const { data: staffData, error: staffError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "field_staff")
        .order("full_name", { ascending: true });

      if (staffError) {
        console.error("Error fetching field staff:", staffError);
      } else {
        // Convert profiles to User objects
        const staffUsers = staffData.map((profile) => ({
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          role: profile.role as any,
          department: "Field Operations",
          createdAt: profile.created_at,
          lastLogin: new Date().toISOString(),
        }));
        setFieldStaff(staffUsers);
      }

      // Keep selected ticket updated if it exists
      if (selectedTicket) {
        const updated = ticketsData.find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime subscriptions
    const incidentsChannel = supabase
      .channel("officer-incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => {
          console.log("🔄 Officer: Incident changed, refreshing...");
          loadData();
        },
      )
      .subscribe();

    const commentsChannel = supabase
      .channel("officer-comments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => {
          console.log("🔄 Officer: Comment added, refreshing...");
          loadData();
        },
      )
      .subscribe();

    const auditChannel = supabase
      .channel("officer-audit")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_logs" },
        () => {
          console.log("🔄 Officer: Audit log added, refreshing...");
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(auditChannel);
    };
  }, []);

  // 3. FILTER LOGIC
  const filteredTickets = tickets.filter((ticket) => {
    // Status filter
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;

    // Severity filter
    if (severityFilter !== "all" && ticket.severity !== severityFilter)
      return false;

    // Search filter
    if (
      searchTerm &&
      !ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !ticket.location.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    assigned: tickets.filter((t) => t.status === "assigned").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter(
      (t) => t.status === "resolved" || t.status === "closed",
    ).length,
    critical: tickets.filter((t) => t.severity === "critical").length,
    high: tickets.filter((t) => t.severity === "high").length,
    medium: tickets.filter((t) => t.severity === "medium").length,
    low: tickets.filter((t) => t.severity === "low").length,
  };

  // 4. ASSIGNMENT ACTION
  const handleAssignTicket = async (ticketId: string, staffName: string) => {
    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          assigned_to: staffName,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Add audit log
      await supabase.from("audit_logs").insert({
        incident_id: ticketId,
        action: "assignment",
        actor: currentUser.name,
        actor_role: currentUser.role,
        field_changed: "assigned_to",
        old_value: "",
        new_value: staffName,
      });

      alert(`✅ Ticket assigned to ${staffName}`);
    } catch (err) {
      console.error("❌ Assignment failed:", err);
      alert("Failed to assign ticket");
    }
  };

  // Update ticket status
  const handleUpdateStatus = async (
    ticketId: string,
    newStatus: TicketStatus,
  ) => {
    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Add audit log
      await supabase.from("audit_logs").insert({
        incident_id: ticketId,
        action: "status_change",
        actor: currentUser.name,
        actor_role: currentUser.role,
        field_changed: "status",
        old_value: tickets.find((t) => t.id === ticketId)?.status,
        new_value: newStatus,
      });

      alert(`✅ Status updated to ${newStatus.replace("_", " ")}`);
      loadData();
    } catch (err) {
      console.error("❌ Status update failed:", err);
      alert("Failed to update status");
    }
  };

  // Team Management View
  if (currentView === "team") {
    return <OfficerTaskManager currentUser={currentUser} />;
  }

  // Home View
  if (currentView === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                Officer Dashboard
                {loading && (
                  <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                )}
              </h1>
              <p className="text-gray-600 mt-2">Welcome, {currentUser.name}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={onLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Incidents</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <BarChart className="w-12 h-12 text-blue-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.critical}
                  </p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.inProgress}
                  </p>
                </div>
                <RefreshCw className="w-12 h-12 text-amber-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Field Staff</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {fieldStaff.length}
                  </p>
                </div>
                <Users className="w-12 h-12 text-emerald-600" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Button
              onClick={() => onNavigate("incidents")}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-16"
            >
              <Zap className="h-5 w-5 mr-2" />
              All Incidents
            </Button>

            <Button
              onClick={() => {
                setSeverityFilter("critical");
                onNavigate("incidents");
              }}
              variant="outline"
              className="h-16 border-red-200 text-red-700 hover:bg-red-50"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Incidents
            </Button>

            <Button
              onClick={() => onNavigate("team")}
              variant="outline"
              className="h-16 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Users className="h-5 w-5 mr-2" />
              Team Management
            </Button>

            <Button
              onClick={() => onNavigate("incidents")}
              variant="outline"
              className="h-16 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filter View
            </Button>
          </div>

          {/* Recent Critical Incidents */}
          <Card className="mb-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Recent Critical Incidents
                </h3>
                <Badge variant="destructive">{stats.critical} Critical</Badge>
              </div>

              {stats.critical === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No critical incidents reported
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets
                    .filter((t) => t.severity === "critical")
                    .slice(0, 3)
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="cursor-pointer hover:bg-gray-50 p-4 rounded-lg border border-gray-200 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {ticket.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {ticket.location}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">Critical</Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {ticket.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </Card>

          {/* Selected Ticket Modal */}
          {selectedTicket && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <IncidentDetailView
                ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                fieldStaff={fieldStaff}
                onAssign={handleAssignTicket}
                onUpdateStatus={handleUpdateStatus}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // All Incidents View
  if (currentView === "incidents") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <Button
                variant="ghost"
                onClick={() => onNavigate("home")}
                className="mb-2 gap-2"
              >
                ← Back to Dashboard
              </Button>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                All Incidents
              </h2>
              <p className="text-gray-600">
                {filteredTickets.length} incidents found
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={loadData} variant="outline" disabled={loading}>
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button onClick={onLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setSeverityFilter("all");
                  setSearchTerm("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </Card>

          {/* Incident List */}
          {filteredTickets.length === 0 ? (
            <Card className="p-12 text-center">
              <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                No Incidents Found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your filters or search terms
              </p>
              <Button
                onClick={() => {
                  setStatusFilter("all");
                  setSeverityFilter("all");
                  setSearchTerm("");
                }}
                variant="outline"
              >
                Clear All Filters
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTickets
                .sort((a, b) => {
                  // Sort by severity first, then by creation date
                  const severityOrder = {
                    critical: 0,
                    high: 1,
                    medium: 2,
                    low: 3,
                  };
                  const severityDiff =
                    severityOrder[a.severity as keyof typeof severityOrder] -
                    severityOrder[b.severity as keyof typeof severityOrder];

                  if (severityDiff === 0) {
                    return (
                      new Date(b.reportedAt).getTime() -
                      new Date(a.reportedAt).getTime()
                    );
                  }
                  return severityDiff;
                })
                .map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="cursor-pointer"
                  >
                    <TicketCard
                      ticket={ticket}
                      clickable
                      onClick={() => setSelectedTicket(ticket)}
                    />
                  </div>
                ))}
            </div>
          )}

          {/* Selected Ticket Modal */}
          {selectedTicket && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <IncidentDetailView
                ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                fieldStaff={fieldStaff}
                onAssign={handleAssignTicket}
                onUpdateStatus={handleUpdateStatus}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function IncidentDetailView({
  ticket,
  onClose,
  fieldStaff,
  onAssign,
  onUpdateStatus,
}: {
  ticket: Ticket;
  onClose: () => void;
  fieldStaff: User[];
  onAssign: (ticketId: string, staffName: string) => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => void;
}) {
  const [selectedStaff, setSelectedStaff] = useState(ticket.assignedTo || "");
  const [newStatus, setNewStatus] = useState<TicketStatus>(ticket.status);

  return (
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Incident Details</h2>
        <Button variant="ghost" onClick={onClose}>
          × Close
        </Button>
      </div>

      <div className="p-6 space-y-6">
        <TicketCard ticket={ticket} expanded />

        {/* Assignment Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">
            Assignment & Status
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => {
                  setNewStatus(e.target.value as TicketStatus);
                  onUpdateStatus(ticket.id, e.target.value as TicketStatus);
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Assign to Field Staff */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Field Staff
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select field staff...</option>
                  {fieldStaff.map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => onAssign(ticket.id, selectedStaff)}
                  disabled={!selectedStaff}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Assign
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Timeline */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">
            Activity Timeline
          </h3>
          <AuditTimeline auditLogs={ticket.audit || []} />
        </div>
      </div>
    </div>
  );
}

// Badge Component (if not already imported)
function Badge({
  variant = "default",
  children,
}: {
  variant?: "default" | "destructive" | "outline";
  children: React.ReactNode;
}) {
  const variantClasses = {
    default: "bg-blue-100 text-blue-800 border-blue-200",
    destructive: "bg-red-100 text-red-800 border-red-200",
    outline: "bg-transparent text-gray-700 border-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
