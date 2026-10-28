
import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  X,
  AlertCircle,
  Clock3,
  Ban,
} from 'lucide-react'

import {
  createDelegation,
  generateAgentToken,
  getDelegations,
  getDelegation,
  getDelegationActions,
  revokeDelegation,
} from '../api/agentDelegationApi'

const SCOPE_OPTIONS = [
  { value: 'search', label: 'Search trains', description: 'Search trains and availability' },
  { value: 'read_profile', label: 'Read profile', description: 'Access your basic profile' },
  { value: 'read_passengers', label: 'Read passengers', description: 'Access saved passenger details' },
  { value: 'book', label: 'Book tickets', description: 'Create bookings within your limits' },
  { value: 'read_bookings', label: 'Read bookings', description: 'View booking information' },
]

const CLASS_OPTIONS = ['SL', '3A', '2A', '1A', 'CC', '2S', '3E', 'EC']

const INITIAL_FORM = {
  name: 'My assistant',
  scopes: ['search', 'read_profile', 'read_passengers', 'book', 'read_bookings'],
  maxFareRupees: '500',
  maxSpendRupees: '1000',
  maxPassengers: '2',
  allowedClasses: ['SL'],
  savedPassengersOnly: true,
  validDays: '7',
}

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatRupees(paise) {
  if (paise === null || paise === undefined || paise === '') return '—'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(paise) / 100)
}

function getErrorMessage(error) {
  return error?.data?.message || error?.message || 'Something went wrong. Please try again.'
}

function getTokenFromResponse(response) {
  if (typeof response === 'string') return response

  return (
    response?.accessToken ||
    response?.token ||
    response?.agentToken ||
    response?.data?.accessToken ||
    response?.data?.token ||
    null
  )
}

function StatusBadge({ status }) {
  const active = String(status || '').toUpperCase() === 'ACTIVE'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {status || 'UNKNOWN'}
    </span>
  )
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
        </div>
        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

