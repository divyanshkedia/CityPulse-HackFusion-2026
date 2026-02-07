// lib/api.ts
import { supabase } from "@/lib/supabase";
import { Ticket, TicketStatus, Comment, AuditLog } from "@/lib/types";

// 1. Fetch All Tickets (With Relations)
export async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select(
      `
      *,
      audit:audit_logs(*),
      comments(*)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tickets:", error);
    return [];
  }

  // Map DB columns to your TypeScript Interface
  return data.map((row: any) => ({
    id: row.id,
    ticketNumber: `#${row.ticket_number}`,
    title: row.title,
    description: row.description,
    category: row.category as any,
    severity: row.severity as any,
    status: row.status as any,
    location: row.location, // This is the address string
    latitude: row.latitude || 0,
    longitude: row.longitude || 0,
    reportedBy: row.reported_by,
    reportedAt: row.created_at,
    assignedTo: row.assigned_to,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    images: row.images || [],
    tags: row.tags || [],
    comments: (row.comments || []).map((c: any) => ({
      id: c.id,
      author: c.author,
      authorRole: c.author_role as any,
      content: c.content,
      createdAt: c.created_at,
      edited: c.edited || false,
    })),
    // In lib/api.ts, update the audit transformation:
    audit: (row.audit || []).map((a: any) => ({
      id: a.id,
      action: a.action || "updated",
      actor: a.actor || "System",
      actorRole: a.actor_role || "system", // Ensure this is never null
      timestamp: a.timestamp || a.created_at || new Date().toISOString(),
      details: a.details || {},
      fieldChanged: a.field_changed,
      oldValue: a.old_value,
      newValue: a.new_value,
    })),
    isDuplicate: row.is_duplicate || false,
    onHoldReason: row.on_hold_reason,
    resolutionNotes: row.resolution_notes,
    priority: row.priority || 0,
    duplicateOf: row.duplicate_of,
    // Additional database fields
    created_at: row.created_at,
    updated_at: row.updated_at,
    ticket_number: row.ticket_number,
    estimatedCompletion: row.estimated_completion,
    closedAt: row.closed_at,
    ml_analysis: row.ml_analysis,
    ml_confidence_score: row.ml_confidence_score,
    detection_count: row.detection_count,
    coverage_ratio: row.coverage_ratio,
    estimated_duration_hours: row.estimated_duration_hours,
    scheduled_start: row.scheduled_start,
    scheduled_end: row.scheduled_end,
  }));
}

// 2. Create Ticket
export async function createTicket(ticket: any) {
  const { data, error } = await supabase
    .from("incidents")
    .insert([
      {
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        severity: ticket.severity,
        location: ticket.location,
        latitude: ticket.latitude,
        longitude: ticket.longitude,
        reported_by: ticket.reportedBy,
        status: "open",
        images: ticket.images || [],
      },
    ])
    .select()
    .single();

  return { data, error };
}

// 3. Update Status
export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  actor: string = "System",
) {
  const { error } = await supabase
    .from("incidents")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return error;
}

// 4. Add Comment
export async function addComment(
  ticketId: string,
  comment: { author: string; authorRole: string; content: string },
) {
  const { error } = await supabase.from("comments").insert({
    incident_id: ticketId,
    author: comment.author,
    author_role: comment.authorRole,
    content: comment.content,
  });

  return error;
}

// 5. Update Assignment
export async function updateTicketAssignment(id: string, assignedTo: string) {
  const { error } = await supabase
    .from("incidents")
    .update({
      assigned_to: assignedTo,
      status: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return error;
}
