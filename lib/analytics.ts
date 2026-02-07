import { Ticket, OfficerMetrics, CityAnalytics, GeoDataPoint, IncidentCategory, Severity } from './types'

export function calculateOfficerMetrics(userId: string, userName: string, tickets: Ticket[]): OfficerMetrics {
  const officerTickets = tickets.filter((t) => t.assignedTo === userName)

  const completed = officerTickets.filter((t) => t.status === 'resolved' || t.status === 'closed')
  const inProgress = officerTickets.filter((t) => t.status === 'in_progress')
  const onHold = officerTickets.filter((t) => t.status === 'on_hold')

  let totalResolutionTime = 0
  let onTimeCount = 0

  completed.forEach((ticket) => {
    const reportedTime = new Date(ticket.reportedAt).getTime()
    const resolvedTime = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : Date.now()
    const resolutionTime = (resolvedTime - reportedTime) / (1000 * 60 * 60) // hours
    totalResolutionTime += resolutionTime

    if (ticket.estimatedCompletion) {
      const estimatedTime = new Date(ticket.estimatedCompletion).getTime()
      if (resolvedTime <= estimatedTime) {
        onTimeCount++
      }
    }
  })

  const averageResolutionTime = completed.length > 0 ? totalResolutionTime / completed.length : 0
  const onTimeCompletion = completed.length > 0 ? (onTimeCount / completed.length) * 100 : 0

  // Calculate overall rating (0-5)
  const completionRate = officerTickets.length > 0 ? (completed.length / officerTickets.length) * 100 : 0
  const qualityScore = onTimeCompletion * 0.6 + completionRate * 0.4
  const overallRating = Math.min(5, (qualityScore / 100) * 5)

  return {
    userId,
    userName,
    ticketsAssigned: officerTickets.length,
    ticketsCompleted: completed.length,
    averageResolutionTime: Math.round(averageResolutionTime),
    onTimeCompletion: Math.round(onTimeCompletion),
    overallRating: Math.round(overallRating * 100) / 100,
    tasksInProgress: inProgress.length,
    tasksOnHold: onHold.length,
    duplicateDetection: 0,
  }
}

export function calculateCityAnalytics(tickets: Ticket[]): CityAnalytics {
  const activeTickets = tickets.filter((t) => t.status !== 'closed')

  // Geographic density
  const geoData = new Map<string, GeoDataPoint>()
  activeTickets.forEach((ticket) => {
    const key = `${Math.round(ticket.latitude * 10) / 10},${Math.round(ticket.longitude * 10) / 10}`
    if (geoData.has(key)) {
      const point = geoData.get(key)!
      point.incidentCount++
    } else {
      geoData.set(key, {
        latitude: ticket.latitude,
        longitude: ticket.longitude,
        incidentCount: 1,
        severity: ticket.severity,
        category: ticket.category,
      })
    }
  })

  const criticalAreas = Array.from(geoData.values())
    .filter((p) => p.incidentCount >= 3)
    .sort((a, b) => b.incidentCount - a.incidentCount)
    .slice(0, 10)

  // Duplicate rate
  const duplicates = tickets.filter((t) => t.isDuplicate).length
  const duplicateRate = tickets.length > 0 ? (duplicates / tickets.length) * 100 : 0

  // Average resolution time
  const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed')
  let totalTime = 0
  resolved.forEach((ticket) => {
    const reportedTime = new Date(ticket.reportedAt).getTime()
    const resolvedTime = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : Date.now()
    totalTime += (resolvedTime - reportedTime) / (1000 * 60 * 60) // hours
  })
  const averageResolutionTime = resolved.length > 0 ? totalTime / resolved.length : 0

  // Category distribution
  const categoryDist: Record<IncidentCategory, number> = {
    pothole: 0,
    flooding: 0,
    traffic_signal: 0,
    street_light: 0,
    debris: 0,
    accident: 0,
    other: 0,
  }
  activeTickets.forEach((ticket) => {
    categoryDist[ticket.category]++
  })

  // Severity distribution
  const severityDist: Record<Severity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }
  activeTickets.forEach((ticket) => {
    severityDist[ticket.severity]++
  })

  // Time series data (last 7 days)
  const timeSeriesData = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const dayTickets = tickets.filter((t) => t.reportedAt.startsWith(dateStr))
    const dayResolved = dayTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length

    timeSeriesData.push({
      date: dateStr,
      count: dayTickets.length,
      resolved: dayResolved,
    })
  }

  return {
    totalIncidents: activeTickets.length,
    criticalAreas,
    duplicateRate: Math.round(duplicateRate * 100) / 100,
    averageResolutionTime: Math.round(averageResolutionTime * 10) / 10,
    categoryDistribution: categoryDist,
    severityDistribution: severityDist,
    timeSeriesData,
  }
}

export function generateHeatmapData(tickets: Ticket[]): Array<{ lat: number; lng: number; weight: number }> {
  const dataPoints = new Map<string, { lat: number; lng: number; count: number }>()

  tickets
    .filter((t) => t.status !== 'closed')
    .forEach((ticket) => {
      const key = `${Math.round(ticket.latitude * 100) / 100},${Math.round(ticket.longitude * 100) / 100}`
      if (dataPoints.has(key)) {
        dataPoints.get(key)!.count++
      } else {
        dataPoints.set(key, {
          lat: ticket.latitude,
          lng: ticket.longitude,
          count: 1,
        })
      }
    })

  const maxCount = Math.max(...Array.from(dataPoints.values()).map((p) => p.count), 1)

  return Array.from(dataPoints.values()).map((point) => ({
    lat: point.lat,
    lng: point.lng,
    weight: point.count / maxCount,
  }))
}

export function generateTimeSerieslayoverData(tickets: Ticket[], days: number = 30) {
  const data: Record<string, number> = {}

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    data[dateStr] = 0
  }

  tickets.forEach((ticket) => {
    const dateStr = ticket.reportedAt.split('T')[0]
    if (data.hasOwnProperty(dateStr)) {
      data[dateStr]++
    }
  })

  return Object.entries(data).map(([date, count]) => ({ date, count }))
}
