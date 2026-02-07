'use client'

import { Ticket, AuditLog, User, Comment, Report } from './types'

const STORAGE_KEYS = {
  TICKETS: 'citypulse_tickets',
  USERS: 'citypulse_users',
  CURRENT_USER: 'citypulse_current_user',
  AUDIT_LOGS: 'citypulse_audit_logs',
  REPORTS: 'citypulse_reports',
}

// UUID generation function
function generateId(): string {
  return 'id-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

// Initialize default users
export function initializeDefaultUsers(): User[] {
  const defaultUsers: User[] = [
    {
      id: generateId(),
      name: 'John Citizen',
      email: 'citizen@citypulse.local',
      role: 'citizen',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'Field Officer Sarah',
      email: 'sarah@citypulse.local',
      role: 'field_staff',
      department: 'Infrastructure',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'Officer Mike Chen',
      email: 'mike@citypulse.local',
      role: 'officer',
      department: 'Operations',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: 'Admin Lisa Park',
      email: 'admin@citypulse.local',
      role: 'admin',
      department: 'Administration',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
  ]
  return defaultUsers
}

// Initialize default tickets
export function initializeDefaultTickets(): Ticket[] {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  return [
    {
      id: generateId(),
      ticketNumber: 'CYP-2024-001',
      category: 'pothole',
      severity: 'high',
      status: 'in_progress',
      title: 'Large pothole on Main Street',
      description: 'Dangerous pothole creating safety hazard. Road collapse risk.',
      location: 'Main Street near 5th Avenue',
      latitude: 40.7128,
      longitude: -74.006,
      reportedBy: 'John Citizen',
      reportedAt: threeDaysAgo.toISOString(),
      assignedTo: 'Field Officer Sarah',
      estimatedCompletion: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      images: [],
      tags: ['urgent', 'safety'],
      isDuplicate: false,
      priority: 8,
      comments: [
        {
          id: generateId(),
          author: 'Officer Mike Chen',
          authorRole: 'officer',
          content: 'Team assigned. Prioritizing this repair.',
          createdAt: yesterday.toISOString(),
          edited: false,
        },
      ],
      audit: [
        {
          id: generateId(),
          action: 'created',
          actor: 'John Citizen',
          actorRole: 'citizen',
          timestamp: threeDaysAgo.toISOString(),
          details: { reason: 'Safety hazard' },
        },
        {
          id: generateId(),
          action: 'assigned',
          actor: 'Officer Mike Chen',
          actorRole: 'officer',
          timestamp: yesterday.toISOString(),
          details: { assignedTo: 'Field Officer Sarah' },
          fieldChanged: 'assignedTo',
          oldValue: undefined,
          newValue: 'Field Officer Sarah',
        },
        {
          id: generateId(),
          action: 'status_changed',
          actor: 'Field Officer Sarah',
          actorRole: 'field_staff',
          timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
          details: { statusChange: 'assigned -> in_progress' },
          fieldChanged: 'status',
          oldValue: 'assigned',
          newValue: 'in_progress',
        },
      ],
    },
    {
      id: generateId(),
      ticketNumber: 'CYP-2024-002',
      category: 'flooding',
      severity: 'critical',
      status: 'assigned',
      title: 'Basement flooding in downtown district',
      description: 'Multiple reports of flooding in the downtown area. Water level rising.',
      location: 'Downtown District',
      latitude: 40.714,
      longitude: -74.003,
      reportedBy: 'Emergency Services',
      reportedAt: now.toISOString(),
      assignedTo: 'Field Officer Sarah',
      images: [],
      tags: ['emergency', 'flooding'],
      isDuplicate: false,
      priority: 10,
      comments: [],
      audit: [
        {
          id: generateId(),
          action: 'created',
          actor: 'Emergency Services',
          actorRole: 'officer',
          timestamp: now.toISOString(),
          details: { reason: 'Emergency dispatch' },
        },
      ],
    },
    {
      id: generateId(),
      ticketNumber: 'CYP-2024-003',
      category: 'street_light',
      severity: 'medium',
      status: 'resolved',
      title: 'Street light out on Park Avenue',
      description: 'Street light has been out for several days. Affecting pedestrian safety.',
      location: 'Park Avenue near 10th Street',
      latitude: 40.715,
      longitude: -74.005,
      reportedBy: 'Jane Smith',
      reportedAt: fiveDaysAgo.toISOString(),
      assignedTo: 'Field Officer Sarah',
      resolvedBy: 'Field Officer Sarah',
      resolvedAt: yesterday.toISOString(),
      actualCompletion: yesterday.toISOString(),
      images: [],
      tags: ['lighting'],
      isDuplicate: false,
      priority: 5,
      resolutionNotes: 'Bulb replaced successfully',
      comments: [],
      audit: [
        {
          id: generateId(),
          action: 'created',
          actor: 'Jane Smith',
          actorRole: 'citizen',
          timestamp: fiveDaysAgo.toISOString(),
          details: { reason: 'Safety concern' },
        },
        {
          id: generateId(),
          action: 'status_changed',
          actor: 'Field Officer Sarah',
          actorRole: 'field_staff',
          timestamp: yesterday.toISOString(),
          details: { statusChange: 'in_progress -> resolved' },
          fieldChanged: 'status',
          oldValue: 'in_progress',
          newValue: 'resolved',
        },
      ],
    },
    {
      id: generateId(),
      ticketNumber: 'CYP-2024-004',
      category: 'traffic_signal',
      severity: 'critical',
      status: 'open',
      title: 'Traffic signal malfunction at intersection',
      description: 'Traffic light stuck on red. Causing traffic congestion.',
      location: 'Broadway & 34th Street',
      latitude: 40.7505,
      longitude: -73.988,
      reportedBy: 'Traffic Department',
      reportedAt: twoDaysAgo.toISOString(),
      images: [],
      tags: ['traffic', 'urgent'],
      isDuplicate: false,
      priority: 9,
      comments: [],
      audit: [
        {
          id: generateId(),
          action: 'created',
          actor: 'Traffic Department',
          actorRole: 'officer',
          timestamp: twoDaysAgo.toISOString(),
          details: { reason: 'Traffic safety' },
        },
      ],
    },
    {
      id: generateId(),
      ticketNumber: 'CYP-2024-005',
      category: 'debris',
      severity: 'low',
      status: 'on_hold',
      title: 'Debris and fallen branches on sidewalk',
      description: 'Tree branches blocking pedestrian path. Weather related.',
      location: 'Central Park South entrance',
      latitude: 40.7731,
      longitude: -73.9822,
      reportedBy: 'Maria Garcia',
      reportedAt: twoDaysAgo.toISOString(),
      images: [],
      tags: ['cleanup'],
      isDuplicate: false,
      priority: 3,
      onHoldReason: 'Awaiting parks department approval for cleanup',
      comments: [],
      audit: [
        {
          id: generateId(),
          action: 'created',
          actor: 'Maria Garcia',
          actorRole: 'citizen',
          timestamp: twoDaysAgo.toISOString(),
          details: { reason: 'Hazard' },
        },
        {
          id: generateId(),
          action: 'status_changed',
          actor: 'Officer Mike Chen',
          actorRole: 'officer',
          timestamp: yesterday.toISOString(),
          details: { statusChange: 'open -> on_hold' },
          fieldChanged: 'status',
          oldValue: 'open',
          newValue: 'on_hold',
        },
      ],
    },
  ]
}

// Storage operations
export const storage = {
  // Ticket operations
  getTickets: (): Ticket[] => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.TICKETS)
    return stored ? JSON.parse(stored) : initializeDefaultTickets()
  },

  saveTickets: (tickets: Ticket[]) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets))
  },

  getTicketById: (id: string): Ticket | undefined => {
    return storage.getTickets().find((t) => t.id === id)
  },

  createTicket: (ticket: Omit<Ticket, 'id' | 'ticketNumber' | 'audit' | 'comments'>) => {
    const tickets = storage.getTickets()
    const newTicket: Ticket = {
      ...ticket,
      id: generateId(),
      ticketNumber: `CYP-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(3, '0')}`,
      comments: [],
      audit: [
        {
          id: generateId(),
          action: 'created',
          actor: ticket.reportedBy,
          actorRole: 'citizen',
          timestamp: new Date().toISOString(),
          details: { category: ticket.category, severity: ticket.severity },
        },
      ],
    }
    tickets.push(newTicket)
    storage.saveTickets(tickets)
    return newTicket
  },

  updateTicket: (id: string, updates: Partial<Ticket>, actor: string, actorRole: any) => {
    const tickets = storage.getTickets()
    const index = tickets.findIndex((t) => t.id === id)
    if (index === -1) return null

    const oldTicket = { ...tickets[index] }
    const updatedTicket = { ...tickets[index], ...updates }

    // Create audit logs for each changed field
    const auditEntries: AuditLog[] = []
    for (const key of Object.keys(updates)) {
      if (key !== 'id' && key !== 'audit' && key !== 'comments' && oldTicket[key as keyof Ticket] !== updates[key as keyof Ticket]) {
        auditEntries.push({
          id: generateId(),
          action: `${key}_updated`,
          actor,
          actorRole,
          timestamp: new Date().toISOString(),
          details: { field: key },
          fieldChanged: key,
          oldValue: oldTicket[key as keyof Ticket],
          newValue: updates[key as keyof Ticket],
        })
      }
    }

    updatedTicket.audit = [...updatedTicket.audit, ...auditEntries]
    tickets[index] = updatedTicket
    storage.saveTickets(tickets)
    return updatedTicket
  },

  // User operations
  getUsers: (): User[] => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.USERS)
    if (!stored) {
      const defaultUsers = initializeDefaultUsers()
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers))
      return defaultUsers
    }
    return JSON.parse(stored)
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    if (!stored) {
      const users = storage.getUsers()
      const defaultUser = users[0]
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser))
      return defaultUser
    }
    return JSON.parse(stored)
  },

  setCurrentUser: (user: User) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
  },

  // Report operations
  generateReport: (period: 'daily' | 'weekly' | 'monthly'): Report => {
    const tickets = storage.getTickets()
    const stats = {
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) => t.status === 'open').length,
      inProgressTickets: tickets.filter((t) => t.status === 'in_progress').length,
      resolvedTickets: tickets.filter((t) => t.status === 'resolved').length,
      averageResolutionTime: 48,
      criticalTickets: tickets.filter((t) => t.severity === 'critical').length,
      fieldStaffUtilization: 75,
    }

    const categoryBreakdown: Record<string, number> = {}
    const severityBreakdown: Record<string, number> = {}
    const statusBreakdown: Record<string, number> = {}

    tickets.forEach((ticket) => {
      categoryBreakdown[ticket.category] = (categoryBreakdown[ticket.category] || 0) + 1
      severityBreakdown[ticket.severity] = (severityBreakdown[ticket.severity] || 0) + 1
      statusBreakdown[ticket.status] = (statusBreakdown[ticket.status] || 0) + 1
    })

    return {
      id: generateId(),
      generatedAt: new Date().toISOString(),
      generatedBy: storage.getCurrentUser()?.name || 'System',
      period,
      stats,
      categoryBreakdown: categoryBreakdown as Record<any, number>,
      severityBreakdown: severityBreakdown as Record<any, number>,
      statusBreakdown: statusBreakdown as Record<any, number>,
    }
  },
}
