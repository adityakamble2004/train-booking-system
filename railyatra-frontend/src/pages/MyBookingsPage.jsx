
import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Ticket,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrainFront,
} from 'lucide-react'

import {
  getMyBookings,
  getBooking,
  confirmBooking,
  cancelBooking,
} from '../api/bookingApi'

function formatMoney(paise) {
  if (paise == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(paise) / 100)
}

function statusStyle(status) {
  const value = String(status || '').toUpperCase()

  if (value === 'CONFIRMED') {
    return 'bg-emerald-50 text-emerald-700'
  }
  if (value === 'CANCELLED') {
    return 'bg-red-50 text-red-700'
  }
  if (value === 'PENDING_PAYMENT') {
    return 'bg-amber-50 text-amber-700'
  }
  return 'bg-slate-100 text-slate-700'
}

function extractBooking(data) {
  return data?.booking ?? data?.data?.booking ?? data?.data ?? data
}

export default function MyBookingsPage({ onSearchTrains }) {
  const [page, setPage] = useState(0)
  const [bookings, setBookings] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [selected, setSelected] = useState(null)
  const [pnrInput, setPnrInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const pageSize = 5

  const loadBookings = useCallback(async (requestedPage = page) => {
    setLoading(true)
    setError('')

    try {
      const response = await getMyBookings(requestedPage, pageSize)
      const data = response?.data ?? response
      setBookings(Array.isArray(data?.content) ? data.content : [])
      setTotalElements(Number(data?.totalElements ?? 0))
      setPage(requestedPage)
    } catch (err) {
      setError(err.message || 'Unable to load your bookings.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadBookings(0)
  }, []) // Load the first page when this screen opens.

  async function handleLookup(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSelected(null)

    const pnr = pnrInput.trim()
    if (!pnr) {
      setError('Enter a PNR number.')
      return
    }

    setActionLoading(true)
    try {
      const response = await getBooking(pnr)
      setSelected(extractBooking(response))
    } catch (err) {
      setError(err.message || 'Could not find this booking.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAction(action) {
    const pnr = selected?.pnr
    if (!pnr) {
      setError('PNR is missing from the booking response.')
      return
    }

    const message = action === 'confirm'
      ? 'Confirm this pending booking using the development confirmation endpoint?'
      : 'Cancel this booking?'

    if (!window.confirm(message)) return

    setActionLoading(true)
    setError('')
    setNotice('')

    try {
      const response = action === 'confirm'
        ? await confirmBooking(pnr)
        : await cancelBooking(pnr)

      setSelected(extractBooking(response))
      setNotice(
        action === 'confirm'
          ? 'Confirmation request completed.'
          : 'Cancellation request completed.'
      )

      // Refresh history after a successful action.
      await loadBookings(page)
    } catch (err) {
      setError(err.message || 'The booking action failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const status = String(selected?.status || '').toUpperCase()
  const canConfirm = status === 'PENDING_PAYMENT'
  const canCancel = status === 'PENDING_PAYMENT' || status === 'CONFIRMED'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-50 p-3 text-blue-800">
            <Ticket size={25} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Bookings</h2>
            <p className="mt-1 text-sm text-slate-500">
              View your booking history or look up a ticket by PNR.
            </p>
          </div>
        </div>

        <form onSubmit={handleLookup} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={pnrInput}
            onChange={(event) => setPnrInput(event.target.value)}
            placeholder="Enter PNR number"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3 font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
          >
            <Search size={18} />
            Find booking
          </button>
        </form>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {selected && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">PNR</p>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-950">
                {selected.pnr || 'PNR unavailable'}
              </h3>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusStyle(selected.status)}`}>
              {selected.status || 'Status unavailable'}
            </span>
          </div>

          <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Train</p>
              <p className="mt-1 font-semibold">{selected.trainNo || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Journey date</p>
              <p className="mt-1 font-semibold">{selected.journeyDate || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Class</p>
              <p className="mt-1 font-semibold">{selected.classCode || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Refund</p>
              <p className="mt-1 font-semibold">
                {formatMoney(selected.refundPaise)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-sm font-semibold">
            <span>{selected.fromStation || selected.from?.code || '—'}</span>
            <ArrowRight size={17} className="text-slate-400" />
            <span>{selected.toStation || selected.to?.code || '—'}</span>
          </div>

          {Array.isArray(selected.passengers) && (
            <div className="mt-4">
              <h4 className="font-bold text-slate-900">Passengers</h4>
              <div className="mt-2 space-y-2">
                {selected.passengers.map((passenger, index) => (
                  <div key={passenger.id ?? index} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <span className="font-semibold">{passenger.name || `Passenger ${index + 1}`}</span>
                    {passenger.seatNumber && (
                      <span className="ml-2 text-slate-500">Seat: {passenger.seatNumber}</span>
                    )}
                    {passenger.berth && (
                      <span className="ml-2 text-slate-500">Berth: {passenger.berth}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {canConfirm && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction('confirm')}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 size={18} />
                {actionLoading ? 'Please wait...' : 'Confirm (Dev Test)'}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction('cancel')}
                className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <XCircle size={18} />
                Cancel booking
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close details
            </button>
          </div>

          {canConfirm && (
            <p className="mt-3 text-xs leading-5 text-amber-700">
              Development only: this button uses the mock confirmation endpoint, not a real payment gateway.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Booking history</h3>
            <p className="mt-1 text-sm text-slate-500">
              {totalElements} booking(s) · 5 per page
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadBookings(page)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-10 text-sm text-slate-500">
            <RefreshCw size={18} className="animate-spin" />
            Loading bookings...
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-10 text-center">
            <TrainFront className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-800">No bookings on this page</p>
            <p className="mt-1 text-sm text-slate-500">Try searching by PNR or look for a train.</p>
            {onSearchTrains && (
              <button
                type="button"
                onClick={onSearchTrains}
                className="mt-4 rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Search trains
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {bookings.map((booking, index) => (
              <article
                key={booking.pnr || booking.id || index}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      PNR: {booking.pnr || '—'}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(booking.status)}`}>
                      {booking.status || 'Unknown'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Train {booking.trainNo || '—'} · {booking.journeyDate || '—'} · {booking.classCode || '—'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {booking.fromStation || '—'} → {booking.toStation || '—'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!booking.pnr || actionLoading}
                  onClick={async () => {
                    setPnrInput(String(booking.pnr))
                    setError('')
                    setNotice('')
                    setActionLoading(true)
                    try {
                      const response = await getBooking(booking.pnr)
                      setSelected(extractBooking(response))
                    } catch (err) {
                      setError(err.message || 'Unable to load booking details.')
                    } finally {
                      setActionLoading(false)
                    }
                  }}
                  className="shrink-0 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  View details
                </button>
              </article>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={loading || page <= 0}
            onClick={() => loadBookings(page - 1)}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft size={17} /> Previous
          </button>
          <span className="text-sm text-slate-500">Page {page + 1}</span>
          <button
            type="button"
            disabled={loading || (page + 1) * pageSize >= totalElements}
            onClick={() => loadBookings(page + 1)}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Next <ChevronRight size={17} />
          </button>
        </div>
      </section>
    </div>
  )
}
