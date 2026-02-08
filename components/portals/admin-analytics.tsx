'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  User, 
  Ticket, 
  IncidentCategory, 
  TicketStatus, 
  Severity,
  CATEGORY_LABELS, 
  SEVERITY_CONFIG, 
  STATUS_CONFIG 
} from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { fetchTickets } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import AuditTimeline from '@/components/tickets/audit-timeline'
import { Download, BarChart3, TrendingUp, Users, Calendar, RefreshCw, Brain } from 'lucide-react'

import './AdminAnalytics.css' // Import CSS file

interface AdminAnalyticsProps {
  currentUser: User
  onNavigate: (view: string) => void
  currentView: string
}

export default function AdminAnalytics({ currentUser, onNavigate, currentView }: AdminAnalyticsProps) {
  // 1. STATE: Live data from Supabase
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  // 2. DATA FETCHING
  const loadData = async () => {
    setLoading(true)
    const data = await fetchTickets()
    setTickets(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    // Realtime Subscription
    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchTickets().then(setTickets)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 3. DYNAMIC REPORT GENERATION (Replaces storage.generateReport)
  const report = useMemo(() => {
    const now = new Date()
    const periodStart = new Date()
    
    if (reportPeriod === 'daily') periodStart.setDate(now.getDate() - 1)
    if (reportPeriod === 'weekly') periodStart.setDate(now.getDate() - 7)
    if (reportPeriod === 'monthly') periodStart.setMonth(now.getMonth() - 1)

    // Filter tickets by period
    const periodTickets = tickets.filter(t => new Date(t.reportedAt) >= periodStart)
    const resolvedTickets = periodTickets.filter(t => t.status === 'resolved')
    
    // Calculate Stats
    const totalTickets = periodTickets.length
    const criticalTickets = periodTickets.filter(t => t.severity === 'critical').length
    const resolvedCount = resolvedTickets.length
    const inProgressTickets = periodTickets.filter(t => t.status === 'in_progress').length

    // Calculate Avg Resolution Time
    let totalResolutionTime = 0
    resolvedTickets.forEach(t => {
      if (t.resolved_at) {
        const start = new Date(t.reportedAt).getTime()
        const end = new Date(t.resolved_at).getTime()
        totalResolutionTime += (end - start) / (1000 * 60 * 60) // Hours
      }
    })
    const averageResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0

    // Breakdowns
    const categoryBreakdown: Record<string, number> = {}
    const statusBreakdown: Record<string, number> = {}
    const severityBreakdown: Record<string, number> = {}

    periodTickets.forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1
      statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1
      severityBreakdown[t.severity] = (severityBreakdown[t.severity] || 0) + 1
    })

    return {
      generatedAt: new Date().toISOString(),
      stats: {
        totalTickets,
        criticalTickets,
        resolvedTickets: resolvedCount,
        inProgressTickets,
        averageResolutionTime,
        fieldStaffUtilization: 85 // Mocked for now as we don't track hours per staff
      },
      categoryBreakdown,
      statusBreakdown,
      severityBreakdown
    }
  }, [tickets, reportPeriod])

  const allAuditLogs = tickets
    .flatMap((t) => t.audit.map(log => ({...log, ticketId: t.id, ticketTitle: t.title})))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const handleDownloadReport = () => {
    const reportData = {
      generatedAt: report.generatedAt,
      period: reportPeriod,
      stats: report.stats,
      categoryBreakdown: report.categoryBreakdown,
      severityBreakdown: report.severityBreakdown,
      statusBreakdown: report.statusBreakdown,
    }

    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `citypulse-report-${reportPeriod}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  // Helper function to calculate percentage width for progress bars
  const getPercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0
  }

  // --- VIEW: HOME ---
  if (currentView === 'home') {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto">
        {/* Header */}
        <Card className="bg-gradient-to-r from-primary to-secondary text-white p-6 md:p-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                Analytics & Compliance
                {loading && <RefreshCw className="h-5 w-5 animate-spin text-orange-200" />}
              </h2>
              <p className="text-orange-50">Real-time metrics, reporting, and audit logs</p>
            </div>
          </div>
        </Card>

        {/* Report Period Selector */}
        <div className="flex gap-2 flex-wrap">
          {['daily', 'weekly', 'monthly'].map((period) => (
            <Button
              key={period}
              onClick={() => setReportPeriod(period as any)}
              className={period === reportPeriod ? 'bg-primary text-white' : ''}
              variant={period === reportPeriod ? 'default' : 'outline'}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-4 md:p-6">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Incidents</p>
            <p className="text-2xl md:text-3xl font-bold text-primary">{report.stats.totalTickets}</p>
            <p className="text-xs mt-2 text-muted-foreground">Tracked this period</p>
          </Card>

          <Card className="p-4 md:p-6">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Critical Incidents</p>
            <p className="text-2xl md:text-3xl font-bold text-red-600">{report.stats.criticalTickets}</p>
            <p className="text-xs mt-2 text-muted-foreground">Require immediate action</p>
          </Card>

          <Card className="p-4 md:p-6">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Resolution Rate</p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-600">
              {report.stats.totalTickets > 0 
                ? ((report.stats.resolvedTickets / report.stats.totalTickets) * 100).toFixed(0) 
                : 0}%
            </p>
            <p className="text-xs mt-2 text-muted-foreground">{report.stats.resolvedTickets} resolved</p>
          </Card>

          <Card className="p-4 md:p-6">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Avg Resolution Time</p>
            <p className="text-2xl md:text-3xl font-bold text-orange-600">{report.stats.averageResolutionTime}h</p>
            <p className="text-xs mt-2 text-muted-foreground">From report to closure</p>
          </Card>
        </div>

        {/* Breakdown Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Breakdown */}
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              By Category
            </h3>
            <div className="space-y-3">
              {Object.entries(report.categoryBreakdown).map(([category, count]) => {
                const label = CATEGORY_LABELS[category as IncidentCategory]?.label || category
                const percentage = getPercentage(count, report.stats.totalTickets)
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm font-bold text-primary">{count}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className={`progress-bar-fill category-${category}`} data-width={percentage}>
                        <div className="sr-only">{percentage}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Status Breakdown */}
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              By Status
            </h3>
            <div className="space-y-3">
              {Object.entries(report.statusBreakdown).map(([status, count]) => {
                const label = STATUS_CONFIG[status as TicketStatus]?.label || status
                const percentage = getPercentage(count, report.stats.totalTickets)
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm font-bold text-secondary">{count}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className={`progress-bar-fill status-${status}`} data-width={percentage}>
                        <div className="sr-only">{percentage}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Severity Breakdown */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">By Severity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(report.severityBreakdown).map(([sev, count]) => {
              const label = SEVERITY_CONFIG[sev as Severity]?.label || sev
              return (
                <div key={sev} className="text-center">
                  <p className="text-2xl font-bold text-primary mb-1">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              )
            })}
          </div>
        </Card>
        
        {/* ML Analysis Metrics */}
{tickets.some(t => t.ml_analysis) && (
  <Card className="p-6 mt-4">
    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
      <Brain className="h-5 w-5 text-purple-600" />
      AI Analysis Insights
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {(() => {
        const mlTickets = tickets.filter(t => t.ml_analysis);
        const avgPotholes = mlTickets.length > 0 
          ? Math.round(mlTickets.reduce((sum, t) => sum + (t.ml_analysis?.num_potholes || 0), 0) / mlTickets.length)
          : 0;
        const avgConfidence = mlTickets.length > 0
          ? Math.round(mlTickets.reduce((sum, t) => sum + (t.ml_confidence_score || 0) * 100, 0) / mlTickets.length)
          : 0;
        const aiDetected = mlTickets.length;
        const aiAccuracy = "92%"; // Mocked for demo

        return (
          <>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 mb-1">{aiDetected}</p>
              <p className="text-xs text-muted-foreground">AI Analyzed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 mb-1">{avgPotholes}</p>
              <p className="text-xs text-muted-foreground">Avg Potholes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 mb-1">{avgConfidence}%</p>
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 mb-1">{aiAccuracy}</p>
              <p className="text-xs text-muted-foreground">AI Accuracy</p>
            </div>
          </>
        );
      })()}
    </div>
  </Card>
)}

        {/* Export */}
        <Card className="p-6 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <h3 className="font-bold text-foreground mb-1">Export Report</h3>
              <p className="text-sm text-muted-foreground">Download detailed analytics as JSON</p>
            </div>
            <Button onClick={handleDownloadReport} className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button onClick={() => onNavigate('audit')} variant="outline" className="h-12">
            <Users className="h-4 w-4 mr-2" />
            Audit Logs
          </Button>
          <Button onClick={() => onNavigate('reports')} variant="outline" className="h-12">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button onClick={() => onNavigate('analytics')} variant="outline" className="h-12">
            <TrendingUp className="h-4 w-4 mr-2" />
            Details
          </Button>
        </div>
      </div>
    )
  }

  // --- VIEW: AUDIT LOGS ---
  if (currentView === 'audit') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto overflow-y-auto space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Audit Logs</h2>
          <Button onClick={() => onNavigate('home')} variant="outline">
            ← Back to Dashboard
          </Button>
        </div>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-foreground">
            Total Activities: <span className="font-bold">{allAuditLogs.length}</span>
          </p>
        </Card>

        <AuditTimeline auditLogs={allAuditLogs.slice(0, 50)} />

        {allAuditLogs.length > 50 && (
          <Card className="p-4 text-center">
            <p className="text-muted-foreground">Showing 50 most recent activities</p>
          </Card>
        )}
      </div>
    )
  }

  // --- VIEW: REPORTS ---
  if (currentView === 'reports') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Reports</h2>
          <Button onClick={() => onNavigate('home')} variant="outline">
            ← Back
          </Button>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">Incident Report</h3>
              <p className="text-sm text-muted-foreground">Period: {reportPeriod}</p>
              <p className="text-sm text-muted-foreground">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
            </div>
            <Button onClick={handleDownloadReport} className="bg-primary hover:bg-orange-600 text-white">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 py-6 border-y border-border">
            <div>
              <p className="text-muted-foreground text-sm">Total Incidents</p>
              <p className="text-3xl font-bold text-primary">{report.stats.totalTickets}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Resolved</p>
              <p className="text-3xl font-bold text-emerald-600">{report.stats.resolvedTickets}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">In Progress</p>
              <p className="text-3xl font-bold text-orange-600">{report.stats.inProgressTickets}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Critical</p>
              <p className="text-3xl font-bold text-red-600">{report.stats.criticalTickets}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // --- VIEW: DETAILED ANALYTICS ---
  if (currentView === 'analytics') {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Detailed Analytics</h2>
          <Button onClick={() => onNavigate('home')} variant="outline">
            ← Back
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Analysis */}
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">Category Distribution</h3>
            <div className="space-y-4">
              {Object.entries(report.categoryBreakdown).map(([cat, count]) => {
                const label = CATEGORY_LABELS[cat as IncidentCategory]?.label || cat
                const percentage = getPercentage(count, report.stats.totalTickets)
                return (
                  <div key={cat}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className={`progress-bar-fill category-${cat}`} data-width={percentage}>
                        <div className="sr-only">{percentage}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Severity Analysis */}
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">Severity Distribution</h3>
            <div className="space-y-4">
              {Object.entries(report.severityBreakdown).map(([sev, count]) => {
                const label = SEVERITY_CONFIG[sev as Severity]?.label || sev
                const percentage = getPercentage(count, report.stats.totalTickets)
                return (
                  <div key={sev}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className={`progress-bar-fill severity-${sev}`} data-width={percentage}>
                        <div className="sr-only">{percentage}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{report.stats.averageResolutionTime}h</p>
              <p className="text-xs text-muted-foreground">Avg Resolution Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{report.stats.fieldStaffUtilization}%</p>
              <p className="text-xs text-muted-foreground">Staff Utilization</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {report.stats.totalTickets > 0 
                  ? ((report.stats.resolvedTickets / report.stats.totalTickets) * 100).toFixed(0) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Closure Rate</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return null
}