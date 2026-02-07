import { Ticket, CATEGORY_LABELS, SEVERITY_CONFIG, STATUS_CONFIG } from './types'

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Calculate time since
export function timeSince(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  
  return Math.floor(seconds) + ' seconds ago'
}

// Get category info
export function getCategoryInfo(category: string) {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || { label: 'Other', emoji: '⚠️' }
}

// Get severity info
export function getSeverityInfo(severity: string) {
  return SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Unknown' }
}

// Get status info
export function getStatusInfo(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Unknown' }
}

// Simple duplicate detection
export function detectDuplicates(newTicket: Ticket, existingTickets: Ticket[]): any[] {
  const matches = []
  const threshold = 0.8 // 80% similarity

  for (const ticket of existingTickets) {
    let similarity = 0
    
    // Check location proximity (within 100 meters)
    const distance = Math.sqrt(
      Math.pow(ticket.latitude - newTicket.latitude, 2) +
      Math.pow(ticket.longitude - newTicket.longitude, 2)
    )
    
    if (distance < 0.001) similarity += 0.4 // 40% for location
    
    // Check category match
    if (ticket.category === newTicket.category) similarity += 0.3
    
    // Check title similarity
    const titleWords = new Set(newTicket.title.toLowerCase().split(' '))
    const existingWords = new Set(ticket.title.toLowerCase().split(' '))
    const intersection = new Set([...titleWords].filter(x => existingWords.has(x)))
    const titleSimilarity = intersection.size / Math.max(titleWords.size, existingWords.size)
    similarity += titleSimilarity * 0.3
    
    if (similarity >= threshold) {
      matches.push({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        similarity: Math.round(similarity * 100),
        reason: distance < 0.001 ? 'Same location' : 'Similar issue'
      })
    }
  }
  
  return matches
}

// Calculate city analytics
export function calculateCityAnalytics(tickets: Ticket[]) {
  const total = tickets.length
  const open = tickets.filter(t => t.status === 'open').length
  const inProgress = tickets.filter(t => t.status === 'in_progress').length
  const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  const critical = tickets.filter(t => t.severity === 'critical').length
  
  // Mock critical areas
  const criticalAreas = tickets
    .filter(t => t.severity === 'critical')
    .slice(0, 3)
    .map(t => ({
      latitude: t.latitude,
      longitude: t.longitude,
      incidentCount: 1,
      severity: t.severity,
      category: t.category
    }))

  return {
    totalIncidents: total,
    openTickets: open,
    inProgressTickets: inProgress,
    resolvedTickets: resolved,
    criticalTickets: critical,
    averageResolutionTime: 24,
    criticalAreas,
    duplicateRate: 15,
    categoryDistribution: {
      pothole: tickets.filter(t => t.category === 'pothole').length,
      flooding: tickets.filter(t => t.category === 'flooding').length,
      traffic_signal: tickets.filter(t => t.category === 'traffic_signal').length,
      street_light: tickets.filter(t => t.category === 'street_light').length,
      debris: tickets.filter(t => t.category === 'debris').length,
      accident: tickets.filter(t => t.category === 'accident').length,
      other: tickets.filter(t => t.category === 'other').length
    },
    severityDistribution: {
      low: tickets.filter(t => t.severity === 'low').length,
      medium: tickets.filter(t => t.severity === 'medium').length,
      high: tickets.filter(t => t.severity === 'high').length,
      critical: tickets.filter(t => t.severity === 'critical').length
    }
  }
}