import type {
  Audit, AuditFilters, Check, CreateAuditPayload, PaginatedResponse,
  RunResponse, Template,
} from '../types'
import { AUDITS, PROCESSES, CHECKS_MAP, TEMPLATES, OWNERS } from '../data/mockData'

// Mutable state (in-memory store)
let auditsStore: Audit[] = [...AUDITS]
const checksStore: Record<string, Check[]> = { ...CHECKS_MAP }

// Config
const ERROR_RATE = 0.12 // 12%
const MIN_LATENCY = 300
const MAX_LATENCY = 1200

function delay(ms?: number): Promise<void> {
  const d = ms ?? MIN_LATENCY + Math.random() * (MAX_LATENCY - MIN_LATENCY)
  return new Promise((resolve) => setTimeout(resolve, d))
}

function maybeThrow(route: string): void {
  if (Math.random() < ERROR_RATE) {
    throw new ApiError(`Error simulado en ${route}. Por favor, inténtalo de nuevo.`, 500)
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message)
    this.name = 'ApiError'
  }
}

// GET /audits
export async function getAudits(filters: AuditFilters = {}): Promise<PaginatedResponse<Audit>> {
  await delay()
  maybeThrow('GET /audits')

  let result = [...auditsStore]

  // Filter
  if (filters.q) {
    const q = filters.q.toLowerCase()
    result = result.filter(
      (a) => a.name.toLowerCase().includes(q) || a.process.toLowerCase().includes(q)
    )
  }
  if (filters.status && filters.status.length > 0) {
    result = result.filter((a) => filters.status!.includes(a.status))
  }
  if (filters.process) {
    result = result.filter((a) => a.process === filters.process)
  }
  if (filters.ownerId) {
    result = result.filter((a) => a.owner.id === filters.ownerId)
  }

  // Sort
  const sort = filters.sort ?? 'updatedAt_desc'
  const [field, dir] = sort.split('_')
  result.sort((a, b) => {
    let va: string | number = ''
    let vb: string | number = ''
    if (field === 'name') { va = a.name; vb = b.name }
    else if (field === 'updatedAt') { va = a.updatedAt; vb = b.updatedAt }
    else if (field === 'targetDate') { va = a.targetDate; vb = b.targetDate }
    else if (field === 'progress') { va = a.progress; vb = b.progress }
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1 : -1
    return 0
  })

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 10
  const start = (page - 1) * pageSize
  const items = result.slice(start, start + pageSize)

  return { items, total: result.length, page, pageSize }
}

// GET /audits/:id
export async function getAudit(id: string): Promise<{ audit: Audit; checks: Check[] }> {
  await delay()
  maybeThrow('GET /audits/:id')

  const audit = auditsStore.find((a) => a.id === id)
  if (!audit) throw new ApiError('Auditoría no encontrada', 404)

  const checks = checksStore[id] ?? []
  return { audit, checks }
}

// POST /audits
export async function createAudit(payload: CreateAuditPayload): Promise<Audit> {
  await delay()
  maybeThrow('POST /audits')

  const id = `aud_${Date.now()}`
  const template = TEMPLATES.find((t) => t.id === payload.templateId)

  const audit: Audit = {
    id,
    name: payload.name,
    process: payload.process,
    status: 'DRAFT',
    progress: 0,
    owner: payload.owner,
    targetDate: payload.targetDate,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    templateId: payload.templateId,
  }

  // Generate checks from template
  const checkCount = template?.checkCount ?? 15
  const checks: Check[] = Array.from({ length: checkCount }, (_, i) => {
    const preview = template?.checksPreview[i % template.checksPreview.length]
    return {
      id: `chk_${id}_${i + 1}`,
      title: preview?.title ?? `Control ${i + 1}`,
      priority: preview?.priority ?? 'MEDIUM',
      status: 'PENDING',
      evidence: '',
      reviewed: false,
      updatedAt: new Date().toISOString(),
    }
  })

  auditsStore = [audit, ...auditsStore]
  checksStore[id] = checks

  return audit
}

