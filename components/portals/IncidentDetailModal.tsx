"use client";

import { useState, useEffect } from "react";
import { Ticket, User } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  MapPin,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  Clock,
  CheckCircle,
  Tag,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  Phone,
  Mail,
  Shield,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Printer,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Bell,
} from "lucide-react";
const supabase = getSupabase()
interface IncidentDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  currentUser: User;
  onAssignClick?: () => void;
}

export default function IncidentDetailModal({
  ticket,
  onClose,
  currentUser,
  onAssignClick,
}: IncidentDetailModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [reportedByUser, setReportedByUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "details" | "comments" | "audit" | "media"
  >("details");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      loadIncidentDetails();
    }
  }, [ticket]);

  const loadIncidentDetails = async () => {
    if (!ticket) return;
    setLoading(true);

    try {
      // Load comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .eq("incident_id", ticket.id)
        .order("created_at", { ascending: false });

      if (commentsData) setComments(commentsData);

      // Load audit logs
      const { data: auditData } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("incident_id", ticket.id)
        .order("timestamp", { ascending: false });

      if (auditData) setAuditLogs(auditData);

      // Load assigned user
      if (ticket.assignedTo) {
        const { data: assignedData } = await supabase
          .from("profiles")
          .select("*")
          .eq("full_name", ticket.assignedTo)
          .single();

        if (assignedData) {
          setAssignedUser({
            id: assignedData.id,
            name: assignedData.full_name,
            email: assignedData.email,
            role: assignedData.role as any,
            department: assignedData.department,
            phone: assignedData.phone,
            currentLocation: null,
            skills: [],
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
          setReportedByUser({
            id: reportedData.id,
            name: reportedData.full_name,
            email: reportedData.email,
            role: reportedData.role as any,
            department: reportedData.department,
            phone: reportedData.phone,
            currentLocation: null,
            skills: [],
            createdAt: reportedData.created_at,
            lastLogin: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Error loading incident details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!ticket) return null;

  const getStatusColor = (status: string) => {
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

  const getSeverityColor = (severity: string) => {
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge
                  className={`px-3 py-1.5 text-sm font-bold ${getSeverityColor(ticket.severity)}`}
                >
                  {ticket.severity.toUpperCase()}
                </Badge>
                <Badge
                  className={`px-3 py-1.5 text-sm font-bold ${getStatusColor(ticket.status)}`}
                >
                  {ticket.status.replace("_", " ").toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500 font-mono">
                  {ticket.ticketNumber}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mt-2">
                {ticket.title}
              </h2>
              <p className="text-gray-600 mt-1">
                Reported on{" "}
                {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onAssignClick}
                disabled={!!ticket.assignedTo}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                {ticket.assignedTo ? "Reassign" : "Assign"}
              </Button>
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

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            <Button
              variant={activeTab === "details" ? "default" : "ghost"}
              onClick={() => setActiveTab("details")}
              className="rounded-lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              Details
            </Button>
            <Button
              variant={activeTab === "comments" ? "default" : "ghost"}
              onClick={() => setActiveTab("comments")}
              className="rounded-lg"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments ({comments.length})
            </Button>
            <Button
              variant={activeTab === "audit" ? "default" : "ghost"}
              onClick={() => setActiveTab("audit")}
              className="rounded-lg"
            >
              <Shield className="h-4 w-4 mr-2" />
              Audit Trail ({auditLogs.length})
            </Button>
            <Button
              variant={activeTab === "media" ? "default" : "ghost"}
              onClick={() => setActiveTab("media")}
              className="rounded-lg"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Media ({ticket.images?.length || 0})
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(90vh-180px)]">
          <div className="p-6">
            {activeTab === "details" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Description
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  </Card>

                  {/* Location */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Location Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Address:</span>
                        <span className="font-medium">{ticket.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Coordinates:</span>
                        <span className="font-mono text-sm">
                          {ticket.latitude?.toFixed(6)},{" "}
                          {ticket.longitude?.toFixed(6)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Category:</span>
                        <Badge variant="outline">{ticket.category}</Badge>
                      </div>
                    </div>
                  </Card>

                  {/* ML Analysis */}
                  {ticket.mlAnalysis && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        AI Analysis
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">
                            Confidence Score:
                          </span>
                          <span
                            className={`font-bold ${
                              ticket.mlConfidenceScore > 0.8
                                ? "text-green-600"
                                : ticket.mlConfidenceScore > 0.6
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {(ticket.mlConfidenceScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Detections:</span>
                          <span className="font-medium">
                            {ticket.detectionCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Coverage Ratio:</span>
                          <span className="font-medium">
                            {(ticket.coverageRatio * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Assigned To */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      Assignment
                    </h3>
                    {ticket.assignedTo ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                            {assignedUser?.name?.charAt(0) ||
                              ticket.assignedTo?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {ticket.assignedTo}
                            </p>
                            {assignedUser?.department && (
                              <p className="text-sm text-gray-600">
                                {assignedUser.department}
                              </p>
                            )}
                          </div>
                        </div>
                        {assignedUser && (
                          <div className="space-y-2 text-sm">
                            {assignedUser.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4" />
                                {assignedUser.email}
                              </div>
                            )}
                            {assignedUser.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4" />
                                {assignedUser.phone}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Not assigned yet</p>
                        <Button onClick={onAssignClick} className="mt-3 w-full">
                          Assign Now
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Timeline */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Timeline
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                        <div>
                          <p className="font-medium text-gray-900">Reported</p>
                          <p className="text-sm text-gray-600">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {ticket.assignedTo && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
                          <div>
                            <p className="font-medium text-gray-900">
                              Assigned
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(ticket.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                      {ticket.resolvedAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <p className="font-medium text-gray-900">
                              Resolved
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(ticket.resolvedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Tags */}
                  {ticket.tags && ticket.tags.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {ticket.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Comments
                    </h3>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Comment
                    </Button>
                  </div>
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No comments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="border-l-4 border-blue-500 pl-4 py-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {comment.author}
                              </p>
                              <p className="text-sm text-gray-600">
                                {comment.author_role}
                              </p>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(
                                comment.created_at,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-2 text-gray-700">
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {activeTab === "audit" && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Audit Trail
                </h3>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No audit logs available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {log.action}
                            </p>
                            <p className="text-sm text-gray-600">
                              By {log.actor} ({log.actor_role})
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {log.field_changed && (
                          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Field:</p>
                              <p className="font-medium">{log.field_changed}</p>
                            </div>
                            <div className="space-y-1">
                              {log.old_value && (
                                <p className="text-gray-600">
                                  From:{" "}
                                  <span className="font-medium">
                                    {log.old_value}
                                  </span>
                                </p>
                              )}
                              {log.new_value && (
                                <p className="text-gray-600">
                                  To:{" "}
                                  <span className="font-medium">
                                    {log.new_value}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {activeTab === "media" && (
              <div>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Media Files
                  </h3>
                  {!ticket.images || ticket.images.length === 0 ? (
                    <div className="text-center py-8">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No media files attached</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {ticket.images.map((image, index) => (
                        <div
                          key={index}
                          className="relative group cursor-pointer"
                          onClick={() => setSelectedImage(image)}
                        >
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={image}
                              alt={`Incident image ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {ticket.annotatedImageUrl && (
                  <Card className="p-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      Annotated Image
                    </h3>
                    <div className="relative">
                      <img
                        src={ticket.annotatedImageUrl}
                        alt="Annotated analysis"
                        className="w-full max-w-2xl rounded-lg border border-gray-200"
                      />
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-7xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Full size"
              className="max-h-[90vh] rounded-lg"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
