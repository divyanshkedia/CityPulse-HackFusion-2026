// components/tickets/audit-timeline.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditLog } from "@/lib/types";
import {
  UserCog,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";

interface AuditTimelineProps {
  auditLogs: AuditLog[];
}

export default function AuditTimeline({ auditLogs }: AuditTimelineProps) {
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
      case "ticket_created":
        return <FileText className="h-4 w-4" />;
      case "assigned":
      case "reassigned":
        return <UserCog className="h-4 w-4" />;
      case "status_changed":
      case "updated":
        return <Clock className="h-4 w-4" />;
      case "resolved":
      case "closed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
      case "ticket_created":
        return "Ticket Created";
      case "assigned":
      case "reassigned":
        return "Ticket Assigned";
      case "status_changed":
        return "Status Updated";
      case "resolved":
        return "Ticket Resolved";
      case "closed":
        return "Ticket Closed";
      case "comment_added":
        return "Comment Added";
      default:
        return action
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // If no audit logs, show empty state
  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">
            No Audit History
          </h3>
          <p className="text-sm text-muted-foreground">
            No actions have been recorded for this ticket yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <h3 className="font-bold text-foreground text-lg mb-6">Audit Timeline</h3>
      <div className="space-y-6">
        {auditLogs
          .slice()
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
          .map((log, index) => (
            <div key={log.id || index} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="p-2 bg-primary/10 rounded-full">
                  {getActionIcon(log.action)}
                </div>
                {index !== auditLogs.length - 1 && (
                  <div className="flex-1 w-0.5 bg-muted mt-4"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6 last:pb-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm md:text-base">
                      {getActionLabel(log.action)}
                    </span>
                    {log.actorRole && (
                      <Badge variant="outline" className="text-xs">
                        {log.actorRole.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    {formatDate(log.timestamp)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  By {log.actor || "System"}
                  {log.actorRole && log.actorRole !== "system"
                    ? ` (${log.actorRole.replace("_", " ")})`
                    : ""}
                </p>

                {log.fieldChanged && (
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p className="font-medium text-foreground mb-1">
                      Changed {log.fieldChanged.replace("_", " ")}:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-background p-2 rounded">
                        <p className="text-xs text-muted-foreground">From</p>
                        <p className="text-foreground truncate">
                          {log.oldValue
                            ? JSON.stringify(log.oldValue)
                            : "Empty"}
                        </p>
                      </div>
                      <div className="bg-background p-2 rounded">
                        <p className="text-xs text-muted-foreground">To</p>
                        <p className="text-foreground truncate">
                          {log.newValue
                            ? JSON.stringify(log.newValue)
                            : "Empty"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      Details: {JSON.stringify(log.details)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </Card>
  );
}
