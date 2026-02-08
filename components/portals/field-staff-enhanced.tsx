// components/portals/field-staff-enhanced.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Ticket, TicketStatus } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { fetchTickets, updateTicketStatus} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import IncidentMap from "@/components/map/incident-map";
import AuditTimeline from "@/components/tickets/audit-timeline";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  MapPin,
  RefreshCw,
  Upload,
  Download,
  BookOpen,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

// Helper for state transitions
const getValidTransitions = (status: TicketStatus): TicketStatus[] => {
  switch (status) {
    case "assigned":
      return ["in_progress"];
    case "in_progress":
      return ["on_hold", "resolved"];
    case "on_hold":
      return ["in_progress", "resolved"];
    case "resolved":
      return []; // Can't move from resolved
    default:
      return [];
  }
};

// Offline SOP storage
const SOP_STORAGE_KEY = "field_staff_sop";
const OFFLINE_TICKETS_KEY = "offline_tickets";
const OFFLINE_ACTIONS_KEY = "offline_actions";

interface FieldStaffEnhancedProps {
  currentUser: User;
  onLogout: () => void;
}

export default function FieldStaffEnhanced({
  currentUser,
  onLogout,
}: FieldStaffEnhancedProps) {
  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [view, setView] = useState<"list" | "map" | "detail" | "sop">("list");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");
  const [newComment, setNewComment] = useState("");
  const [statusImage, setStatusImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sopDocuments, setSopDocuments] = useState<SOPDocument[]>([]);
  const [offlineActions, setOfflineActions] = useState<any[]>([]);

  // Load SOP from localStorage
  const loadSOP = useCallback(() => {
    try {
      const stored = localStorage.getItem(SOP_STORAGE_KEY);
      if (stored) {
        setSopDocuments(JSON.parse(stored));
      } else {
        // Default emergency SOP
        const defaultSOP: SOPDocument[] = [
          {
            id: "1",
            title: "Emergency Response Protocol",
            category: "safety",
            content: `1. Assess the situation for immediate dangers
2. Ensure personal safety first
3. Report to supervisor immediately
4. Isolate the area if safe to do so
5. Provide first aid if trained
6. Document everything with photos`,
            updatedAt: new Date().toISOString(),
          },
          {
            id: "2",
            title: "Equipment Checklist",
            category: "operations",
            content: `Required Equipment:
            - Safety helmet
            - Reflective vest
            - Work gloves
            - Measuring tape
            - Camera/Phone for documentation
            - First aid kit
            - Flashlight`,
            updatedAt: new Date().toISOString(),
          },
          {
            id: "3",
            title: "Photo Documentation Guide",
            category: "documentation",
            content: `For every ticket, capture:
            1. Overall scene (wide angle)
            2. Specific issue (close-up)
            3. Measurements if applicable
            4. Materials used
            5. Completed work
            6. Safety concerns addressed`,
            updatedAt: new Date().toISOString(),
          },
        ];
        setSopDocuments(defaultSOP);
        localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(defaultSOP));
      }
    } catch (error) {
      console.error("Failed to load SOP:", error);
    }
  }, []);

  // Load offline data
  const loadOfflineData = useCallback(() => {
    try {
      const storedActions = localStorage.getItem(OFFLINE_ACTIONS_KEY);
      if (storedActions) {
        setOfflineActions(JSON.parse(storedActions));
      }
      
      const storedTickets = localStorage.getItem(OFFLINE_TICKETS_KEY);
      if (storedTickets && !isOnline) {
        setTickets(JSON.parse(storedTickets));
      }
    } catch (error) {
      console.error("Failed to load offline data:", error);
    }
  }, [isOnline]);

  // Fetch data
  const loadData = useCallback(async () => {
    if (!isOnline) {
      loadOfflineData();
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchTickets();
      setTickets(data);
      
      // Store for offline use
      localStorage.setItem(OFFLINE_TICKETS_KEY, JSON.stringify(data));
      
      // Update selected ticket
      if (selectedTicket) {
        const updated = data.find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
      
      // Sync offline actions when coming online
      if (isOnline && offlineActions.length > 0) {
        await syncOfflineActions();
      }
    } catch (error) {
      console.error("Failed to load tickets:", error);
      toast.error("Failed to load tickets");
      
      // Fallback to offline data
      loadOfflineData();
    } finally {
      setLoading(false);
    }
  }, [isOnline, selectedTicket, offlineActions, loadOfflineData]);

  // Sync offline actions when online
  const syncOfflineActions = async () => {
    for (const action of offlineActions) {
      try {
        if (action.type === 'comment') {
          await supabase.from("comments").insert(action.data);
        } else if (action.type === 'status') {
          await updateTicketStatus(action.data.ticketId, action.data.status, currentUser.name);
        }
      } catch (error) {
        console.error("Failed to sync action:", error);
      }
    }
    
    // Clear synced actions
    setOfflineActions([]);
    localStorage.removeItem(OFFLINE_ACTIONS_KEY);
    toast.success("Offline actions synced");
  };

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online");
      loadData();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Working offline", {
        description: "Changes will sync when back online",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
    loadSOP();
    loadOfflineData();

    // Realtime subscription (only when online)
    if (isOnline) {
      const channel = supabase
        .channel("field-staff-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "incidents" },
          () => {
            loadData();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "comments" },
          () => {
            loadData();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOnline, loadData, loadSOP, loadOfflineData]);

  // Filter tickets
  const assignedTickets = tickets.filter(
    (t) => t.assignedTo === currentUser.name && t.status !== "closed",
  );

  const filtered =
    filterStatus === "all"
      ? assignedTickets
      : assignedTickets.filter((t) => t.status === filterStatus);

  // Actions
  const handleAcceptTicket = async (ticket: Ticket) => {
    try {
      await updateTicketStatus(ticket.id, "in_progress", currentUser.name);
      toast.success("Ticket accepted");
    } catch (error) {
      console.error("Error accepting ticket:", error);
      toast.error("Failed to accept ticket");
    }
  };

  const handleStatusTransition = async (
    ticket: Ticket,
    newStatus: TicketStatus,
  ) => {
    if (!statusImage && newStatus === "resolved") {
      toast.error("Please upload a photo before resolving");
      return;
    }

    setUploading(true);
    try {
      let imageUrl = "";
      
      // Upload image if provided
      if (statusImage) {
        imageUrl = await uploadTicketImage(ticket.id, statusImage);
      }

      // Update status
      await updateTicketStatus(ticket.id, newStatus, currentUser.name, imageUrl);
      
      // Add system comment
      await supabase.from("comments").insert({
        incident_id: ticket.id,
        author: "System",
        author_role: "system",
        content: `Status changed to ${newStatus}${imageUrl ? " with photo evidence" : ""}`,
      });

      setStatusImage(null);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      
      // Store offline if failed due to network
      if (!isOnline) {
        const action = {
          type: 'status',
          data: {
            ticketId: ticket.id,
            status: newStatus,
            timestamp: new Date().toISOString(),
          }
        };
        const updatedActions = [...offlineActions, action];
        setOfflineActions(updatedActions);
        localStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(updatedActions));
        toast.success("Action saved for offline sync");
      } else {
        toast.error("Failed to update status");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = async (ticket: Ticket) => {
    if (!newComment.trim()) return;

    try {
      await supabase.from("comments").insert({
        incident_id: ticket.id,
        author: currentUser.name,
        author_role: currentUser.role,
        content: newComment,
      });

      setNewComment("");
      toast.success("Note added");
    } catch (error) {
      console.error("Error adding comment:", error);
      
      // Store offline if failed
      if (!isOnline) {
        const action = {
          type: 'comment',
          data: {
            incident_id: ticket.id,
            author: currentUser.name,
            author_role: currentUser.role,
            content: newComment,
            createdAt: new Date().toISOString(),
          }
        };
        const updatedActions = [...offlineActions, action];
        setOfflineActions(updatedActions);
        localStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(updatedActions));
        toast.success("Note saved for offline sync");
        setNewComment("");
      } else {
        toast.error("Failed to add note");
      }
    }
  };

  const getPriorityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-100 text-red-800 border-red-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-emerald-100 text-emerald-800 border-emerald-300",
    };
    return colors[severity] || "bg-gray-100";
  };

  // --- VIEW: MAP ---
  if (view === "map") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50">
        {/* Network Status */}
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${isOnline ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="fixed top-4 left-4 right-4 z-10 flex gap-2 md:hidden">
          <Button
            onClick={() => setView("list")}
            className="flex-1 py-2 bg-white text-foreground border border-muted"
          >
            List
          </Button>
          <Button
            onClick={() => setView("map")}
            className="flex-1 py-2 bg-primary text-primary-foreground"
          >
            Map
          </Button>
          <Button
            onClick={() => setView("sop")}
            variant="outline"
            className="flex-1 py-2"
          >
            SOP
          </Button>
        </div>

        <div className="hidden md:fixed md:left-4 md:top-4 md:flex md:flex-col md:gap-2 md:z-10">
          <Button
            onClick={() => setView("list")}
            className="bg-white text-foreground border border-muted"
          >
            ← Back to List
          </Button>
          <Button
            onClick={() => setView("sop")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            View SOP
          </Button>
        </div>

        {/* Map */}
        <div className="pt-16 md:pt-4 px-4">
          <div className="h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-gray-200 shadow-lg">
            <IncidentMap
              incidents={assignedTickets}
              onMarkerClick={(ticket) => {
                setSelectedTicket(ticket);
                setView("detail");
              }}
            />
          </div>
        </div>

        {/* Stats Card */}
        <div className="fixed bottom-4 left-4 right-4 md:bottom-auto md:top-20 md:right-4 md:left-auto md:w-80">
          <Card className="p-4 border-2 border-primary/20 shadow-lg">
            <h3 className="font-bold text-foreground mb-2">Assigned Tasks</h3>
            <p className="text-2xl font-bold text-primary">
              {assignedTickets.length}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ 
                    width: `${(assignedTickets.filter(t => t.status === 'resolved').length / Math.max(assignedTickets.length, 1)) * 100}%` 
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {assignedTickets.filter(t => t.status === 'resolved').length}/{assignedTickets.length} resolved
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Click on markers for details
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // --- VIEW: SOP ---
  if (view === "sop") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                Standard Operating Procedures
              </h1>
              <p className="text-muted-foreground mt-2">
                Reference materials for field operations
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setView("list")}
                className="bg-white text-foreground border border-muted"
              >
                ← Back to Tasks
              </Button>
              <Button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(sopDocuments, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'sop-backup.json';
                  a.click();
                  toast.success("SOP downloaded");
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Backup
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sopDocuments.map((doc) => (
              <Card key={doc.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground">{doc.title}</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {doc.category}
                  </span>
                </div>
                <pre className="text-foreground whitespace-pre-wrap font-sans bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {doc.content}
                </pre>
                <p className="text-sm text-muted-foreground mt-4">
                  Last updated: {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>

          {/* Add SOP Section */}
          <Card className="mt-8 p-6">
            <h3 className="text-xl font-bold text-foreground mb-4">Add Personal Notes</h3>
            <Textarea
              placeholder="Add your own notes or procedures..."
              className="min-h-[200px] mb-4"
              onChange={(e) => {
                // Store in localStorage
                const notes = e.target.value;
                localStorage.setItem('field_staff_notes', notes);
              }}
              defaultValue={localStorage.getItem('field_staff_notes') || ''}
            />
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target?.result as string);
                      setSopDocuments(data);
                      localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(data));
                      toast.success("SOP imported successfully");
                    } catch (error) {
                      toast.error("Invalid SOP file");
                    }
                  };
                  reader.readAsText(file);
                };
                input.click();
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import SOP
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // --- VIEW: DETAIL ---
  if (view === "detail" && selectedTicket) {
    const validTransitions = getValidTransitions(selectedTicket.status);

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => setView("list")}
              className="bg-white text-foreground border border-muted"
            >
              ← Back to Tasks
            </Button>
            {!isOnline && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                Offline - Changes will sync later
              </div>
            )}
          </div>

          <Card className="p-6 md:p-8 shadow-xl">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold text-foreground">
                  {selectedTicket.title}
                </h1>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold border ${getPriorityColor(selectedTicket.severity)}`}
                  >
                    {selectedTicket.severity.toUpperCase()}
                  </span>
                  <span className="px-4 py-2 rounded-full bg-gray-100 text-gray-800 text-sm font-bold">
                    #{selectedTicket.ticketNumber}
                  </span>
                </div>
              </div>
              
              {/* Quick Actions */}
              {selectedTicket.status === "assigned" && (
                <Button
                  onClick={() => handleAcceptTicket(selectedTicket)}
                  className="w-full mb-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  Accept & Start Work
                </Button>
              )}

              {/* Status Transitions with Photo Upload */}
              {validTransitions.length > 0 &&
                selectedTicket.status !== "assigned" && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                    <p className="text-sm font-semibold text-foreground mb-3">
                      Update Status:
                    </p>
                    
                    {/* Photo Upload for Resolved */}
                    {validTransitions.includes("resolved") && (
                      <div className="mb-4 p-3 bg-white rounded-lg border">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Upload Completion Photo *
                        </label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 10 * 1024 * 1024) {
                                  toast.error("File size must be less than 10MB");
                                  return;
                                }
                                setStatusImage(file);
                              }
                            }}
                            className="flex-1"
                          />
                          {statusImage && (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Required for resolution. Max 10MB
                        </p>
                      </div>
                    )}

                    {/* Status Buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {validTransitions.map((status) => (
                        <Button
                          key={status}
                          onClick={() =>
                            handleStatusTransition(selectedTicket, status)
                          }
                          disabled={uploading || (status === "resolved" && !statusImage)}
                          className={`py-2 ${status === "resolved" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-primary/20 text-primary border border-primary hover:bg-primary/30"}`}
                        >
                          {uploading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            status.replace("_", " ")
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-foreground p-3 bg-gray-50 rounded-lg border">
                  {selectedTicket.description}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="text-foreground">{selectedTicket.location}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-foreground p-3 bg-gray-50 rounded-lg border capitalize">
                  {selectedTicket.category.replace("_", " ")}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                <p className="text-foreground p-3 bg-gray-50 rounded-lg border capitalize">
                  {selectedTicket.status.replace("_", " ")}
                </p>
              </div>
            </div>

            {/* Images */}
            {selectedTicket.images && selectedTicket.images.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-foreground mb-3">
                  Reported Photos ({selectedTicket.images.length})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedTicket.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img || "/placeholder.svg"}
                        alt={`Incident ${idx}`}
                        className="w-full h-24 object-cover rounded-lg border border-muted group-hover:opacity-90 transition"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="border-t border-muted pt-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Progress Notes
              </h3>

              {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {selectedTicket.comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-foreground text-sm">
                          {comment.author}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-foreground">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No notes yet
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <Textarea
                  placeholder="Add progress note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 min-h-[80px]"
                />
                <Button
                  onClick={() => handleAddComment(selectedTicket)}
                  disabled={!newComment.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Add Note
                </Button>
              </div>
            </div>

            {/* Audit Log */}
            {selectedTicket.audit && selectedTicket.audit.length > 0 && (
              <div className="mt-8 border-t border-muted pt-6">
                <AuditTimeline auditLogs={selectedTicket.audit} />
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // --- VIEW: LIST (Default) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                My Assigned Tasks
              </h1>
              {!isOnline && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-2">
                  <WifiOff className="w-4 h-4" />
                  Offline
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              Welcome, {currentUser.name}! 🙏 Your work dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setView("sop")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              SOP
            </Button>
            <Button
              onClick={onLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border-2 border-gray-200">
            <p className="text-xs text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold text-foreground">
              {assignedTickets.length}
            </p>
          </Card>
          <Card className="p-4 border-2 border-blue-200">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-primary">
              {assignedTickets.filter((t) => t.status === "in_progress").length}
            </p>
          </Card>
          <Card className="p-4 border-2 border-yellow-200">
            <p className="text-xs text-muted-foreground">On Hold</p>
            <p className="text-2xl font-bold text-yellow-600">
              {assignedTickets.filter((t) => t.status === "on_hold").length}
            </p>
          </Card>
          <Card className="p-4 border-2 border-emerald-200">
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-emerald-600">
              {assignedTickets.filter((t) => t.status === "resolved").length}
            </p>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-1">
            <Button
              onClick={() => setView("list")}
              className={`flex-1 md:flex-none ${view === "list" ? "bg-primary text-primary-foreground" : "bg-white text-foreground border border-muted"}`}
            >
              List View
            </Button>
            <Button
              onClick={() => setView("map")}
              className={`flex-1 md:flex-none ${view === "map" ? "bg-primary text-primary-foreground" : "bg-white text-foreground border border-muted"}`}
            >
              Map View
            </Button>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as TicketStatus | "all")
              }
              className="w-full md:w-48 px-4 py-2 border border-muted rounded-lg bg-white text-foreground"
            >
              <option value="all">All Tasks</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No tasks found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {filterStatus !== "all" ? "Try changing the filter" : "No tasks assigned yet"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered
              .sort((a, b) => {
                const severityOrder = {
                  critical: 0,
                  high: 1,
                  medium: 2,
                  low: 3,
                };
                return (
                  severityOrder[a.severity as keyof typeof severityOrder] -
                  severityOrder[b.severity as keyof typeof severityOrder]
                );
              })
              .map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setView("detail");
                  }}
                  className="cursor-pointer group"
                >
                  <Card className="p-4 hover:shadow-xl transition-all border-l-4 border-primary group-hover:border-primary/80">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-foreground">
                            {ticket.title}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-bold border ${getPriorityColor(ticket.severity)}`}
                          >
                            {ticket.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          #{ticket.ticketNumber}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{ticket.location}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-bold ${
                            ticket.status === "in_progress"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : ticket.status === "on_hold"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                : ticket.status === "resolved"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-orange-100 text-orange-800 border border-orange-300"
                          }`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                        {ticket.status === "assigned" && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {ticket.estimatedCompletion && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due: {new Date(ticket.estimatedCompletion).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
          </div>
        )}

        {/* Offline Actions Indicator */}
        {offlineActions.length > 0 && (
          <div className="fixed bottom-4 right-4">
            <Button
              onClick={syncOfflineActions}
              className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sync {offlineActions.length} Offline Action{offlineActions.length !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}