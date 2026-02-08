'use client'

import { useState, useEffect } from 'react'
import { User, Ticket, IncidentCategory, Severity, CATEGORY_LABELS } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { fetchTickets, createTicket } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import TicketCard from '@/components/tickets/ticket-card'
import AuditTimeline from '@/components/tickets/audit-timeline'
import { MapPin, Send, RefreshCw } from 'lucide-react'

interface CitizenPortalProps {
  currentUser: User
  onNavigate: (view: string) => void
  currentView: string
}

export default function CitizenPortal({ currentUser, onNavigate, currentView }: CitizenPortalProps) {
  // 1. STATE: Live data
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showReportForm, setShowReportForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pothole' as IncidentCategory,
    severity: 'medium' as Severity,
    location: '',
    latitude: 40.7128,
    longitude: -74.006,
  })

  // 2. DATA FETCHING
  const loadData = async () => {
    setLoading(true)
    const data = await fetchTickets()
    setTickets(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('citizen-portal-basic')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchTickets().then(setTickets)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const myReports = tickets.filter((t) => t.reportedBy === currentUser.name)

  // 3. ASYNC SUBMISSION
  const handleSubmitReport = async () => {
  if (!formData.title || !formData.description || !formData.location) {
    alert('Please fill in all required fields')
    return
  }

  try {
    const { error } = await createTicket({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      severity: formData.severity,
      location: formData.location,
      latitude: formData.latitude,
      longitude: formData.longitude,
      reportedBy: currentUser.name,
      images: [], // Keep empty for basic version
    })

    if (error) throw error

    // Reset form
    setFormData({
      title: '',
      description: '',
      category: 'pothole',
      severity: 'medium',
      location: '',
      latitude: 40.7128,
      longitude: -74.006,
    })
    alert('Incident reported successfully!')
    onNavigate('home') // Navigate back to home

  } catch (err) {
    console.error(err)
    alert('Failed to report incident')
  }
}

  // --- VIEW: HOME ---
  if (currentView === 'home') {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto">
        {/* Hero Card */}
        <Card className="bg-gradient-to-r from-primary to-orange-500 text-white p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
            Help Improve Our City
            {loading && <RefreshCw className="h-5 w-5 animate-spin text-white/80" />}
          </h2>
          <p className="text-orange-50 mb-4">Report infrastructure issues and help us create a safer community</p>
          <Button onClick={() => onNavigate('report')} className="bg-white text-primary hover:bg-orange-50">
            Report an Incident
          </Button>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-primary">{myReports.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Your Reports</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-emerald-600">{myReports.filter((t) => t.status === 'resolved').length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Resolved</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-orange-600">{myReports.filter((t) => t.status === 'in_progress').length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">In Progress</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-red-600">{myReports.filter((t) => t.severity === 'critical').length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Critical</p>
          </Card>
        </div>

        {/* Recent Reports */}
        <div>
          <h3 className="text-lg md:text-xl font-bold mb-4">Your Recent Reports</h3>
          {myReports.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">You haven't reported any incidents yet</p>
              <Button
                onClick={() => onNavigate('report')}
                className="mt-4 bg-primary hover:bg-orange-600"
              >
                Report Your First Incident
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {myReports.slice(0, 3).map((ticket) => (
                <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="cursor-pointer">
                  <TicketCard ticket={ticket} onClick={() => setSelectedTicket(ticket)} clickable />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- VIEW: REPORT FORM ---
  if (currentView === 'report') {
    const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto overflow-y-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => onNavigate('home')} className="mb-4">
            ← Back
          </Button>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Report an Incident</h2>
          <p className="text-muted-foreground mt-1">Help us identify and address issues quickly</p>
        </div>

        <Card className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="title-input">Incident Title *</label>
            <Input
              id="title-input"
              placeholder="Brief description of the issue"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full"
              aria-label="Incident title"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="category-select">Category *</label>
            <select
              id="category-select"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as IncidentCategory })}
              className={inputClass}
              aria-label="Incident category"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
                <option key={key} value={key}>
                  {emoji} {label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="severity-select">Severity Level *</label>
            <select 
              id="severity-select"
              value={formData.severity} 
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as Severity })}
              className={inputClass}
              aria-label="Incident severity"
            >
              <option value="low">Low - Minor inconvenience</option>
              <option value="medium">Medium - Notable issue</option>
              <option value="high">High - Significant hazard</option>
              <option value="critical">Critical - Immediate danger</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2" htmlFor="location-input">
              <MapPin className="h-4 w-4" />
              Location *
            </label>
            <Input
              id="location-input"
              placeholder="Street address or intersection"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full"
              aria-label="Location"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="description-input">Description *</label>
            <Textarea
              id="description-input"
              placeholder="Provide detailed information about the issue. What happened? When did you notice it? Any safety concerns?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              className="w-full"
              aria-label="Description"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmitReport}
            className="w-full bg-primary hover:bg-orange-600 text-white h-12 font-semibold flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            Submit Report
          </Button>
        </Card>
      </div>
    )
  }

  // --- VIEW: MY REPORTS ---
  if (currentView === 'my-reports') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">My Reports</h2>
          <Button onClick={() => onNavigate('report')} className="bg-primary hover:bg-orange-600 text-white">
            New Report
          </Button>
        </div>

        {selectedTicket ? (
          <TicketDetailView ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
        ) : (
          <>
            {myReports.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No reports yet</p>
                <Button onClick={() => onNavigate('report')} className="bg-primary hover:bg-orange-600 text-white">
                  Report an Incident
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {myReports.map((ticket) => (
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

  return null
}

function TicketDetailView({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onClose} className="mb-4">
        ← Back
      </Button>
      <Card className="p-6 space-y-6">
        <TicketCard ticket={ticket} expanded />
        {/* FIXED: Passing auditLogs prop correctly */}
        <AuditTimeline auditLogs={ticket.audit} />
      </Card>
    </div>
  )
}