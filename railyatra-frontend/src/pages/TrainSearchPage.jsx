
import { useEffect, useRef, useState } from 'react';
import {
  Search,
  TrainFront,
  ArrowRight,
  Clock,
  MapPin,
  RefreshCw,
  IndianRupee,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';

import { suggestStations, searchTrains } from '../api/trainApi';
import { getAvailability } from '../api/availabilityApi';

const initialSearch = {
  from: null,
  to: null,
  date: new Date().toISOString().slice(0, 10),
};

const classNames = {
  '1A': 'AC First Class',
  '2A': 'AC 2 Tier',
  '3A': 'AC 3 Tier',
  '3E': 'AC 3 Economy',
  SL: 'Sleeper',
  CC: 'AC Chair Car',
  EC: 'Executive Chair Car',
  '2S': 'Second Sitting',
};

function formatFare(value) {
  if (value == null || Number.isNaN(Number(value))) return 'Fare unavailable';

  // Existing availability UI treats farePaise as paise.
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) / 100);
}

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.';
}

function StationField({ label, value, onSelect, onClear }) {
  const [text, setText] = useState(value?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setText(value?.name || '');
  }, [value]);

  useEffect(() => {
    const query = text.trim();

    if (value && query === value.name) {
      setSuggestions([]);
      setError('');
      return;
    }

    if (query.length < 2) {
      setSuggestions([]);
      setError('');
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const data = await suggestStations(query);

        if (!cancelled) {
          setSuggestions(Array.isArray(data) ? data : []);
          setOpen(true);
        }
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, value]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function handleTextChange(event) {
    const nextText = event.target.value;
    setText(nextText);
    setOpen(true);

    if (value) onClear();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-2 block text-sm font-semibold text-slate-300">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 focus-within:border-cyan-400">
        <MapPin className="h-5 w-5 shrink-0 text-cyan-400" />

        <input
          value={text}
          onChange={handleTextChange}
          onFocus={() => {
            if (text.trim().length >= 2 && !value) setOpen(true);
          }}
          placeholder="Type station name or code"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
        />

        {loading && (
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
        )}

        {value && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
        )}
      </div>

      {open && !value && suggestions.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
          {suggestions.map((station) => (
            <button
              key={`${station.code}-${station.name}`}
              type="button"
              onClick={() => {
                onSelect(station);
                setText(station.name);
                setSuggestions([]);
                setOpen(false);
                setError('');
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-white/10"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-white">
                  {station.name}
                </span>
                <span className="text-xs text-slate-400">
                  Select this station
                </span>
              </span>
              <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-sm font-bold text-cyan-300">
                {station.code}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && !value && !loading && text.trim().length >= 2 &&
        suggestions.length === 0 && !error && (
          <div className="absolute z-30 mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-400">
            No stations found. Try another name or code.
          </div>
        )}

      {error && (
        <p className="mt-2 text-sm text-rose-400">{error}</p>
      )}

      {value && (
        <p className="mt-1 text-xs text-emerald-400">
          Selected: {value.name} ({value.code})
        </p>
      )}
    </div>
  );
}

export default function TrainSearchPage({ onBook }) {
  const [search, setSearch] = useState(initialSearch);
  const [trains, setTrains] = useState([]);
  const [loadingTrains, setLoadingTrains] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selectedTrain, setSelectedTrain] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  const [selectedClass, setSelectedClass] = useState('');

  function updateStation(field, station) {
    setSearch((current) => ({ ...current, [field]: station }));
    setTrains([]);
    setSelectedTrain(null);
    setAvailability(null);
    setSelectedClass('');
    setAvailabilityError('');
  }

  async function handleSearch(event) {
    event.preventDefault();
    setSearchError('');
    setAvailabilityError('');
    setTrains([]);
    setSelectedTrain(null);
    setAvailability(null);
    setSelectedClass('');

    if (!search.from || !search.to) {
      setSearchError('Please select both From and To stations from the suggestions.');
      return;
    }

    if (search.from.code === search.to.code) {
      setSearchError('From and To stations must be different.');
      return;
    }

    if (!search.date) {
      setSearchError('Please select your journey date.');
      return;
    }

    setLoadingTrains(true);

    try {
      const data = await searchTrains({
        from: search.from.code,
        to: search.to.code,
      });

      setTrains(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        setSearchError('No trains found for this route.');
      }
    } catch (error) {
      setSearchError(getErrorMessage(error));
    } finally {
      setLoadingTrains(false);
    }
  }

  async function handleAvailability(train) {
    setSelectedTrain(train);
    setAvailability(null);
    setSelectedClass('');
    setAvailabilityError('');
    setLoadingAvailability(true);

    try {
      const data = await getAvailability({
        trainNo: train.trainNo,
        date: search.date,
        from: search.from.code,
        to: search.to.code,
      });

      setAvailability(data);
    } catch (error) {
      setAvailabilityError(getErrorMessage(error));
    } finally {
      setLoadingAvailability(false);
    }
  }

  function continueBooking(classCode) {
    if (!selectedTrain || !availability || !classCode) return;

    const fromStation = availability.from?.code || search.from.code;
    const toStation = availability.to?.code || search.to.code;

    onBook({
      trainNo: selectedTrain.trainNo,
      trainName: selectedTrain.trainName,
      journeyDate: search.date,
      fromStation,
      toStation,
      classCode,
      contactEmail: '',
      contactPhone: '',
      passengers: [],
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
            <TrainFront className="h-4 w-4" />
            RailYatra
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Find your next journey
          </h1>

          <p className="mt-2 text-slate-400">
            Choose your stations, find a train, and check seat availability.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-7"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <StationField
              label="From"
              value={search.from}
              onSelect={(station) => updateStation('from', station)}
              onClear={() => updateStation('from', null)}
            />

            <StationField
              label="To"
              value={search.to}
              onSelect={(station) => updateStation('to', station)}
              onClear={() => updateStation('to', null)}
            />
          </div>

          <div className="mt-5 max-w-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Journey date
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
              <input
                type="date"
                value={search.date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => {
                  setSearch((current) => ({ ...current, date: event.target.value }));
                  setTrains([]);
                  setSelectedTrain(null);
                  setAvailability(null);
                  setSelectedClass('');
                }}
                className="w-full bg-transparent text-white outline-none [color-scheme:dark]"
                required
              />
            </div>
          </div>

          {searchError && (
            <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-300">
              {searchError}
            </p>
          )}

          <button
            type="submit"
            disabled={loadingTrains}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingTrains ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            {loadingTrains ? 'Searching trains...' : 'Search trains'}
          </button>
        </form>

        {trains.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Available trains</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {search.from.name} ({search.from.code}) to {search.to.name} ({search.to.code})
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                {trains.length} train{trains.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-4">
              {trains.map((train, index) => (
                <article
                  key={`${train.trainNo}-${index}`}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrainFront className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold">
                          {train.trainName || `Train ${train.trainNo}`}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        Train No. {train.trainNo}
                      </p>
                    </div>

                    <div className="flex flex-1 items-center justify-start gap-5 md:justify-center">
                      <div>
                        <p className="text-xl font-bold">
                          {train.from?.departure || '--:--'}
                        </p>
                        <p className="text-sm text-slate-400">
                          {train.from?.code || search.from.code}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="h-px w-8 bg-slate-700" />
                        <ArrowRight className="h-4 w-4" />
                        <span className="h-px w-8 bg-slate-700" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">
                          {train.to?.arrival || '--:--'}
                        </p>
                        <p className="text-sm text-slate-400">
                          {train.to?.code || search.to.code}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAvailability(train)}
                      disabled={loadingAvailability}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-semibold text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-50"
                    >
                      {loadingAvailability && selectedTrain?.trainNo === train.trainNo ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Check availability
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {selectedTrain && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-7">
            <div>
              <h2 className="text-2xl font-bold">Seat availability</h2>
              <p className="mt-1 text-sm text-slate-400">
                {selectedTrain.trainName || `Train ${selectedTrain.trainNo}`} · {selectedTrain.trainNo} · {search.date}
              </p>
            </div>

            {loadingAvailability && (
              <div className="mt-6 flex items-center gap-3 text-cyan-300">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading availability...
              </div>
            )}

            {availabilityError && (
              <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-300">
                {availabilityError}
              </p>
            )}

            {availability && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {(availability.classes || []).map((item) => {
                  const code = item.classCode || item.code || item.travelClass;
                  const available = Number(item.availableSeats ?? item.available ?? 0);
                  const soldOut = available <= 0 ||
                    String(item.status || '').toUpperCase() === 'SOLD_OUT';

                  return (
                    <article
                      key={code}
                      className="rounded-xl border border-white/10 bg-slate-950/70 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">{classNames[code] || code || 'Travel class'}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            Class code: {code || 'N/A'}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          soldOut
                            ? 'bg-rose-400/10 text-rose-300'
                            : 'bg-emerald-400/10 text-emerald-300'
                        }`}>
                          {soldOut ? 'Sold out' : `${available} seats available`}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-slate-300">
                          <IndianRupee className="h-5 w-5 text-cyan-300" />
                          <span className="text-xl font-bold">
                            {formatFare(item.farePaise ?? item.fare ?? item.amountPaise)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={soldOut}
                          onClick={() => {
                            setSelectedClass(code);
                            continueBooking(code);
                          }}
                          className="rounded-lg bg-cyan-400 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {soldOut ? 'Unavailable' : 'Book'}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {(!availability.classes || availability.classes.length === 0) && (
                  <p className="text-sm text-slate-400">
                    Availability was returned, but no class list was found. Check the exact response structure from the API.
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
