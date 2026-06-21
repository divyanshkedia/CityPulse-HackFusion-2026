'use client'

import { useState, useEffect } from 'react'
import { User, Ticket, IncidentCategory, Severity } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'
import { fetchTickets, fetchAuditLogs } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TimeSeriesChart, CategoryDistributionChart, SeverityDistributionChart } from '@/components/charts/incident-charts'
import IncidentMap from '@/components/map/incident-map'
import { Brain, TrendingUp, Users, AlertCircle, CheckCircle, Clock, Download, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Activity } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { calculateCityAnalytics } from '@/lib/analytics'
import autoTable from 'jspdf-autotable'
const supabase = getSupabase()
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Potholes Detected</label>
          <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {mlData?.num_potholes || ticket.detection_count || 0}
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Risk Score</label>
          <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {Math.round((mlData?.risk_score || ticket.ml_confidence_score || 0) * 100)}%
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="text-gray-600">Coverage Ratio</label>
            <span className="font-medium">
              {((mlData?.coverage_ratio || ticket.coverage_ratio || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={(mlData?.coverage_ratio || ticket.coverage_ratio || 0) * 100} 
            className="h-2" 
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="text-gray-600">Lane Impact</label>
            <span className="font-medium">
              {((mlData?.lane_impact_ratio || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={(mlData?.lane_impact_ratio || 0) * 100} 
            className="h-2" 
          />
        </div>
      </div>
      
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
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'overview' | 'ml-analysis' | 'compliance'>('overview')

  // 2. DATA FETCHING & REALTIME SUBSCRIPTION
  const loadData = async () => {
    setLoading(true)
    const [ticketsData, auditData] = await Promise.all([
      fetchTickets(),
      fetchAuditLogs()
    ])
    setTickets(ticketsData)  
    setAuditLogs(auditData)
    setLoading(false)
  }

  useEffect(() => {
    // Initial Load
    loadData()

    // Realtime Subscription for incidents
    const incidentsChannel = supabase
      .channel('admin-incidents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchTickets().then(setTickets)
      })
      .subscribe()

    // Realtime Subscription for audit logs
    const auditChannel = supabase
      .channel('admin-audit-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        fetchAuditLogs().then(setAuditLogs)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(incidentsChannel)
      supabase.removeChannel(auditChannel)
    }
  }, [])

  // Analytics Calculations
  const analytics = calculateCityAnalytics(tickets)

  const handleExportPDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.text('CityPulse Compliance Report', 20, 20)
    
    // Report Details
    doc.setFontSize(12)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35)
    doc.text(`Total Incidents: ${tickets.length}`, 20, 45)
    
    // Summary Section
    doc.setFontSize(16)
    doc.text('System Summary', 20, 60)
    
    const summaryData = [
      ['Open Incidents', tickets.filter(t => t.status === 'open').length],
      ['In Progress', tickets.filter(t => t.status === 'in_progress').length],
      ['Resolved', tickets.filter(t => t.status === 'resolved').length],
      ['Closed', tickets.filter(t => t.status === 'closed').length],
      ['Critical Severity', tickets.filter(t => t.severity === 'critical').length],
      ['High Severity', tickets.filter(t => t.severity === 'high').length]
    ]
    
    autoTable(doc, {
      startY: 65,
      head: [['Status', 'Count']],
      body: summaryData,
      theme: 'striped'
    })
    
    // Recent Activity Section
    const allLogs = [
      ...auditLogs,
      ...tickets.flatMap((t) => t.audit.map((log) => ({ ...log, ticketId: t.id, ticketTitle: t.title })))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    const activityData = allLogs.slice(0, 20).map(log => [
      new Date(log.timestamp).toLocaleDateString(),
      log.actor,
      log.action,
      log.ticketTitle?.substring(0, 30) || 'N/A'
    ])
    
    // Get the Y position after the first table
    const finalY = (doc as any).lastAutoTable?.finalY || 65
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Actor', 'Action', 'Ticket']],
      body: activityData,
      theme: 'grid'
    })
    
    // Save PDF
    doc.save(`citypulse-compliance-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Function to get category label
  const getCategoryLabel = (category: string): string => {
    const categories: Record<string, string> = {
      'pothole': 'Pothole',
      'flooding': 'Flooding',
      'traffic_signal': 'Traffic Signal',
      'street_light': 'Street Light',
      'debris': 'Debris',
      'accident': 'Accident',
      'other': 'Other'
    }
    return categories[category] || category
  }

  // Function to get readable severity label
  const getSeverityLabel = (severity: Severity): string => {
    const severityMap: Record<Severity, string> = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'critical': 'Critical'
    }
    return severityMap[severity] || severity
  }

  // Function to get confidence percentage from various sources
  const getConfidencePercentage = (ticket: Ticket): number => {
    // First check ml_confidence_score field (stored as decimal 0.0-1.0)
    if (ticket.ml_confidence_score !== undefined && ticket.ml_confidence_score !== null) {
      // If it's already a percentage (like 85), just return it
      if (ticket.ml_confidence_score > 1) {
        return Math.round(ticket.ml_confidence_score)
      }
      // If it's a decimal (like 0.85), convert to percentage
      return Math.round(ticket.ml_confidence_score * 100)
    }
    
    // Then check ml_analysis object
    if (ticket.ml_analysis) {
      // Check risk_score (might be stored as decimal)
      if (ticket.ml_analysis.risk_score !== undefined) {
        if (ticket.ml_analysis.risk_score > 1) {
          return Math.round(ticket.ml_analysis.risk_score)
        }
        return Math.round(ticket.ml_analysis.risk_score * 100)
      }
    }
    
    return 0 // Default to 0 if no confidence data
  }

  // Function to get coverage ratio percentage
  const getCoveragePercentage = (ticket: Ticket): number => {
    // First check coverage_ratio field
    if (ticket.coverage_ratio !== undefined && ticket.coverage_ratio !== null) {
      if (ticket.coverage_ratio > 1) {
        return Math.round(ticket.coverage_ratio)
      }
      return Math.round(ticket.coverage_ratio * 100)
    }
    
    // Then check ml_analysis object
    if (ticket.ml_analysis?.coverage_ratio !== undefined) {
      if (ticket.ml_analysis.coverage_ratio > 1) {
        return Math.round(ticket.ml_analysis.coverage_ratio)
      }
      return Math.round(ticket.ml_analysis.coverage_ratio * 100)
    }
    
    return 0 // Default to 0 if no coverage data
  }

  // --- VIEW: ML ANALYSIS ---
  if (view === 'ml-analysis') {
    // Filter tickets that have ML analysis or confidence score
    const mlTickets = tickets.filter(t => t.ml_analysis || t.ml_confidence_score)
    
    // Calculate average confidence across all ML tickets
    const avgConfidence = mlTickets.length > 0 
      ? Math.round(mlTickets.reduce((sum, t) => sum + getConfidencePercentage(t), 0) / mlTickets.length)
      : 0
    
    // Calculate average coverage
    const avgCoverage = mlTickets.length > 0
      ? Math.round(mlTickets.reduce((sum, t) => sum + getCoveragePercentage(t), 0) / mlTickets.length)
      : 0
    
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
                  <p className="text-muted-foreground text-sm">Critical Severity</p>
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
                  <p className="text-muted-foreground text-sm">Avg Confidence</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {avgConfidence}%
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-orange-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Avg Coverage</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {avgCoverage}%
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
              {mlTickets.map((ticket) => {
                const confidencePercentage = getConfidencePercentage(ticket)
                const coveragePercentage = getCoveragePercentage(ticket)
                
                return (
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
                          {getSeverityLabel(ticket.severity)}
                        </div>
                        <div className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis Results - SHOWING THE 4 REQUIRED FIELDS */}
                    <div className="border-t border-b border-gray-200 py-4 my-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-foreground">AI Analysis Results</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* 1. Severity */}
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">
                            {getSeverityLabel(ticket.severity)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Severity</p>
                        </div>
                        
                        {/* 2. Primary Issue (Category) */}
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">
                            {getCategoryLabel(ticket.category)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Primary Issue</p>
                        </div>
                        
                        
                        {/* 4. Coverage Ratio */}
                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                          <p className="text-2xl font-bold text-emerald-600">
                            {coveragePercentage}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Coverage Ratio</p>
                        </div>
                      </div>
                    </div>

                    {/* Additional ML Data (if available) */}
                    {(ticket.ml_analysis?.num_potholes || ticket.detection_count) && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Additional ML Data</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {ticket.ml_analysis?.num_potholes && (
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm">Potholes Detected</span>
                              <span className="font-bold">{ticket.ml_analysis.num_potholes}</span>
                            </div>
                          )}
                          {ticket.detection_count && (
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm">Detection Count</span>
                              <span className="font-bold">{ticket.detection_count}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- VIEW: COMPLIANCE ---
  if (view === 'compliance') {
    // Combine audit logs from both dedicated table and ticket audit arrays
    const allLogs = [
      ...auditLogs,
      ...tickets.flatMap((t) => t.audit.map((log) => ({ ...log, ticketId: t.id, ticketTitle: t.title })))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Button onClick={() => setView('overview')} className="mb-6 bg-white text-foreground border border-muted">
            ← Back to Overview
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Compliance & Audit Logs</h1>
          <p className="text-muted-foreground mb-8">Complete action history for compliance reporting</p>

          <div className="flex gap-4 mb-8">
            <Button onClick={handleExportPDF} className="bg-primary text-primary-foreground flex items-center gap-2">
              <Download className="w-4 h-4" /> Export PDF Report
            </Button>
          </div>

          <Card className="p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Activities ({allLogs.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allLogs.slice(0, 50).map((log, idx) => (
                <div key={idx} className="p-3 border border-muted rounded hover:bg-muted transition">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-foreground text-sm">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.actor} ({log.actorRole}) - {log.ticketTitle || 'System Action'}
                  </p>
                  {log.fieldChanged && (
                    <p className="text-xs text-primary mt-1">
                      {log.fieldChanged}: {JSON.stringify(log.oldValue)} → {JSON.stringify(log.newValue)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {allLogs.length > 50 && (
              <p className="text-center text-muted-foreground text-sm mt-4">
                Showing 50 most recent activities of {allLogs.length} total
              </p>
            )}
          </Card>
        </div>
      </div>
    )
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
          </div>
          <div className="flex gap-2">
            <Button onClick={onLogout} className="bg-destructive text-destructive-foreground">
              Logout
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: AlertCircle },
            { id: 'ml-analysis', label: 'AI Analysis', icon: Brain },
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