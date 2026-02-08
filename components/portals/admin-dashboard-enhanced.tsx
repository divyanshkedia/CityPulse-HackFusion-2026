'use client'

import { useState, useEffect } from 'react'
import { User, Ticket, OfficerMetrics } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { fetchTickets, updateTicketStatus } from '@/lib/api' // Ensure these are exported from lib/api
import { storage } from '@/lib/storage' // Keeping storage only for static users/officers
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { calculateOfficerMetrics, calculateCityAnalytics } from '@/lib/analytics'
import { TimeSeriesChart, CategoryDistributionChart, SeverityDistributionChart } from '@/components/charts/incident-charts'
import IncidentMap from '@/components/map/incident-map'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Brain, TrendingUp, Users, AlertCircle, CheckCircle, Clock, Download, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AdminDashboardEnhancedProps {
  currentUser: User
  onLogout: () => void
}

interface TicketMLAnalysisViewProps {
  ticket: Ticket;
}

export function TicketMLAnalysisView({ ticket }: TicketMLAnalysisViewProps) {
  // Check if this ticket has ML analysis
  if (!ticket.ml_analysis && !ticket.ml_confidence_score) {
    return null;
  }

  const mlData = ticket.ml_analysis;
  
  return (
    <Card className="p-6 border-purple-200 bg-purple-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" /> 
          AI Analysis Results
        </h3>
        <Badge className={
          ticket.severity === 'critical' ? 'bg-red-600' :
          ticket.severity === 'high' ? 'bg-orange-600' :
          ticket.severity === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
        }>
          AI Severity: {ticket.severity.toUpperCase()}
        </Badge>
      </div>
      
      {/* Annotated Image */}
      {ticket.annotated_image_url && (
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            AI Detection Preview
          </label>
          <img 
            src={ticket.annotated_image_url} 
            alt="AI Analysis" 
            className="w-full max-h-96 object-contain rounded-lg border border-gray-300"
          />
        </div>
      )}
      
      {/* Analysis Metrics */}
      {mlData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Potholes Detected</label>
            <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {mlData.num_potholes || mlData.detection_count || 0}
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Risk Score</label>
            <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {Math.round((mlData.risk_score || ticket.ml_confidence_score || 0) * 100)}%
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="text-gray-600">Coverage Ratio</label>
              <span className="font-medium">
                {((mlData.coverage_ratio || ticket.coverage_ratio || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={(mlData.coverage_ratio || ticket.coverage_ratio || 0) * 100} 
              className="h-2" 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="text-gray-600">Lane Impact</label>
              <span className="font-medium">
                {((mlData.lane_impact_ratio || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={(mlData.lane_impact_ratio || 0) * 100} 
              className="h-2" 
            />
          </div>
        </div>
      )}
      
      {/* AI Confidence Note */}
      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This severity was automatically determined by our AI system based on
          pothole detection, road coverage analysis, and lane impact assessment.
        </p>
      </div>
    </Card>
  );
}

export default function AdminDashboardEnhanced({ currentUser, onLogout }: AdminDashboardEnhancedProps) {
  // 1. STATE: Start with empty array, fill via Supabase
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  
  // Static users for dropdowns (assuming users don't change often during demo)
  const [users] = useState(storage.getUsers()) 
  
  const [view, setView] = useState<'overview' | 'performance' | 'batch' | 'compliance' | 'ml-analysis'>('ml-analysis')
  const [selectedOfficers, setSelectedOfficers] = useState<string[]>([])
  const [batchAction, setBatchAction] = useState<'status' | 'assign' | 'category'>('status')
  const [batchValue, setBatchValue] = useState('')

  // 2. DATA FETCHING & REALTIME SUBSCRIPTION
  const loadData = async () => {
    setLoading(true)
    const data = await fetchTickets()
    setTickets(data)  
    setLoading(false)
  }

  useEffect(() => {
    // Initial Load
    loadData()

    // Realtime Subscription
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
        console.log('Realtime update received:', payload)
        // Re-fetch to ensure clean state
        fetchTickets().then(setTickets) 
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Analytics Calculations
  const analytics = calculateCityAnalytics(tickets)

  // Officer Metrics
  const officers: OfficerMetrics[] = users
    .filter((u) => u.role === 'field_staff' || u.role === 'officer')
    .map((u) => calculateOfficerMetrics(u.id, u.name, tickets))

  // 3. BATCH PROCESSING (Fixed to use Supabase)
  const handleBatchProcess = async () => {
    if (selectedOfficers.length === 0) {
      alert('Select at least one ticket')
      return
    }
    if (!batchValue) {
      alert('Please select a value to apply')
      return
    }

    try {
      const updates = selectedOfficers.map(async (ticketId) => {
        if (batchAction === 'status') {
          // Using the API function defined in lib/api.ts
          return updateTicketStatus(ticketId, batchValue as any, currentUser.name)
        }
        
        // Handle other batch types (assign/category) via generic update
        const updatePayload: any = {}
        if (batchAction === 'assign') updatePayload.assigned_to = batchValue
        if (batchAction === 'category') updatePayload.category = batchValue

        const { error } = await supabase
          .from('incidents')
          .update(updatePayload)
          .eq('id', ticketId)
        
        if (error) throw error
      })

      await Promise.all(updates)
      
      alert(`Successfully processed ${selectedOfficers.length} tickets.`)
      
      // Reset selection and refresh
      setSelectedOfficers([])
      loadData()
      
    } catch (error) {
      console.error('Batch process failed:', error)
      alert('Failed to process batch operations.')
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

  // --- VIEW: PERFORMANCE ---
  if (view === 'performance') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Button onClick={() => setView('overview')} className="mb-6 bg-white text-foreground border border-muted">
            ← Back to Overview
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Officer Performance Metrics</h1>
          <p className="text-muted-foreground mb-8">Track individual and team productivity</p>

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
                </div>
              </Card>
            ))}
          </div>

          {officers.length > 0 && (
            <Card className="mt-8 p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Team Performance Comparison</h2>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={officers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="userName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ticketsCompleted" fill="#20B997" name="Completed" />
                    <Bar dataKey="tasksInProgress" fill="#FFB74D" name="In Progress" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // --- VIEW: BATCH PROCESSING ---
  if (view === 'batch') {
    const ticketsForBatch = tickets.filter((t) => t.status !== 'closed')

    // Helper class for Native Selects to match Shadcn UI
    const selectClass = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

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
                      onClick={() => {
                        setBatchAction(action as any)
                        setBatchValue('') // Reset value on type change
                      }}
                      className={`p-3 rounded-lg border font-semibold transition ${
                        batchAction === action
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-white text-foreground border-muted hover:border-primary'
                      }`}
                    >
                      {action === 'status' ? 'Update Status' : action === 'assign' ? 'Assign To' : 'Change Category'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="batch-value-select" className="block text-sm font-semibold text-foreground mb-2">
                  {batchAction === 'status' ? 'New Status' : batchAction === 'assign' ? 'Assign To Officer' : 'New Category'}
                </label>
                
                {/* FIXED: Using native select for correct event handling and type safety */}
                <select 
                  id="batch-value-select"
                  value={batchValue} 
                  onChange={(e) => setBatchValue(e.target.value)}
                  className={selectClass}
                  aria-label="Select batch value"
                >
                  <option value="">Select Value...</option>
                  
                  {batchAction === 'status' && (
                    <>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="on_hold">On Hold</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </>
                  )}

                  {batchAction === 'assign' && users
                    .filter((u) => u.role === 'field_staff' || u.role === 'officer')
                    .map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))
                  }

                  {batchAction === 'category' && (
                    <>
                      <option value="pothole">Pothole</option>
                      <option value="flooding">Flooding</option>
                      <option value="traffic_signal">Traffic Signal</option>
                      <option value="street_light">Street Light</option>
                      <option value="debris">Debris</option>
                      <option value="accident">Accident</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
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
                        onChange={() => {}} // Handled by div click
                        className="w-4 h-4"
                        aria-label={`Select ticket ${ticket.ticketNumber}`}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground">{ticket.ticketNumber} - {ticket.status}</p>
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

  // --- VIEW: COMPLIANCE ---
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

  // ADD THIS TO admin-dashboard-enhanced.tsx 
// Add this as a new view option in the navigation

// In the navigation section, add:
// { id: 'ml-analysis', label: 'AI Analysis', icon: Brain }

// Then add this view at the end of the component, before the final return:

// --- VIEW: ML ANALYSIS ---
if (view === 'ml-analysis') {
  const mlTickets = tickets.filter(t => t.ml_analysis || t.ml_confidence_score);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => setView('overview')} className="mb-6 bg-white text-foreground border border-muted">
          ← Back to Overview
        </Button>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Brain className="w-8 h-8 text-purple-600" />
          AI-Analyzed Incidents
        </h1>
        <p className="text-muted-foreground mb-8">
          Review incidents analyzed by our machine learning model
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total AI Analyzed</p>
                <p className="text-3xl font-bold text-purple-600">{mlTickets.length}</p>
              </div>
              <Brain className="w-12 h-12 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Critical (AI)</p>
                <p className="text-3xl font-bold text-red-600">
                  {mlTickets.filter(t => t.severity === 'critical').length}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Avg Potholes</p>
                <p className="text-3xl font-bold text-orange-600">
                  {mlTickets.length > 0 
                    ? Math.round(mlTickets.reduce((sum, t) => sum + (t.ml_analysis?.num_potholes || t.detection_count || 0), 0) / mlTickets.length)
                    : 0}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-orange-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Avg Risk Score</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {mlTickets.length > 0
                    ? Math.round(mlTickets.reduce((sum, t) => sum + ((t.ml_analysis?.risk_score || t.ml_confidence_score || 0) * 100), 0) / mlTickets.length)
                    : 0}%
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
          </Card>
        </div>

        {/* ML Analyzed Tickets */}
        {mlTickets.length === 0 ? (
          <Card className="p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No AI-analyzed incidents yet</p>
            <p className="text-gray-400 text-sm">Citizens can report potholes with photos for automatic analysis</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {mlTickets.map((ticket) => (
              <Card key={ticket.id} className="p-6 hover:shadow-lg transition-shadow">
                {/* Ticket Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{ticket.title}</h3>
                    <p className="text-sm text-muted-foreground">{ticket.ticketNumber} • {ticket.location}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reported by {ticket.reported_by} • {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      ticket.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      ticket.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      ticket.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      AI: {ticket.severity.toUpperCase()}
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                      {ticket.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* AI Analysis Results */}
                <div className="border-t border-b border-gray-200 py-4 my-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-foreground">AI Analysis Results</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {ticket.ml_analysis?.num_potholes || ticket.detection_count || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Potholes Detected</p>
                    </div>
                    
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.round((ticket.ml_analysis?.risk_score || ticket.ml_confidence_score || 0) * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Risk Score</p>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round((ticket.ml_analysis?.coverage_ratio || ticket.coverage_ratio || 0) * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Coverage Ratio</p>
                    </div>
                    
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">
                        {Math.round((ticket.ml_analysis?.lane_impact_ratio || 0) * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Lane Impact</p>
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Image */}
                  {ticket.images && ticket.images.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Original Image</p>
                      <img 
                        src={ticket.images[0]} 
                        alt="Original" 
                        className="w-full h-64 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                  
                  {/* Annotated Image */}
                  {ticket.annotated_image_url && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        AI Detection Overlay
                      </p>
                      <img 
                        src={ticket.annotated_image_url} 
                        alt="AI Analysis" 
                        className="w-full h-64 object-cover rounded-lg border border-purple-300"
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <Button 
                    onClick={() => {
                      // You can add navigation to detailed ticket view here
                      console.log('View ticket details:', ticket.id);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    View Full Details
                  </Button>
                  <Button 
                    onClick={() => {
                      // Add your ticket assignment logic here
                      console.log('Assign ticket:', ticket.id);
                    }}
                    className="flex-1 bg-primary"
                  >
                    Assign to Field Staff
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

  // --- VIEW: OVERVIEW (Default) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2">
              Admin Dashboard
              {loading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-muted-foreground mt-2">Welcome, {currentUser.name}! 🙏 Complete system overview</p>
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