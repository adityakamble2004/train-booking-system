
import { useState } from 'react';
import {
  Search,
  TrainFront,
  ArrowRight,
  Clock,
  MapPin,
  RefreshCw,
  IndianRupee
} from 'lucide-react';

import { getAvailability } from '../api/availabilityApi';

const initialSearch = {
  trainNo: '01488',
  date: '2026-10-28',
  from: 'HGL',
  to: 'KWV'
};

const formatFare = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(paise / 100);

const classNames = {
  '1A': 'AC First Class',
  '2A': 'AC 2 Tier',
  '3A': 'AC 3 Tier',
  '3E': 'AC 3 Economy',
  SL: 'Sleeper',
  CC: 'AC Chair Car',
  EC: 'Executive Chair Car',
  '2S': 'Second Sitting'
};

export default function TrainSearchPage({ onBook }) {
  const [search, setSearch] = useState(initialSearch);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateField(event) {
    const { name, value } = event.target;

    setSearch((current) => ({
      ...current,
      [name]: value.toUpperCase() === value
        ? value
        : value
    }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await getAvailability(search);
      setResult(data);
    } catch (err) {
      setError(
        err.message || 'Unable to fetch train availability.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          RailYatra · Passenger
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Find your train
        </h1>
        <p className="mt-2 text-slate-500">
          Search a journey and check seat availability before booking.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="text-sm font-medium text-slate-700">
          Train number
          <input
            name="trainNo"
            value={search.trainNo}
            onChange={updateField}
            required
            maxLength={10}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="01488"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Journey date
          <input
            name="date"
            type="date"
            value={search.date}
            onChange={updateField}
            required
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          From station
          <input
            name="from"
            value={search.from}
            onChange={updateField}
            required
            maxLength={15}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="HGL"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          To station
          <input
            name="to"
            value={search.to}
            onChange={updateField}
            required
            maxLength={15}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="KWV"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 self-end rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
          {loading ? 'Searching...' : 'Search trains'}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {result && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <TrainFront className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {result.trainName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Train {result.trainNo} · {result.journeyDate}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {result.from?.time}
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {result.from?.code}
                </p>
                <p className="text-sm text-slate-500">
                  {result.from?.name}
                </p>
              </div>

              <div className="flex flex-col items-center gap-1 text-slate-400">
                <ArrowRight className="h-5 w-5" />
                <span className="text-xs">Route</span>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">
                  {result.to?.time}
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {result.to?.code}
                </p>
                <p className="text-sm text-slate-500">
                  {result.to?.name}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Available classes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a class to continue with your booking.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {result.classes?.map((item) => {
              const available = item.availableSeats > 0;

              return (
                <article
                  key={item.classCode}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {item.classCode}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {classNames[item.classCode] || 'Travel class'}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        available
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        Available seats
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {item.availableSeats}
                        <span className="text-sm font-normal text-slate-400">
                          {' '}/ {item.totalSeats}
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-slate-500">Fare</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {formatFare(item.farePaise)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!available || !onBook}
                    onClick={() => onBook?.({
                      trainNo: result.trainNo,
                      journeyDate: result.journeyDate,
                      fromStation: result.from.code,
                      toStation: result.to.code,
                      classCode: item.classCode,
                      contactEmail: '',
                      passengers: []
                    })}
                    className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {available ? 'Continue to booking' : 'Sold out'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!result && !loading && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <MapPin className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-800">
            Ready to find your train?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your journey details above and select Search trains.
          </p>
        </div>
      )}
    </div>
  );
}