// POST /audits/:id/run
export async function runAudit(id: string): Promise<RunResponse> {
  await delay(400)
  maybeThrow('POST /audits/:id/run')

  const auditIdx = auditsStore.findIndex((a) => a.id === id)
  if (auditIdx === -1) throw new ApiError('Auditoría no encontrada', 404)

  auditsStore[auditIdx] = {
    ...auditsStore[auditIdx],
    status: 'IN_PROGRESS',
    updatedAt: new Date().toISOString(),
  }

  // Reset all checks to PENDING
  if (checksStore[id]) {
    checksStore[id] = checksStore[id].map((c) => ({
      ...c, status: 'PENDING', updatedAt: new Date().toISOString(),
    }))
  }

  const runId = `run_${Date.now()}`

  // Start background execution simulation
  simulateExecution(id)

  return { runId, auditId: id }
}

const KO_PROBABILITY = 0.15

async function simulateExecution(auditId: string): Promise<void> {
  const checks = checksStore[auditId]
  if (!checks) return

  for (let i = 0; i < checks.length; i++) {
    // Random delay between checks
    await delay(600 + Math.random() * 800)

    // QUEUED
    updateCheckStatus(auditId, checks[i].id, 'QUEUED')
    await delay(300 + Math.random() * 400)

    // RUNNING
    updateCheckStatus(auditId, checks[i].id, 'RUNNING')
    await delay(500 + Math.random() * 700)

    // OK or KO
    const result = Math.random() < KO_PROBABILITY ? 'KO' : 'OK'
    updateCheckStatus(auditId, checks[i].id, result)

    // Update audit progress
    updateAuditProgress(auditId)
  }

  // Final audit status
  finishAudit(auditId)
}

function updateCheckStatus(auditId: string, checkId: string, status: Check['status']): void {
  const checks = checksStore[auditId]
  if (!checks) return
  const idx = checks.findIndex((c) => c.id === checkId)
  if (idx === -1) return
  checks[idx] = { ...checks[idx], status, updatedAt: new Date().toISOString() }
}

function updateAuditProgress(auditId: string): void {
  const checks = checksStore[auditId]
  if (!checks) return
  const done = checks.filter((c) => c.status === 'OK' || c.status === 'KO').length
  const progress = Math.round((done / checks.length) * 100)

  const idx = auditsStore.findIndex((a) => a.id === auditId)
  if (idx === -1) return
  auditsStore[idx] = { ...auditsStore[idx], progress, updatedAt: new Date().toISOString() }
}

function finishAudit(auditId: string): void {
  const checks = checksStore[auditId]
  if (!checks) return

  const hasKO = checks.some((c) => c.status === 'KO')
  const idx = auditsStore.findIndex((a) => a.id === auditId)
  if (idx === -1) return

  auditsStore[idx] = {
    ...auditsStore[idx],
    status: hasKO ? 'BLOCKED' : 'DONE',
    progress: 100,
    updatedAt: new Date().toISOString(),
  }
}

// PATCH /audits/:id/checks/:checkId
export async function updateCheck(
  auditId: string,
  checkId: string,
  patch: Partial<Pick<Check, 'status' | 'evidence' | 'reviewed'>>
): Promise<Check> {
  await delay(300)
  maybeThrow('PATCH /audits/:id/checks/:checkId')

  const checks = checksStore[auditId]
  if (!checks) throw new ApiError('Auditoría no encontrada', 404)

  const idx = checks.findIndex((c) => c.id === checkId)
  if (idx === -1) throw new ApiError('Check no encontrado', 404)

  checks[idx] = { ...checks[idx], ...patch, updatedAt: new Date().toISOString() }
  updateAuditProgress(auditId)
  finishAudit(auditId)

  return checks[idx]
}

// GET /templates
export async function getTemplates(): Promise<Template[]> {
  await delay()
  maybeThrow('GET /templates')
  return [...TEMPLATES]
}

// Helpers (exposed for use in UI)
export { OWNERS, PROCESSES }

// Getter for live store (used by polling)
export function getAuditFromStore(id: string): { audit: Audit | undefined; checks: Check[] } {
  return {
    audit: auditsStore.find((a) => a.id === id),
    checks: checksStore[id] ?? [],
  }
}