export default function AgentAccessPage() {
  const [delegations, setDelegations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [actions, setActions] = useState([])
  const [actionPage, setActionPage] = useState(0)
  const [actionTotal, setActionTotal] = useState(0)

  const [form, setForm] = useState(INITIAL_FORM)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionsLoading, setActionsLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [generatedToken, setGeneratedToken] = useState('')
  const [copied, setCopied] = useState(false)

  const loadDelegations = useCallback(async (preferredId = null) => {
    setLoading(true)
    setError('')

    try {
      const result = await getDelegations()
      const list = Array.isArray(result)
        ? result
        : result?.content || result?.delegations || result?.items || []

      setDelegations(list)

      const targetId = preferredId ?? selectedId
      const target = list.find((item) => String(item.id) === String(targetId))

      if (target) {
        setSelectedId(target.id)
      } else if (list.length > 0) {
        setSelectedId(list[0].id)
      } else {
        setSelectedId(null)
        setSelected(null)
        setActions([])
        setActionTotal(0)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  const loadActions = useCallback(async (id, page = 0) => {
    if (id === null || id === undefined) return

    setActionsLoading(true)

    try {
      const result = await getDelegationActions(id, { page, size: 10 })
      setActions(Array.isArray(result) ? result : result?.content || [])
      setActionPage(Number(result?.page ?? page))
      setActionTotal(Number(result?.totalElements ?? result?.total ?? 0))
    } catch (err) {
      setActions([])
      setError(getErrorMessage(err))
    } finally {
      setActionsLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id) => {
    if (id === null || id === undefined) return

    setDetailLoading(true)

    try {
      const result = await getDelegation(id)
      setSelected(result)
    } catch (err) {
      setSelected(null)
      setError(getErrorMessage(err))
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDelegations()
  }, [loadDelegations])

  useEffect(() => {
    if (selectedId === null || selectedId === undefined) {
      setSelected(null)
      setActions([])
      return
    }

    loadDetail(selectedId)
    loadActions(selectedId, 0)
  }, [selectedId, loadDetail, loadActions])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleScope(scope) {
    setForm((current) => ({
      ...current,
      scopes: current.scopes.includes(scope)
        ? current.scopes.filter((item) => item !== scope)
        : [...current.scopes, scope],
    }))
  }

  function toggleClass(classCode) {
    setForm((current) => ({
      ...current,
      allowedClasses: current.allowedClasses.includes(classCode)
        ? current.allowedClasses.filter((item) => item !== classCode)
        : [...current.allowedClasses, classCode],
    }))
  }

  async function handleCreate(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setGeneratedToken('')

    const maxFare = Number(form.maxFareRupees)
    const maxSpend = Number(form.maxSpendRupees)
    const maxPassengers = Number(form.maxPassengers)
    const validDays = Number(form.validDays)

    if (!form.name.trim()) {
      setError('Please enter a name for your assistant.')
      return
    }

    if (form.scopes.length === 0) {
      setError('Select at least one permission.')
      return
    }

    if (form.allowedClasses.length === 0) {
      setError('Select at least one allowed travel class.')
      return
    }

    if (
      !Number.isFinite(maxFare) ||
      !Number.isFinite(maxSpend) ||
      maxFare <= 0 ||
      maxSpend <= 0 ||
      maxPassengers < 1 ||
      maxPassengers > 6 ||
      !Number.isInteger(maxPassengers) ||
      !Number.isInteger(validDays) ||
      validDays < 1 ||
      validDays > 30
    ) {
      setError('Check the limits. Passengers must be 1–6 and validity must be 1–30 days.')
      return
    }

    setCreating(true)

    try {
      const created = await createDelegation({
        name: form.name.trim(),
        scopes: form.scopes,
        maxFarePerBookingPaise: Math.round(maxFare * 100),
        maxSpend24hPaise: Math.round(maxSpend * 100),
        maxPassengers,
        allowedClasses: form.allowedClasses,
        savedPassengersOnly: form.savedPassengersOnly,
        validDays,
      })

      setNotice('Delegation created successfully.')
      setShowCreateForm(false)
      setForm(INITIAL_FORM)

      await loadDelegations(created?.id ?? null)

      if (created?.id !== undefined && created?.id !== null) {
        setSelectedId(created.id)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleGenerateToken(id) {
    setError('')
    setNotice('')
    setGeneratedToken('')
    setCopied(false)
    setTokenLoading(true)

    try {
      const response = await generateAgentToken(id)
      const token = getTokenFromResponse(response)

      if (!token) {
        setError('The token request succeeded, but no token field was found in the response. Check the API response format.')
        return
      }

      setGeneratedToken(token)
      setNotice('Agent token generated. Copy it now and store it securely.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setTokenLoading(false)
    }
  }

  async function handleCopyToken() {
    if (!generatedToken) return

    try {
      await navigator.clipboard.writeText(generatedToken)
      setCopied(true)
      setNotice('Token copied to clipboard.')
    } catch {
      setError('Clipboard access failed. Select and copy the token manually.')
    }
  }

  async function handleRevoke(delegation) {
    const id = delegation?.id
    if (id === undefined || id === null) return

    const confirmed = window.confirm(
      `Revoke "${delegation.name || `Delegation #${id}`}"?\n\nThe agent will lose access. This action may not be reversible.`
    )

    if (!confirmed) return

    setError('')
    setNotice('')
    setRevoking(true)

    try {
      await revokeDelegation(id)
      setNotice('Delegation revoked.')
      setGeneratedToken('')
      await loadDelegations(id)
      await loadDetail(id)
      await loadActions(id, 0)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setRevoking(false)
    }
  }

  const activeCount = delegations.filter(
    (item) => String(item.status).toUpperCase() === 'ACTIVE'
  ).length

  const usableCount = delegations.filter((item) => item.usable === true).length
  const current = selected || delegations.find(
    (item) => String(item.id) === String(selectedId)
  )

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-9">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
              <Sparkles size={14} />
              RAILYATRA · AGENT ACCESS
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your travel. Your rules.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Give an assistant limited access to help with train searches and bookings.
              You control its permissions, spending limits and validity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError('')
              setNotice('')
              setShowCreateForm((value) => !value)
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-indigo-50"
          >
            {showCreateForm ? <X size={18} /> : <Plus size={18} />}
            {showCreateForm ? 'Close form' : 'Create delegation'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">{error}</div>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">{notice}</div>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
            <X size={17} />
          </button>
        </div>
      )}

      {showCreateForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Create a new assistant</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure the access before creating the delegation.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-7">
            <div>
              <label htmlFor="agent-name" className="mb-2 block text-sm font-semibold text-slate-700">
                Assistant name
              </label>
              <input
                id="agent-name"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                maxLength={100}
                required
                placeholder="e.g. My travel assistant"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Permissions</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {SCOPE_OPTIONS.map((scope) => (
                  <label
                    key={scope.value}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                      form.scopes.includes(scope.value)
                        ? 'border-indigo-300 bg-indigo-50/70'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-1 h-4 w-4 accent-indigo-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{scope.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{scope.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Booking and spending limits</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="agent-fare" className="mb-2 block text-xs font-medium text-slate-600">
                    Maximum fare per booking (₹)
                  </label>
                  <input
                    id="agent-fare"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={form.maxFareRupees}
                    onChange={(event) => updateForm('maxFareRupees', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label htmlFor="agent-spend" className="mb-2 block text-xs font-medium text-slate-600">
                    Maximum spend per 24 hours (₹)
                  </label>
                  <input
                    id="agent-spend"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={form.maxSpendRupees}
                    onChange={(event) => updateForm('maxSpendRupees', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label htmlFor="agent-passengers" className="mb-2 block text-xs font-medium text-slate-600">
                    Maximum passengers
                  </label>
                  <input
                    id="agent-passengers"
                    type="number"
                    min="1"
                    max="6"
                    step="1"
                    required
                    value={form.maxPassengers}
                    onChange={(event) => updateForm('maxPassengers', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Allowed travel classes</h3>
              <div className="flex flex-wrap gap-2">
                {CLASS_OPTIONS.map((classCode) => (
                  <label
                    key={classCode}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      form.allowedClasses.includes(classCode)
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.allowedClasses.includes(classCode)}
                      onChange={() => toggleClass(classCode)}
                      className="sr-only"
                    />
                    {form.allowedClasses.includes(classCode) && <Check size={14} />}
                    {classCode}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="agent-valid-days" className="mb-2 block text-sm font-semibold text-slate-700">
                  Validity (days)
                </label>
                <input
                  id="agent-valid-days"
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  required
                  value={form.validDays}
                  onChange={(event) => updateForm('validDays', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
                <p className="mt-1.5 text-xs text-slate-500">Choose between 1 and 30 days.</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={form.savedPassengersOnly}
                  onChange={(event) => updateForm('savedPassengersOnly', event.target.checked)}
                  className="mt-1 h-4 w-4 accent-indigo-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Saved passengers only</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Restrict bookings to passengers already saved in your account.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating && <LoaderCircle size={17} className="animate-spin" />}
                {creating ? 'Creating...' : 'Create delegation'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Bot} label="Total delegations" value={loading ? '…' : delegations.length} detail="Created in your account" />
        <MetricCard icon={ShieldCheck} label="Active delegations" value={loading ? '…' : activeCount} detail="Status is ACTIVE" />
        <MetricCard icon={CheckCircle2} label="Usable delegations" value={loading ? '…' : usableCount} detail="API reports usable = true" />
        <MetricCard icon={Activity} label="Recorded actions" value={actionsLoading ? '…' : actionTotal} detail="For the selected delegation" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold text-slate-900">Your delegations</h2>
              <p className="mt-1 text-xs text-slate-500">Select one to view its details.</p>
            </div>
            <button
              type="button"
              onClick={() => loadDelegations(selectedId)}
              disabled={loading}
              title="Refresh delegations"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" /> Loading delegations...
            </div>
          ) : delegations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Bot size={24} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">No delegations yet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create an assistant delegation to get started.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create your first delegation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {delegations.map((item) => {
                const isSelected = String(item.id) === String(selectedId)

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id)
                      setGeneratedToken('')
                      setCopied(false)
                      setError('')
                      setNotice('')
                    }}
                    className={`w-full p-5 text-left transition hover:bg-slate-50 ${
                      isSelected ? 'bg-indigo-50/70 ring-1 ring-inset ring-indigo-200' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-3 ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        <Bot size={21} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-900">
                            {item.name || `Delegation #${item.id}`}
                          </span>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">ID: {item.id}</p>
                        <p className="mt-3 text-xs text-slate-600">
                          {Array.isArray(item.scopes) ? item.scopes.length : 0} permissions
                          {' · '}
                          {Array.isArray(item.allowedClasses) ? item.allowedClasses.join(', ') : 'Classes not listed'}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Expires: {formatDate(item.expiresAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                  <ShieldCheck size={23} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Delegation details</h2>
                  <p className="mt-1 text-xs text-slate-500">Permissions and usage boundaries</p>
                </div>
              </div>
              {current && <StatusBadge status={current.status} />}
            </div>

            {detailLoading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" /> Loading details...
              </div>
            ) : !current ? (
              <p className="py-8 text-sm text-slate-500">Select a delegation to view its details.</p>
            ) : (
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assistant</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{current.name || `Delegation #${current.id}`}</p>
                  <p className="mt-1 text-xs text-slate-500">Delegation ID: {current.id}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <Wallet size={18} className="text-indigo-600" />
                    <p className="mt-3 text-xs text-slate-500">Max fare per booking</p>
                    <p className="mt-1 font-bold text-slate-900">{formatRupees(current.maxFarePerBookingPaise)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <Wallet size={18} className="text-indigo-600" />
                    <p className="mt-3 text-xs text-slate-500">Max spend / 24 hours</p>
                    <p className="mt-1 font-bold text-slate-900">{formatRupees(current.maxSpend24hPaise)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <Users size={18} className="text-indigo-600" />
                    <p className="mt-3 text-xs text-slate-500">Max passengers</p>
                    <p className="mt-1 font-bold text-slate-900">{current.maxPassengers ?? '—'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <Clock3 size={18} className="text-indigo-600" />
                    <p className="mt-3 text-xs text-slate-500">Expires</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(current.expiresAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-800">Permissions</p>
                  <div className="flex flex-wrap gap-2">
                    {(current.scopes || []).map((scope) => (
                      <span key={scope} className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
                        {scope}
                      </span>
                    ))}
                    {(!current.scopes || current.scopes.length === 0) && (
                      <span className="text-sm text-slate-500">No permissions listed.</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-800">Allowed classes</p>
                  <div className="flex flex-wrap gap-2">
                    {(current.allowedClasses || []).map((classCode) => (
                      <span key={classCode} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {classCode}
                      </span>
                    ))}
                    {(!current.allowedClasses || current.allowedClasses.length === 0) && (
                      <span className="text-sm text-slate-500">No classes listed.</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                  {current.savedPassengersOnly
                    ? <CheckCircle2 size={18} className="text-emerald-600" />
                    : <AlertCircle size={18} className="text-amber-600" />}
                  <span className="text-slate-700">
                    Saved passengers only: <strong>{current.savedPassengersOnly ? 'Yes' : 'No'}</strong>
                  </span>
                </div>

                <div className="grid gap-2 border-t border-slate-100 pt-5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateToken(current.id)}
                    disabled={tokenLoading || String(current.status).toUpperCase() !== 'ACTIVE' || current.usable === false}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {tokenLoading ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={17} />}
                    {tokenLoading ? 'Generating...' : 'Generate agent token'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRevoke(current)}
                    disabled={revoking || String(current.status).toUpperCase() !== 'ACTIVE'}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {revoking ? <LoaderCircle size={17} className="animate-spin" /> : <Ban size={17} />}
                    {revoking ? 'Revoking...' : 'Revoke access'}
                  </button>
                </div>

                {generatedToken && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                      <KeyRound size={17} />
                      Generated agent token
                    </div>
                    <p className="mt-2 text-xs leading-5 text-amber-800">
                      This token is sensitive. Copy it and store it securely. It is kept only in this page's current memory and will disappear if the page reloads or you switch delegations.
                    </p>
                    <div className="mt-3 flex items-start gap-2">
                      <textarea
                        aria-label="Generated agent token"
                        readOnly
                        rows={3}
                        value={generatedToken}
                        className="min-w-0 flex-1 resize-y rounded-lg border border-amber-200 bg-white p-3 font-mono text-xs text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <div className="rounded-xl bg-cyan-50 p-3 text-cyan-700">
                <Activity size={21} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Action history</h2>
                <p className="mt-1 text-xs text-slate-500">Recent recorded API activity for this delegation</p>
              </div>
            </div>

            {actionsLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" /> Loading activity...
              </div>
            ) : actions.length === 0 ? (
              <div className="p-8 text-center">
                <Activity size={24} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">No actions found</p>
                <p className="mt-1 text-xs text-slate-500">Activity will appear here when available from the API.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {actions.map((action, index) => (
                    <div key={action.id ?? `${action.createdAt}-${index}`} className="p-4 sm:px-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
                          <Ticket size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {action.method || 'API'} {action.path || 'Request'}
                            </span>
                            {action.statusCode !== undefined && (
                              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                Number(action.statusCode) >= 200 && Number(action.statusCode) < 400
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}>
                                {action.statusCode}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 break-words text-xs text-slate-500">
                            {action.summary || action.query || 'No additional details'}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">{formatDate(action.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
                  <span className="text-xs text-slate-500">
                    Page {actionPage + 1} · {actionTotal} total actions
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actionPage <= 0 || actionsLoading}
                      onClick={() => loadActions(selectedId, actionPage - 1)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      disabled={(actionPage + 1) * 10 >= actionTotal || actionsLoading}
                      onClick={() => loadActions(selectedId, actionPage + 1)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      aria-label="Next page"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-indigo-600" />
        <p className="leading-6">
          <strong className="text-slate-800">Security tip:</strong> Only grant permissions the assistant needs.
          Never share an agent token publicly. Revoking access is a separate, explicit action and is not performed automatically by this page.
        </p>
      </div>
    </div>
  )
}
