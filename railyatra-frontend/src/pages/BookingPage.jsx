
import { useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Plus, Trash2, TrainFront } from 'lucide-react'
import { createBooking } from '../api/bookingApi'

const newPassenger = () => ({
  name: '',
  dateOfBirth: '',
  gender: 'M',
  berthPreference: 'NO_PREFERENCE',
})

function findPnr(data) {
  return data?.pnr ?? data?.booking?.pnr ?? data?.data?.pnr ?? ''
}

export default function BookingPage({ bookingDetails, user, onBack, onNewSearch }) {
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [passengers, setPassengers] = useState([newPassenger()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const requestRef = useRef({ fingerprint: '', key: '' })

  if (!bookingDetails) {
    return (
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-bold">No journey selected</h2>
        <p className="mt-2 text-sm text-slate-600">
          Return to train search and select an available class.
        </p>
        <button onClick={onBack} className="mt-4 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white">
          Back to train search
        </button>
      </section>
    )
  }

  function updatePassenger(index, field, value) {
    setPassengers(current => current.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      trainNo: String(bookingDetails.trainNo),
      journeyDate: bookingDetails.journeyDate,
      fromStation: bookingDetails.fromStation,
      toStation: bookingDetails.toStation,
      classCode: bookingDetails.classCode,
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
      passengers: passengers.map(p => ({
        name: p.name.trim(),
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        berthPreference: p.berthPreference,
      })),
    }

    // Reuse the same key if the exact same request is retried.
    const fingerprint = JSON.stringify(payload)
    if (!requestRef.current.key || requestRef.current.fingerprint !== fingerprint) {
      requestRef.current = {
        fingerprint,
        key: globalThis.crypto?.randomUUID?.() ||
          `ry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }
    }

    setLoading(true)
    try {
      const response = await createBooking(payload, requestRef.current.key)
      setConfirmation({ response, pnr: findPnr(response) })
      requestRef.current = { fingerprint: '', key: '' }
    } catch (err) {
      setError(err.message || 'Booking failed. Please check your details and retry.')
    } finally {
      setLoading(false)
    }
  }

  if (confirmation) {
    return (
      <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-emerald-200 bg-white">
        <div className="bg-emerald-700 px-6 py-8 text-center text-white">
          <CheckCircle2 className="mx-auto h-14 w-14" />
          <h2 className="mt-3 text-2xl font-extrabold">Booking request successful</h2>
          <p className="mt-2 text-sm">The backend accepted your booking request.</p>
        </div>
        <div className="p-6 text-center sm:p-10">
          {confirmation.pnr ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Your PNR</p>
              <p className="mt-2 text-4xl font-extrabold tracking-wider">{confirmation.pnr}</p>
            </>
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-left text-sm text-amber-800">
              Booking succeeded, but the PNR wasn't found at the expected response fields. Inspect the API response below.
            </p>
          )}

          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-left">
            <h3 className="font-bold">Journey details</h3>
            <p className="mt-2 text-sm text-slate-600">
              Train {bookingDetails.trainNo} · {bookingDetails.journeyDate}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {bookingDetails.fromStation} → {bookingDetails.toStation} · Class {bookingDetails.classCode}
            </p>
            <p className="mt-1 text-sm text-slate-600">Passengers: {passengers.length}</p>
          </div>

          <details className="mt-5 rounded-xl border p-4 text-left">
            <summary className="cursor-pointer text-sm font-semibold">View API response</summary>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs">
              {JSON.stringify(confirmation.response, null, 2)}
            </pre>
          </details>

          <button onClick={onNewSearch} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
            Search another train
          </button>
        </div>
      </section>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
        <ArrowLeft size={17} /> Back to search results
      </button>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><TrainFront size={26} /></div>
          <div>
            <h2 className="text-xl font-bold">Review your journey</h2>
            <p className="mt-1 text-sm text-slate-500">Train {bookingDetails.trainNo} · {bookingDetails.journeyDate}</p>
            <p className="mt-1 font-semibold">{bookingDetails.fromStation} → {bookingDetails.toStation} · Class {bookingDetails.classCode}</p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Contact details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Email address
              <input
                type="email" required maxLength={254} value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"
                placeholder="you@example.com"
              />
            </label>
            <label className="text-sm font-semibold">
              Mobile number
              <input
                type="tel" required pattern="[6-9][0-9]{9}"
                title="Enter a 10-digit Indian mobile number starting with 6–9."
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"
                placeholder="9876543210"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Passenger details</h2>
            <p className="mt-1 text-sm text-slate-500">Add up to 6 passengers for this booking.</p>
          </div>

          {passengers.map((p, index) => (
            <article key={index} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">Passenger {index + 1}</h3>
                {passengers.length > 1 && (
                  <button type="button" onClick={() => setPassengers(current => current.filter((_, i) => i !== index))} className="text-sm font-semibold text-red-600">
                    <Trash2 className="mr-1 inline" size={15} /> Remove
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold sm:col-span-2">
                  Full name
                  <input required maxLength={100} value={p.name} onChange={e => updatePassenger(index, 'name', e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal" />
                </label>
                <label className="text-sm font-semibold">
                  Date of birth
                  <input type="date" required max={today} value={p.dateOfBirth} onChange={e => updatePassenger(index, 'dateOfBirth', e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal" />
                </label>
                <label className="text-sm font-semibold">
                  Gender
                  <select value={p.gender} onChange={e => updatePassenger(index, 'gender', e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-3 font-normal">
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </label>
                <label className="text-sm font-semibold sm:col-span-2">
                  Berth preference
                  <select value={p.berthPreference} onChange={e => updatePassenger(index, 'berthPreference', e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-3 font-normal">
                    <option value="NO_PREFERENCE">No preference</option>
                    <option value="LOWER">Lower</option>
                    <option value="MIDDLE">Middle</option>
                    <option value="UPPER">Upper</option>
                    <option value="SIDE_LOWER">Side lower</option>
                    <option value="SIDE_UPPER">Side upper</option>
                  </select>
                </label>
              </div>
            </article>
          ))}

          <button
            type="button"
            disabled={passengers.length >= 6}
            onClick={() => setPassengers(current => [...current, newPassenger()])}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 disabled:opacity-50"
          >
            <Plus size={17} /> Add passenger
          </button>
        </section>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-700 px-5 py-4 font-bold text-white hover:bg-blue-800 disabled:opacity-60">
          {loading ? 'Submitting booking...' : 'Confirm booking'}
        </button>
      </form>
    </div>
  )
}
