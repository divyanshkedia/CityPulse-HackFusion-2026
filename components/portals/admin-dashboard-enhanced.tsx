'use client'

import { useState } from 'react'
import { User, Ticket, TicketStatus, OfficerMetrics } from '@/lib/types'
import { storage } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { calculateOfficerMetrics, calculateCityAnalytics } from '@/lib/analytics'
import { BatchProcessor } from '@/lib/batch-processor'
import { TimeSeriesChart, CategoryDistributionChart, SeverityDistributionChart } from '@/components/charts/incident-charts'
import IncidentMap from '@/components/map/incident-map'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Users, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react'

interface AdminDashboardEnhancedProps {
  currentUser: User
  onLogout: () => void
}

export default function AdminDashboardEnhanced({ currentUser, onLogout }: AdminDashboardEnhancedProps) {
  const [tickets, setTickets] = useState(storage.getTickets())
  const [users, setUsers] = useState(storage.getUsers())
  const [view, setView] = useState<'overview' | 'performance' | 'batch' | 'compliance'>('overview')
  const [selectedOfficers, setSelectedOfficers] = useState<string[]>([])
  const [batchAction, setBatchAction] = useState<'status' | 'assign' | 'category'>('status')
  const [batchValue, setBatchValue] = useState('')

  const analytics = calculateCityAnalytics(tickets)

  // Get officer metrics
  const officers: OfficerMetrics[] = users
    .filter((u) => u.role === 'field_staff' || u.role === 'officer')
    .map((u) => calculateOfficerMetrics(u.id, u.name, tickets))

  const handleBatchProcess = async () => {
    if (selectedOfficers.length === 0) {
      alert('Select at least one ticket')
      return
    }

    const processor = new BatchProcessor()
    let operation

    switch (batchAction) {
      case 'status':
        operation = await processor.processBatchStatusUpdate(selectedOfficers, batchValue, new Map(tickets.map((t) => [t.id, t])), currentUser.id)
        break
      case 'assign':
        operation = await processor.processBatchAssign(selectedOfficers, batchValue, new Map(tickets.map((t) => [t.id, t])), currentUser.id)
        break
      case 'category':
        operation = await processor.processBatchCategoryChange(selectedOfficers, batchValue, new Map(tickets.map((t) => [t.id, t])), currentUser.id)
        break
    }

    if (operation) {
      alert(`Batch operation completed. Processed: ${operation.processedCount}/${selectedOfficers.length}`)
      setTickets(storage.getTickets())
      setSelectedOfficers([])
    }
  }

  const handleExportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      tickets: tickets,
      analytics: analytics,
      officerMetrics: officers,
      totalRecords: tickets.length,
    }

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2)))
    element.setAttribute('download', `citypulse-report-${new Date().toISOString().split('T')[0]}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (view === 'performance') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Button onClick={() => setView('overview')} className="mb-6 bg-white text-foreground border border-muted">
            ← Back to Overview
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Officer Performance Metrics</h1>
          <p className="text-muted-foreground mb-8">Track individual and team productivity</p>

          {/* Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officers.map((officer) => (
              <Card key={officer.userId} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{officer.userName}</h3>
                    <p className="text-sm text-muted-foreground">Performance Rating</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{officer.overallRating.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">/ 5.0</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm text-foreground">Tasks Assigned</span>
                    <span className="font-bold text-foreground">{officer.ticketsAssigned}</span>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-emerald-50 rounded border border-emerald-200">
                    <span className="text-sm text-foreground">Completed</span>
                    <span className="font-bold text-emerald-700">{officer.ticketsCompleted}</span>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200">
                    <span className="text-sm text-foreground">In Progress</span>
                    <span className="font-bold text-blue-700">{officer.tasksInProgress}</span>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded border border-yellow-200">
                    <span className="text-sm text-foreground">On Hold</span>
                    <span className="font-bold text-yellow-700">{officer.tasksOnHold}</span>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded border border-orange-200">
                    <span className="text-sm text-foreground">Avg Time (hrs)</span>
                    <span className="font-bold text-orange-700">{officer.averageResolutionTime}h</span>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-emerald-50 rounded border border-emerald-200">
                    <span className="text-sm text-foreground">On-Time %</span>
                    <span className="font-bold text-emerald-700">{officer.onTimeCompletion}%</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Performance Chart */}
          {officers.length > 0 && (
            <Card className="mt-8 p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Team Performance Comparison</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={officers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="userName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ticketsCompleted" fill="#20B997" name="Completed" />
                  <Bar dataKey="tasksInProgress" fill="#FFB74D" name="In Progress" />
                  <Bar dataKey="onTimeCompletion" fill="#FF6B3D" name="On-Time %" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      </div>
    )
  }

  if (view === 'batch') {
    const ticketsForBatch = tickets.filter((t) => t.status !== 'closed')

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => setView('overview')} className="mb-6 bg-white text-foreground border border-muted">
            ← Back to Overview
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Batch Processing</h1>
          <p className="text-muted-foreground mb-8">Perform bulk operations on multiple tickets</p>

          <Card className="p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Action Type</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['status', 'assign', 'category'].map((action) => (
                    <button
                      key={action}
                      onClick={() => setBatchAction(action as 'status' | 'assign' | 'category')}
                      className={`p-3 rounded-lg border font-semibold transition ${
                        batchAction === action
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-white text-foreground border-muted hover:border-primary'
                      }`}
                    >
                      {action === 'status'
                        ? 'Update Status'
                        : action === 'assign'
                          ? 'Assign To'
                          : 'Change Category'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {batchAction === 'status'
                    ? 'New Status'
                    : batchAction === 'assign'
                      ? 'Assign To Officer'
                      : 'New Category'}
                </label>
                {batchAction === 'status' ? (
                  <Select value={batchValue} onChange={(e) => setBatchValue(e.target.value)}>
                    <option value="">Select Status</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </Select>
                ) : batchAction === 'assign' ? (
                  <Select value={batchValue} onChange={(e) => setBatchValue(e.target.value)}>
                    <option value="">Select Officer</option>
                    {users
                      .filter((u) => u.role === 'field_staff' || u.role === 'officer')
                      .map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                  </Select>
                ) : (
                  <Select value={batchValue} onChange={(e) => setBatchValue(e.target.value)}>
                    <option value="">Select Category</option>
                    <option value="pothole">Pothole</option>
                    <option value="flooding">Flooding</option>
                    <option value="traffic_signal">Traffic Signal</option>
                    <option value="street_light">Street Light</option>
                    <option value="debris">Debris</option>
                    <option value="accident">Accident</option>
                    <option value="other">Other</option>
                  </Select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Select Tickets ({selectedOfficers.length})</label>
                <div className="border border-muted rounded-lg max-h-96 overflow-y-auto">
                  {ticketsForBatch.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3 border-b border-muted hover:bg-muted last:border-b-0 cursor-pointer flex items-center gap-3"
                      onClick={() => {
                        setSelectedOfficers((prev) =>
                          prev.includes(ticket.id) ? prev.filter((id) => id !== ticket.id) : [...prev, ticket.id],
                        )
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOfficers.includes(ticket.id)}
                        onChange={() => {}}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground">{ticket.ticketNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleBatchProcess}
                disabled={selectedOfficers.length === 0 || !batchValue}
                className="w-full py-3 bg-primary text-primary-foreground disabled:opacity-50"
              >
                Process {selectedOfficers.length} Ticket{selectedOfficers.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (view === 'compliance') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Button onClick={() => setView('overview')} className="mb-6 bg-white text-foreground border border-muted">
            ← Back to Overview
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Compliance & Audit Logs</h1>
          <p className="text-muted-foreground mb-8">Complete action history for compliance reporting</p>

          <div className="flex gap-4 mb-8">
            <Button onClick={handleExportJSON} className="bg-primary text-primary-foreground flex items-center gap-2">
              <Download className="w-4 h-4" /> Export JSON Report
            </Button>
          </div>

          <Card className="p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Actions</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tickets
                .flatMap((t) => t.audit.map((log) => ({ ...log, ticketId: t.id, ticketTitle: t.title })))
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 50)
                .map((log, idx) => (
                  <div key={idx} className="p-3 border border-muted rounded hover:bg-muted transition">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-foreground text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {log.actor} ({log.actorRole}) - {log.ticketTitle}
                    </p>
                    {log.fieldChanged && (
                      <p className="text-xs text-primary mt-1">
                        {log.fieldChanged}: {JSON.stringify(log.oldValue)} → {JSON.stringify(log.newValue)}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Overview
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">स्वागत है, {currentUser.name}! 🙏 Complete system overview</p>
          </div>
          <Button onClick={onLogout} className="w-full md:w-auto bg-destructive text-destructive-foreground">
            Logout
          </Button>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: AlertCircle },
            { id: 'performance', label: 'Performance', icon: Users },
            { id: 'batch', label: 'Batch Ops', icon: TrendingUp },
            { id: 'compliance', label: 'Compliance', icon: CheckCircle },
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              onClick={() => setView(id as any)}
              className={`flex items-center gap-2 ${
                view === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-foreground border border-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Incidents</p>
                <p className="text-3xl font-bold text-foreground">{analytics.totalIncidents}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Critical Areas</p>
                <p className="text-3xl font-bold text-foreground">{analytics.criticalAreas.length}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-destructive" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Avg Resolution</p>
                <p className="text-3xl font-bold text-foreground">{Math.round(analytics.averageResolutionTime)}h</p>
              </div>
              <Clock className="w-12 h-12 text-secondary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Duplicate Rate</p>
                <p className="text-3xl font-bold text-foreground">{Math.round(analytics.duplicateRate)}%</p>
              </div>
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <TimeSeriesChart analytics={analytics} />
          </Card>
          <Card className="p-6">
            <CategoryDistributionChart analytics={analytics} />
          </Card>
          <Card className="p-6 lg:col-span-2">
            <SeverityDistributionChart analytics={analytics} />
          </Card>
        </div>

        {/* Map */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Geographic Distribution</h2>
          <IncidentMap incidents={tickets} />
        </Card>
      </div>
    </div>
  )
}
