import { Ticket } from './types'

interface DuplicateMatch {
  ticketId: string
  similarity: number
  reason: string
}

export function detectDuplicates(newTicket: Ticket, existingTickets: Ticket[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []

  existingTickets.forEach((ticket) => {
    // Skip already resolved/closed tickets
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return
    }

    const similarity = calculateSimilarity(newTicket, ticket)

    // Consider it a potential duplicate if similarity > 60%
    if (similarity > 0.6) {
      matches.push({
        ticketId: ticket.id,
        similarity: Math.round(similarity * 100),
        reason: getSimilarityReason(newTicket, ticket),
      })
    }
  })

  return matches.sort((a, b) => b.similarity - a.similarity)
}

function calculateSimilarity(ticket1: Ticket, ticket2: Ticket): number {
  let score = 0
  let weights = 0

  // Category match (weight: 25%)
  if (ticket1.category === ticket2.category) {
    score += 0.25
  }
  weights += 0.25

  // Location proximity (weight: 30%)
  const distance = getDistance(
    ticket1.latitude,
    ticket1.longitude,
    ticket2.latitude,
    ticket2.longitude,
  )
  if (distance < 0.5) {
    // Within ~500m
    score += 0.3
  } else if (distance < 2) {
    score += 0.15
  }
  weights += 0.3

  // Severity match (weight: 20%)
  if (ticket1.severity === ticket2.severity) {
    score += 0.2
  }
  weights += 0.2

  // Title similarity (weight: 25%)
  const titleSimilarity = stringSimilarity(ticket1.title, ticket2.title)
  score += titleSimilarity * 0.25
  weights += 0.25

  return score / weights
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1 === s2) return 1
  if (s1.length < 2 || s2.length < 2) return 0

  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.indexOf(shorter) > -1) {
    return 0.8
  }

  const pairs1 = getPairs(s1)
  const pairs2 = getPairs(s2)
  let intersection = 0

  pairs1.forEach((pair) => {
    const index = pairs2.indexOf(pair)
    if (index > -1) {
      intersection++
      pairs2.splice(index, 1)
    }
  })

  return (2 * intersection) / (pairs1.length + pairs2.length)
}

function getPairs(str: string): string[] {
  const pairs: string[] = []
  for (let i = 0; i < str.length - 1; i++) {
    pairs.push(str.substring(i, i + 2))
  }
  return pairs
}

function getSimilarityReason(ticket1: Ticket, ticket2: Ticket): string {
  const reasons: string[] = []

  if (ticket1.category === ticket2.category) {
    reasons.push(`Same category: ${ticket1.category}`)
  }

  const distance = getDistance(ticket1.latitude, ticket1.longitude, ticket2.latitude, ticket2.longitude)
  if (distance < 0.5) {
    reasons.push('Location within 500m')
  }

  if (ticket1.severity === ticket2.severity) {
    reasons.push(`Same severity: ${ticket1.severity}`)
  }

  return reasons.join(', ') || 'Similar incident'
}
