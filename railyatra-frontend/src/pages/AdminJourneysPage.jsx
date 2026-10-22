import { useState } from 'react'
import { accountRequest } from '../api/accountClient'
import { Search, Plus, Trash2, RefreshCw, TrainFront, CalendarDays, Users } from 'lucide-react'

const CLASS_OPTIONS = ['SL', '3A', '2A', '1A', 'CC', 'EC', '2S', '3E']

function getJourneys(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.journeys)) return response.journeys
  if (Array.isArray(response?.data)) return response.data
  return []
}

function formatError(error) {
  if (error?.fieldErrors?.length) {
    return error.fieldErrors.map((item) => `${item.field}: ${item.message}`).join(' · ')
  }
  return error?.message || 'Something went wrong. Please try again.'
}

export default function AdminJourneysPage() {
  const [trainNo, setTrainNo] = useState('')
  const [journeys, setJourneys] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searched, setSearched] = useState(false)

  const [form, setForm] = useState({
    trainNo: '',
    fromDate: '',
    toDate: '',
    classes: [
      { classCode: 'SL', coaches: '3' },
      { classCode: '3A', coaches: '1' },
    ],
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createResult, setCreateResult] = useState(null)

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateClass(index, field, value) {
    setForm((current) => ({
      ...current,
      classes: current.classes.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function addClass() {
    const available = CLASS_OPTIONS.find(
      (option) => !form.classes.some((item) => item.classCode === option),
    )
    if (!available) return
    setForm((current) => ({
      ...current,
      classes: [...current.classes, { classCode: available, coaches: '1' }],
    }))
  }

  function removeClass(index) {
    setForm((current) => ({
      ...current,
      classes: current.classes.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function searchJourneys(event) {
    event?.preventDefault()
    const number = trainNo.trim()
    if (!number) {
      setSearchError('Enter a train number to search.')
      return
    }
    setSearching(true)
    setSearchError('')
    setSearched(true)
    try {
      const response = await accountRequest(`/admin/journeys?trainNo=${encodeURIComponent(number)}`)
      setJourneys(getJourneys(response))
    } catch (error) {
      setJourneys([])
      setSearchError(formatError(error))
    } finally {
      setSearching(false)
    }
  }

  async function createJourneys(event) {
    event.preventDefault()
    setCreateError('')
    setCreateResult(null)

    const number = form.trainNo.trim()
    if (!number) return setCreateError('Train number is required.')
    if (!form.fromDate || !form.toDate) return setCreateError('Choose both dates.')
    if (form.toDate < form.fromDate) return setCreateError('End date must be on or after start date.')
    if (form.classes.length === 0) return setCreateError('Add at least one travel class.')

    const seen = new Set()
    const classes = []
    for (const item of form.classes) {
      const coaches = Number(item.coaches)
      if (seen.has(item.classCode)) return setCreateError(`Class ${item.classCode} is selected more than once.`)
      if (!Number.isInteger(coaches) || coaches < 1) return setCreateError('Each class must have at least 1 coach.')
      seen.add(item.classCode)
      classes.push({ classCode: item.classCode, coaches })
    }

    const payload = {
      trainNo: number,
      fromDate: form.fromDate,
      toDate: form.toDate,
      classes,
    }

    setCreating(true)
    try {
      const result = await accountRequest('/admin/journeys', {
        method: 'POST',
        body: payload,
      })
      setCreateResult(result || { message: 'Journeys created successfully.' })
      setTrainNo(number)
      // Refresh the list for the same train after successful creation.
      try {
        const response = await accountRequest(`/admin/journeys?trainNo=${encodeURIComponent(number)}`)
        setJourneys(getJourneys(response))
        setSearched(true)
      } catch {
        // Creation succeeded; the user can use Search to reload the list.
      }
    } catch (error) {
      setCreateError(formatError(error))
    } finally {
      setCreating(false)
    }
  }

  const totalSeats = journeys.reduce((sum, journey) => {
    const seats = Array.isArray(journey.classes)
      ? journey.classes.reduce((classSum, item) => classSum + (Number(item.totalSeats) || 0), 0)
      : 0
    return sum + seats
  }, 0)

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-800 p-7 text-white sm:p-9">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
            <TrainFront size={26} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">RAILYATRA ADMINISTRATION</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Journey management</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Create journeys for a date range and inspect configured classes, seat counts, and journey status.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><Plus size={21} /></span>
          <div>
            <h2 className="text-lg font-bold">Create journeys</h2>
            <p className="text-sm text-slate-500">Creates one journey per date in the selected range.</p>
          </div>
        </div>

        <form onSubmit={createJourneys} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700">Train number
              <input value={form.trainNo} onChange={(event) => updateForm('trainNo', event.target.value)} required maxLength={15} placeholder="e.g. 01488" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">From date
              <input type="date" value={form.fromDate} onChange={(event) => updateForm('fromDate', event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">To date
              <input type="date" min={form.fromDate || undefined} value={form.toDate} onChange={(event) => updateForm('toDate', event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
            </label>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-bold text-slate-800">Travel classes</h3><p className="text-xs text-slate-500">Choose each class once and enter its coach count.</p></div>
              <button type="button" onClick={addClass} disabled={form.classes.length >= CLASS_OPTIONS.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16} /> Add class</button>
            </div>
            <div className="space-y-3">
              {form.classes.map((item, index) => (
                <div key={`${index}-${item.classCode}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-xl bg-slate-50 p-3">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Class code
                    <select value={item.classCode} onChange={(event) => updateClass(index, 'classCode', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
                      {CLASS_OPTIONS.map((option) => <option key={option} value={option} disabled={form.classes.some((other, otherIndex) => otherIndex !== index && other.classCode === option)}>{option}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Coaches
                    <input type="number" min="1" step="1" value={item.coaches} onChange={(event) => updateClass(index, 'coaches', event.target.value)} required className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800" />
                  </label>
                  <button type="button" onClick={() => removeClass(index)} disabled={form.classes.length <= 1} title="Remove class" className="mb-0.5 rounded-lg p-2.5 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>

          {createError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{createError}</p>}
          {createResult && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><p className="font-bold">Journey creation request succeeded.</p><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(createResult, null, 2)}</pre></div>}
          <button type="submit" disabled={creating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">{creating ? <><RefreshCw size={17} className="animate-spin" /> Creating...</> : <><Plus size={17} /> Create journeys</>}</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-900"><Search size={21} /></span>
          <div><h2 className="text-lg font-bold">Find journeys</h2><p className="text-sm text-slate-500">Search using the train number.</p></div>
        </div>
        <form onSubmit={searchJourneys} className="flex flex-col gap-3 sm:flex-row">
          <input value={trainNo} onChange={(event) => setTrainNo(event.target.value)} placeholder="Enter train number, e.g. 01488" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
          <button type="submit" disabled={searching} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-60">{searching ? <RefreshCw size={17} className="animate-spin" /> : <Search size={17} />} Search</button>
        </form>
        {searchError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{searchError}</p>}

        {searched && !searching && !searchError && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Journeys found</p><p className="mt-1 text-2xl font-extrabold">{journeys.length}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Configured seats</p><p className="mt-1 text-2xl font-extrabold">{totalSeats.toLocaleString('en-IN')}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search train</p><p className="mt-1 text-2xl font-extrabold">{trainNo.trim() || '—'}</p></div>
          </div>
        )}

        {searched && !searching && !searchError && journeys.length === 0 && <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No journeys were returned for this train number.</p>}

        {journeys.length > 0 && (
          <div className="mt-6 space-y-4">
            {journeys.map((journey, index) => (
              <article key={journey.id ?? `${journey.trainNo}-${journey.journeyDate}-${index}`} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><TrainFront size={21} /></span>
                    <div><h3 className="font-bold text-slate-900">{journey.trainName || `Train ${journey.trainNo || ''}`}</h3><p className="mt-1 text-sm text-slate-500">Train No. {journey.trainNo || '—'} · Journey ID: {journey.id ?? '—'}</p></div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${String(journey.status).toUpperCase() === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{journey.status || 'UNKNOWN'}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={17} /><span>{journey.journeyDate || 'Date unavailable'}</span></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Array.isArray(journey.classes) ? journey.classes : []).map((item) => (
                    <div key={item.classCode} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="font-bold text-slate-800">{item.classCode}</span><span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><Users size={15} /> {Number(item.totalSeats) || 0} seats</span></div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
