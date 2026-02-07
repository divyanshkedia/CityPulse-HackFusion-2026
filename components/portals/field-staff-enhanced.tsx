'use client'

import { useState } from 'react'
import { User, Ticket, TicketStatus } from '@/lib/types'
import { storage } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { IncidentStateMachine, getValidTransitions } from '@/lib/state-machine'
import IncidentMap from '@/components/map/incident-map'
import { CheckCircle, AlertCircle, Clock, Navigation, MessageSquare, MapPin } from 'lucide-react'

interface FieldStaffEnhancedProps {
  currentUser: User
  onLogout: () => void
}

export default function FieldStaffEnhanced({ currentUser, onLogout }: FieldStaffEnhancedProps) {
  const [tickets, setTickets] = useState(storage.getTickets())
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [view, setView] = useState<'list' | 'map' | 'detail'>('list')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all')
  const [newComment, setNewComment] = useState('')
  const [showProgressModal, setShowProgressModal] = useState(false)

  const assignedTickets = tickets.filter((t) => t.assignedTo === currentUser.name && t.status !== 'closed')
  const filtered =
    filterStatus === 'all' ? assignedTickets : assignedTickets.filter((t) => t.status === filterStatus)

  const handleAcceptTicket = (ticket: Ticket) => {
    const stateMachine = new IncidentStateMachine(ticket.status)
    if (stateMachine.canTransitionTo('in_progress')) {
      ticket.status = 'in_progress'
      storage.addAuditLog(ticket.id, {
        action: 'status_updated',
        actor: currentUser.name,
        actorRole: currentUser.role,
        details: {
          from: 'assigned',
          to: 'in_progress',
          timestamp: new Date().toISOString(),
        },
        fieldChanged: 'status',
        oldValue: 'assigned',
        newValue: 'in_progress',
      })
      setTickets(storage.getTickets())
    }
  }

  const handleStatusTransition = (ticket: Ticket, newStatus: TicketStatus) => {
    const stateMachine = new IncidentStateMachine(ticket.status)
    if (stateMachine.canTransitionTo(newStatus)) {
      ticket.status = newStatus
      if (newStatus === 'resolved') {
        ticket.resolvedBy = currentUser.name
        ticket.resolvedAt = new Date().toISOString()
      }
      storage.addAuditLog(ticket.id, {
        action: 'status_updated',
        actor: currentUser.name,
        actorRole: currentUser.role,
        details: {
          from: ticket.status,
          to: newStatus,
        },
        fieldChanged: 'status',
        oldValue: ticket.status,
        newValue: newStatus,
      })
      setTickets(storage.getTickets())
      setShowProgressModal(false)
    }
  }

  const handleAddComment = (ticket: Ticket) => {
    if (!newComment.trim()) return

    const comment = {
      id: 'comment-' + Date.now(),
      author: currentUser.name,
      authorRole: currentUser.role,
      content: newComment,
      createdAt: new Date().toISOString(),
      edited: false,
    }

    ticket.comments.push(comment)
    storage.addAuditLog(ticket.id, {
      action: 'comment_added',
      actor: currentUser.name,
      actorRole: currentUser.role,
      details: {
        comment: newComment,
      },
    })
    setNewComment('')
    setTickets(storage.getTickets())
  }

  const getPriorityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-emerald-100 text-emerald-800',
    }
    return colors[severity] || 'bg-gray-100'
  }

  if (view === 'map') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50">
        <div className="fixed top-4 left-4 right-4 z-10 flex gap-2 md:hidden">
          <Button
            onClick={() => setView('list')}
            className="flex-1 py-2 bg-white text-foreground border border-muted"
          >
            List
          </Button>
          <Button onClick={() => setView('map')} className="flex-1 py-2 bg-primary text-primary-foreground">
            Map
          </Button>
        </div>

        <div className="hidden md:fixed md:left-4 md:top-4 md:flex md:flex-col md:gap-2 md:z-10">
          <Button onClick={() => setView('list')} className="bg-white text-foreground border border-muted">
            Back to List
          </Button>
        </div>

        <IncidentMap incidents={filtered} />

        <div className="fixed bottom-4 left-4 right-4 md:bottom-auto md:top-20 md:right-4 md:left-auto md:w-80">
          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-2">Assigned Tasks</h3>
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
            <p className="text-sm text-muted-foreground">Click on markers for details</p>
          </Card>
        </div>
      </div>
    )
  }

  if (view === 'detail' && selectedTicket) {
    const validTransitions = getValidTransitions(selectedTicket.status)

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Button onClick={() => setView('list')} className="mb-4 bg-white text-foreground border border-muted">
            ← Back to Tasks
          </Button>

          <Card className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-foreground">{selectedTicket.title}</h1>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${getPriorityColor(selectedTicket.severity)}`}>
                  {selectedTicket.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-muted-foreground">{selectedTicket.ticketNumber}</p>
            </div>

            {/* Quick Actions */}
            {selectedTicket.status === 'assigned' && (
              <Button
                onClick={() => handleAcceptTicket(selectedTicket)}
                className="w-full mb-6 py-3 bg-secondary text-secondary-foreground"
              >
                Accept & Start Work
              </Button>
            )}

            {/* Status Transitions */}
            {validTransitions.length > 0 && selectedTicket.status !== 'assigned' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-foreground mb-3">Update Status:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {validTransitions.map((status) => (
                    <Button
                      key={status}
                      onClick={() => handleStatusTransition(selectedTicket, status)}
                      className="py-2 bg-primary/20 text-primary border border-primary hover:bg-primary/30"
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-foreground mt-1">{selectedTicket.description}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="text-foreground">{selectedTicket.location}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="text-foreground mt-1 capitalize">{selectedTicket.category.replace('_', ' ')}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="text-foreground mt-1 capitalize">{selectedTicket.status.replace('_', ' ')}</p>
              </div>

              {selectedTicket.estimatedCompletion && (
                <div>
                  <p className="text-sm text-muted-foreground">Est. Completion</p>
                  <p className="text-foreground mt-1">{new Date(selectedTicket.estimatedCompletion).toLocaleDateString()}</p>
                </div>
              )}

              {selectedTicket.onHoldReason && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Hold Reason</p>
                  <p className="text-foreground mt-1">{selectedTicket.onHoldReason}</p>
                </div>
              )}
            </div>

            {/* Images */}
            {selectedTicket.images.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-foreground mb-3">Reported Photos ({selectedTicket.images.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedTicket.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img || "/placeholder.svg"}
                      alt={`Incident ${idx}`}
                      className="w-full h-24 object-cover rounded border border-muted"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="border-t border-muted pt-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Progress Notes
              </h3>

              {selectedTicket.comments.map((comment) => (
                <div key={comment.id} className="mb-4 p-3 bg-muted rounded">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground text-sm">{comment.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-foreground">{comment.content}</p>
                </div>
              ))}

              <div className="flex gap-2">
                <Textarea
                  placeholder="Add progress note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleAddComment(selectedTicket)}
                  className="bg-primary text-primary-foreground"
                >
                  Add Note
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">My Assigned Tasks</h1>
            <p className="text-muted-foreground mt-2">नमस्ते, {currentUser.name}! 🙏 Your work dashboard</p>
          </div>
          <Button onClick={onLogout} className="w-full md:w-auto bg-destructive text-destructive-foreground">
            Logout
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6 md:gap-4">
          <Button
            onClick={() => setView('list')}
            className={`flex-1 md:flex-none ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground border border-muted'}`}
          >
            List View
          </Button>
          <Button
            onClick={() => setView('map')}
            className={`flex-1 md:flex-none ${view === 'map' ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground border border-muted'}`}
          >
            Map View
          </Button>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'all')}
            className="w-full md:w-64 px-4 py-2 border border-muted rounded-lg bg-white text-foreground"
          >
            <option value="all">All Tasks</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold text-foreground">{assignedTickets.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-primary">
              {assignedTickets.filter((t) => t.status === 'in_progress').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">On Hold</p>
            <p className="text-2xl font-bold text-yellow-600">
              {assignedTickets.filter((t) => t.status === 'on_hold').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-emerald-600">
              {assignedTickets.filter((t) => t.status === 'resolved').length}
            </p>
          </Card>
        </div>

        {/* Task List */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No tasks found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered
              .sort((a, b) => {
                const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
                return severityOrder[a.severity as keyof typeof severityOrder] -
                  severityOrder[b.severity as keyof typeof severityOrder]
              })
              .map((ticket) => (
                <Card
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket)
                    setView('detail')
                  }}
                  className="p-4 cursor-pointer hover:shadow-lg transition border-l-4 border-primary"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-foreground">{ticket.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${getPriorityColor(ticket.severity)}`}>
                          {ticket.severity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{ticket.ticketNumber}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{ticket.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs rounded-full font-bold ${
                        ticket.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : ticket.status === 'on_hold'
                            ? 'bg-yellow-100 text-yellow-800'
                            : ticket.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-orange-100 text-orange-800'
                      }`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      {ticket.status === 'assigned' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {ticket.estimatedCompletion && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.estimatedCompletion).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
