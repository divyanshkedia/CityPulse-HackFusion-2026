import { Ticket, BatchOperation } from './types'
import { canTransition } from './state-machine'

export class BatchProcessor {
  private batchSize = 10

  async processBatchStatusUpdate(
    ticketIds: string[],
    newStatus: any,
    tickets: Map<string, Ticket>,
    userId: string,
  ): Promise<BatchOperation> {
    const operation: BatchOperation = {
      id: 'batch-' + Date.now(),
      operationType: 'status_update',
      ticketIds,
      newValue: newStatus,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      status: 'processing',
      processedCount: 0,
    }

    const errors: string[] = []
    let processed = 0

    for (const ticketId of ticketIds) {
      const ticket = tickets.get(ticketId)
      if (!ticket) {
        errors.push(`Ticket ${ticketId} not found`)
        continue
      }

      // Validate state transition
      if (!canTransition(ticket.status, newStatus)) {
        errors.push(`Cannot transition ${ticketId} from ${ticket.status} to ${newStatus}`)
        continue
      }

      ticket.status = newStatus
      processed++

      // Small delay to avoid blocking
      if (processed % this.batchSize === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }

    operation.status = errors.length === 0 ? 'completed' : 'failed'
    operation.processedCount = processed

    return operation
  }

  async processBatchAssign(
    ticketIds: string[],
    assignee: string,
    tickets: Map<string, Ticket>,
    userId: string,
  ): Promise<BatchOperation> {
    const operation: BatchOperation = {
      id: 'batch-' + Date.now(),
      operationType: 'assign',
      ticketIds,
      newValue: assignee,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      status: 'processing',
      processedCount: 0,
    }

    let processed = 0

    for (const ticketId of ticketIds) {
      const ticket = tickets.get(ticketId)
      if (ticket && ticket.status !== 'closed') {
        ticket.assignedTo = assignee
        if (ticket.status === 'open') {
          ticket.status = 'assigned'
        }
        processed++

        if (processed % this.batchSize === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }
    }

    operation.status = 'completed'
    operation.processedCount = processed

    return operation
  }

  async processBatchCategoryChange(
    ticketIds: string[],
    newCategory: any,
    tickets: Map<string, Ticket>,
    userId: string,
  ): Promise<BatchOperation> {
    const operation: BatchOperation = {
      id: 'batch-' + Date.now(),
      operationType: 'category_change',
      ticketIds,
      newValue: newCategory,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      status: 'processing',
      processedCount: 0,
    }

    let processed = 0

    for (const ticketId of ticketIds) {
      const ticket = tickets.get(ticketId)
      if (ticket) {
        ticket.category = newCategory
        processed++

        if (processed % this.batchSize === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }
    }

    operation.status = 'completed'
    operation.processedCount = processed

    return operation
  }

  async processBatchPriorityChange(
    ticketIds: string[],
    newPriority: number,
    tickets: Map<string, Ticket>,
    userId: string,
  ): Promise<BatchOperation> {
    const operation: BatchOperation = {
      id: 'batch-' + Date.now(),
      operationType: 'priority_change',
      ticketIds,
      newValue: newPriority,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      status: 'processing',
      processedCount: 0,
    }

    let processed = 0

    for (const ticketId of ticketIds) {
      const ticket = tickets.get(ticketId)
      if (ticket) {
        ticket.priority = newPriority
        processed++

        if (processed % this.batchSize === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }
    }

    operation.status = 'completed'
    operation.processedCount = processed

    return operation
  }
}
