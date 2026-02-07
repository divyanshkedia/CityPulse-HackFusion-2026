import { TicketStatus, VALID_TRANSITIONS } from './types'

export class IncidentStateMachine {
  private currentStatus: TicketStatus

  constructor(status: TicketStatus) {
    this.currentStatus = status
  }

  canTransitionTo(newStatus: TicketStatus): boolean {
    return VALID_TRANSITIONS[this.currentStatus].includes(newStatus)
  }

  getValidNextStates(): TicketStatus[] {
    return VALID_TRANSITIONS[this.currentStatus]
  }

  transitionTo(newStatus: TicketStatus): { success: boolean; error?: string } {
    if (!this.canTransitionTo(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${this.currentStatus} to ${newStatus}`,
      }
    }

    this.currentStatus = newStatus
    return { success: true }
  }

  getStatusColor(status: TicketStatus): string {
    const colors: Record<TicketStatus, string> = {
      open: 'bg-emerald-100 text-emerald-800',
      assigned: 'bg-orange-100 text-orange-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-red-100 text-red-800',
      resolved: 'bg-blue-100 text-blue-800',
      closed: 'bg-gray-100 text-gray-800',
    }
    return colors[status]
  }

  isResolved(status: TicketStatus): boolean {
    return status === 'resolved' || status === 'closed'
  }

  isInProgress(status: TicketStatus): boolean {
    return status === 'in_progress' || status === 'assigned'
  }
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function getValidTransitions(from: TicketStatus): TicketStatus[] {
  return VALID_TRANSITIONS[from]
}
