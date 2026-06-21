'use client'

import { useState, useEffect } from 'react'
import { User, Ticket, TicketStatus } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'
import { fetchTickets, updateTicketStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import TicketCard from '@/components/tickets/ticket-card'
import AuditTimeline from '@/components/tickets/audit-timeline'
import { CheckCircle, MessageCircle, RefreshCw } from 'lucide-react'
const supabase = getSupabase()
interface FieldStaffInterfaceProps {
  currentUser: User
  onNavigate: (view: string) => void
  currentView: string
}

export default function FieldStaffInterface({ currentUser, onNavigate, currentView }: FieldStaffInterfaceProps) {
  // 1. STATE: Live data
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [comment, setComment] = useState('')
  const [newStatus, setNewStatus] = useState<TicketStatus | ''>('')

  // 2. DATA FETCHING
  const loadData = async () => {
    setLoading(true)
    const data = await fetchTickets()
    setTickets(data)
    setLoading(false)
    
    // Update selected ticket reference if it exists
    if (selectedTicket) {
      const updated = data.find(t => t.id === selectedTicket.id)
      if (updated) setSelectedTicket(updated)
    }
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('field-staff-interface')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchTickets().then((data) => {
          setTickets(data)
          if (selectedTicket) {
             const updated = data.find(t => t.id === selectedTicket.id)
             if (updated) setSelectedTicket(updated)
          }
        })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => {
        fetchTickets().then((data) => {
          setTickets(data)
          if (selectedTicket) {
             const updated = data.find(t => t.id === selectedTicket.id)
             if (updated) setSelectedTicket(updated)
          }
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?.id]) 

  const assignedTickets = tickets.filter((t) => t.assignedTo === currentUser.name)
  const availableTickets = tickets.filter((t) => !t.assignedTo && t.status === 'open')

  // 3. ASYNC ACTIONS
  const handleAddComment = async () => {
    if (!comment.trim() || !selectedTicket) return

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          incident_id: selectedTicket.id,
          author: currentUser.name,
          author_role: currentUser.role,
          content: comment
        })

      if (error) throw error
      setComment('')
      
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add note')
    }
  }

  const handleStatusChange = async () => {
    if (!newStatus || !selectedTicket) return

    try {
      await updateTicketStatus(selectedTicket.id, newStatus as TicketStatus, currentUser.name)
      setNewStatus('')
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleAcceptJob = async (ticket: Ticket) => {
    try {
      await updateTicketStatus(ticket.id, 'in_progress', currentUser.name)
      
      // Also update assignment if needed (though updateTicketStatus might not do that by default depending on implementation)
      const { error } = await supabase
        .from('incidents')
        .update({ assigned_to: currentUser.name })
        .eq('id', ticket.id)

      if (error) throw error
      alert('Job accepted!')

    } catch (error) {
      console.error('Error accepting job:', error)
    }
  }

  // --- VIEW: HOME ---
  if (currentView === 'home') {
    const inProgressCount = assignedTickets.filter((t) => t.status === 'in_progress').length
    const completedCount = assignedTickets.filter((t) => t.status === 'resolved').length

    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
            Welcome, {currentUser.name}
            {loading && <RefreshCw className="h-5 w-5 animate-spin text-white/80" />}
          </h2>
          <p className="text-emerald-50">You have {inProgressCount} active tasks</p>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-primary">{assignedTickets.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Assigned Jobs</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-orange-600">{inProgressCount}</p>
            <p className="text-xs md:text-sm text-muted-foreground">In Progress</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-emerald-600">{completedCount}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-secondary">{availableTickets.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Available Work</p>
          </Card>
        </div>

        {/* Active Jobs */}
        <div>
          <h3 className="text-lg md:text-xl font-bold mb-4">Current Tasks</h3>
          {assignedTickets.filter((t) => t.status === 'in_progress').length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No active tasks</p>
              <Button onClick={() => onNavigate('available')} className="bg-secondary hover:bg-teal-600 text-white">
                Browse Available Work
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignedTickets
                .filter((t) => t.status === 'in_progress')
                .map((ticket) => (
                  <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}>
                    <TicketCard ticket={ticket} clickable onClick={() => setSelectedTicket(ticket)} />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- VIEW: ASSIGNED TASKS ---
  if (currentView === 'assigned') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">My Assigned Tasks</h2>
          <Button onClick={() => onNavigate('available')} className="bg-secondary hover:bg-teal-600 text-white">
            See Available Work
          </Button>
        </div>

        {selectedTicket ? (
          <TaskDetailView
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onCommentAdd={handleAddComment}
            onStatusChange={handleStatusChange}
            comment={comment}
            setComment={setComment}
            newStatus={newStatus}
            setNewStatus={setNewStatus}
          />
        ) : (
          <>
            {assignedTickets.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No tasks assigned yet</p>
                <Button onClick={() => onNavigate('available')} className="bg-secondary hover:bg-teal-600 text-white">
                  Find Available Work
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {assignedTickets.map((ticket) => (
                  <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}>
                    <TicketCard ticket={ticket} clickable onClick={() => setSelectedTicket(ticket)} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // --- VIEW: AVAILABLE WORK ---
  if (currentView === 'available') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Available Work</h2>
          <Button onClick={() => onNavigate('assigned')} variant="outline">
            My Tasks
          </Button>
        </div>

        {availableTickets.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No available work at this time</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {availableTickets.map((ticket) => (
              <Card key={ticket.id} className="p-4 md:p-6 border-l-4 border-l-secondary">
                <TicketCard ticket={ticket} />
                <Button
                  onClick={() => handleAcceptJob(ticket)}
                  className="w-full mt-4 bg-secondary hover:bg-teal-600 text-white flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Accept This Job
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

function TaskDetailView({
  ticket,
  onClose,
  onCommentAdd,
  onStatusChange,
  comment,
  setComment,
  newStatus,
  setNewStatus,
}: {
  ticket: Ticket
  onClose: () => void
  onCommentAdd: () => void
  onStatusChange: () => void
  comment: string
  setComment: (value: string) => void
  newStatus: TicketStatus | ''
  setNewStatus: (value: TicketStatus | '') => void
}) {
  const inputClass = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onClose} className="mb-4">
        ← Back
      </Button>
      <Card className="p-6 space-y-6">
        <TicketCard ticket={ticket} expanded />

        {/* Status Update */}
        <div className="border-t border-border pt-6 space-y-3">
          <h3 className="font-bold text-lg">Update Status</h3>
          <div className="flex gap-2 flex-col sm:flex-row">
            {/* FIX: Native select to replace invalid Select component usage */}
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
              className={`${inputClass} flex-1`}
              aria-label="Change ticket status"
            >
              <option value="">Change status...</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Mark as Resolved</option>
            </select>
            <Button onClick={onStatusChange} disabled={!newStatus} className="bg-primary hover:bg-orange-600">
              Update
            </Button>
          </div>
        </div>

        {/* Comments */}
        <div className="border-t border-border pt-6 space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Work Notes
          </h3>

          {ticket.comments.length > 0 && (
            <div className="space-y-3 bg-muted p-4 rounded-lg">
              {ticket.comments.map((c) => (
                <div key={c.id} className="pb-3 border-b border-border last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{c.author}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Add a note about your progress..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full"
            />
            <Button onClick={onCommentAdd} disabled={!comment.trim()} className="w-full bg-primary hover:bg-orange-600">
              Add Note
            </Button>
          </div>
        </div>

        <AuditTimeline auditLogs={ticket.audit || []} />
      </Card>
    </div>
  )
}