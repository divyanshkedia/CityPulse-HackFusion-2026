import { supabase } from '@/lib/supabase'
import { Ticket, TicketStatus, Comment, AuditLog, Severity } from '@/lib/types'

// 1. Fetch All Tickets (With Relations)
export async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select(`
      *,
      audit:audit_logs(*),
      comments(*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    return []
  }

  // Map DB columns to your TypeScript Interface
  return data.map((row: any) => {
    // Parse ml_analysis if it's a string (JSON)
    let mlAnalysis = null
    if (row.ml_analysis) {
      try {
        mlAnalysis = typeof row.ml_analysis === 'string' 
          ? JSON.parse(row.ml_analysis) 
          : row.ml_analysis
      } catch (e) {
        console.error('Error parsing ml_analysis:', e)
        mlAnalysis = null
      }
    }

    const ticket: Ticket = {
      id: row.id,
      ticketNumber: row.ticket_number?.toString() || `#${row.id.slice(0, 8)}`,
      title: row.title,
      description: row.description,
      category: row.category as any,
      severity: row.severity as any,
      status: row.status as any,
      location: row.location,
      latitude: row.latitude || 0,
      longitude: row.longitude || 0,
      
      // Database fields
      reported_by: row.reported_by,
      created_at: row.created_at,
      assigned_to: row.assigned_to,
      resolved_by: row.resolved_by,
      resolved_at: row.resolved_at,
      estimated_completion: row.estimated_completion,
      images: row.images || [],
      tags: row.tags || [],
      closed_at: row.closed_at,
      duplicate_of: row.duplicate_of,
      is_duplicate: row.is_duplicate || false,
      on_hold_reason: row.on_hold_reason,
      resolution_notes: row.resolution_notes,
      priority: row.priority || 0,
      
      // ML Analysis Fields (properly typed)
      ml_analysis: mlAnalysis ? {
        severity: mlAnalysis.severity as Severity || 'low',
        risk_score: mlAnalysis.risk_score || 0,
        num_potholes: mlAnalysis.num_potholes || 0,
        coverage_ratio: mlAnalysis.coverage_ratio || 0,
        lane_impact_ratio: mlAnalysis.lane_impact_ratio || 0,
        detection_count: mlAnalysis.detection_count || 0,
        confidence_scores: mlAnalysis.confidence_scores || []
      } : undefined,
      
      annotated_image_url: row.annotated_image_url,
      ml_confidence_score: row.ml_confidence_score,
      detection_count: row.detection_count,
      coverage_ratio: row.coverage_ratio,
      estimated_duration_hours: row.estimated_duration_hours,
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
      updated_at: row.updated_at,
      
      // Additional database fields
      ticket_number: row.ticket_number,
      
      // Frontend aliases
      reportedBy: row.reported_by,
      reportedAt: row.created_at,
      assignedTo: row.assigned_to,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      estimatedCompletion: row.estimated_completion,
      closedAt: row.closed_at,
      duplicateOf: row.duplicate_of,
      isDuplicate: row.is_duplicate || false,
      onHoldReason: row.on_hold_reason,
      resolutionNotes: row.resolution_notes,
      
      // Relations
      comments: (row.comments || []).map((c: any) => ({
        id: c.id,
        author: c.author,
        authorRole: c.author_role as any,
        content: c.content,
        createdAt: c.created_at,
        edited: c.edited || false,
      })),
      
      audit: (row.audit || []).map((a: any) => ({
        id: a.id,
        action: a.action || 'updated',
        actor: a.actor || 'System',
        actorRole: a.actor_role || 'system',
        timestamp: a.timestamp || a.created_at || new Date().toISOString(),
        details: a.details || {},
        fieldChanged: a.field_changed,
        oldValue: a.old_value,
        newValue: a.new_value,
      })),
    }
    
    return ticket
  })
}

// 2. Create Ticket
export async function createTicket(ticket: any) {
  const { data, error } = await supabase
    .from('incidents')
    .insert([{
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      severity: ticket.severity,
      location: ticket.location,
      latitude: ticket.latitude,
      longitude: ticket.longitude,
      reported_by: ticket.reportedBy,
      status: 'open',
      images: ticket.images || []
    }])
    .select()
    .single()
    
  return { data, error }
}

// 3. Update Status
export async function updateTicketStatus(id: string, status: TicketStatus, actor: string = 'System') {
  const { error } = await supabase
    .from('incidents')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  
  return error
}

// 4. Add Comment
export async function addComment(
  ticketId: string,
  comment: { author: string; authorRole: string; content: string },
) {
  const { error } = await supabase.from('comments').insert({
    incident_id: ticketId,
    author: comment.author,
    author_role: comment.authorRole,
    content: comment.content,
  })

  return error
}

// 5. Update Assignment
export async function updateTicketAssignment(id: string, assignedTo: string) {
  const { error } = await supabase
    .from('incidents')
    .update({
      assigned_to: assignedTo,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return error
}

// Add this function to your existing api.ts file
export async function fetchAuditLogs(): Promise<any[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      incident:incidents(id, title)
    `)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }

  // Map to consistent format
  return data.map((log: any) => ({
    id: log.id,
    incident_id: log.incident_id,
    ticketId: log.incident_id,
    ticketTitle: log.incident?.title || 'N/A',
    action: log.action,
    actor: log.actor,
    actorRole: log.actor_role,
    fieldChanged: log.field_changed,
    oldValue: log.old_value,
    newValue: log.new_value,
    timestamp: log.timestamp,
    created_at: log.timestamp
  }))
}