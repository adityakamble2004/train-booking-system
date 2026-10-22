
import { useEffect, useState } from 'react';
import {
  UsersRound, UserPlus, Pencil, Trash2, X, Save,
  LoaderCircle, AlertCircle, CheckCircle2, UserRound
} from 'lucide-react';
import { accountRequest, ApiError } from '../api/accountClient';

const emptyPassenger = {
  name: '',
  dateOfBirth: '',
  gender: '',
  berthPreference: 'NO_PREFERENCE',
  idType: '',
  idLast4: '',
};

const berthOptions = [
  ['NO_PREFERENCE', 'No preference'],
  ['LOWER', 'Lower'],
  ['MIDDLE', 'Middle'],
  ['UPPER', 'Upper'],
  ['SIDE_LOWER', 'Side lower'],
  ['SIDE_UPPER', 'Side upper'],
];

const idOptions = [
  ['AADHAAR', 'Aadhaar'],
  ['PASSPORT', 'Passport'],
  ['DRIVING_LICENCE', 'Driving licence'],
  ['VOTER_ID', 'Voter ID'],
  ['PAN', 'PAN'],
];

function getErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === 'PASSENGER_LIMIT_REACHED') {
      return 'You have reached the maximum of 20 saved passengers. Delete a passenger before adding another.';
    }

    if (error.code === 'PASSENGER_NOT_FOUND') {
      return 'This passenger could not be found. Refresh the list and try again.';
    }

    if (error.fieldErrors?.length) {
      return error.fieldErrors
        .map((item) => `${item.field}: ${item.message}`)
        .join(' ');
    }

    return error.message;
  }

  return error?.message || 'Something went wrong. Please try again.';
}

function getPassengerList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.passengers)) return response.passengers;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export default function PassengersPage() {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyPassenger);

  async function loadPassengers() {
    setLoading(true);
    setError('');

    try {
      const response = await accountRequest('/users/me/passengers');
      setPassengers(getPassengerList(response));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPassengers();
  }, []);

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyPassenger });
    setError('');
    setSuccess('');
    setFormOpen(true);
  }

  function openEditForm(passenger) {
    setEditingId(passenger.id);
    setForm({
      name: passenger.name || '',
      dateOfBirth: passenger.dateOfBirth || '',
      gender: passenger.gender || '',
      berthPreference: passenger.berthPreference || 'NO_PREFERENCE',
      idType: passenger.idType || '',
      idLast4: passenger.idLast4 || '',
    });
    setError('');
    setSuccess('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm({ ...emptyPassenger });
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.dateOfBirth || !form.gender) {
      setError('Please fill in the passenger name, date of birth, and gender.');
      return;
    }

    if (Boolean(form.idType) !== Boolean(form.idLast4.trim())) {
      setError('Enter both the ID type and the last four ID digits, or leave both empty.');
      return;
    }

    if (form.idLast4 && !/^\d{4}$/.test(form.idLast4)) {
      setError('The last four ID digits must contain exactly four numbers.');
      return;
    }

    const body = {
      name: form.name.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      berthPreference: form.berthPreference,
    };

    if (form.idType && form.idLast4) {
      body.idType = form.idType;
      body.idLast4 = form.idLast4;
    }

    try {
      setSaving(true);

      if (editingId !== null) {
        await accountRequest(`/users/me/passengers/${editingId}`, {
          method: 'PUT',
          body,
        });
        setSuccess('Passenger details updated successfully.');
      } else {
        await accountRequest('/users/me/passengers', {
          method: 'POST',
          body,
        });
        setSuccess('Passenger added successfully.');
      }

      closeForm();
      await loadPassengers();
      setSuccess(
        editingId !== null
          ? 'Passenger details updated successfully.'
          : 'Passenger added successfully.'
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deletePassenger(passenger) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${passenger.name}?`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await accountRequest(`/users/me/passengers/${passenger.id}`, {
        method: 'DELETE',
      });
      setPassengers((current) =>
        current.filter((item) => item.id !== passenger.id)
      );
      setSuccess(`${passenger.name} was deleted successfully.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10';

  const labelClass = 'block text-sm font-medium text-slate-700';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
            <UsersRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Saved Passengers
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage passenger details for future journeys.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          disabled={passengers.length >= 20}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          Add passenger
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {formOpen && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId !== null ? 'Edit passenger' : 'Add a passenger'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Fields marked * are required.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close passenger form"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>
                Passenger full name *
                <input
                  className={inputClass}
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  maxLength={100}
                  autoComplete="off"
                  required
                  placeholder="Enter full name"
                />
              </label>

              <label className={labelClass}>
                Date of birth *
                <input
                  className={inputClass}
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={updateField}
                  required
                />
              </label>

              <label className={labelClass}>
                Gender *
                <select
                  className={inputClass}
                  name="gender"
                  value={form.gender}
                  onChange={updateField}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </label>

              <label className={labelClass}>
                Preferred berth
                <select
                  className={inputClass}
                  name="berthPreference"
                  value={form.berthPreference}
                  onChange={updateField}
                >
                  {berthOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                ID type (optional)
                <select
                  className={inputClass}
                  name="idType"
                  value={form.idType}
                  onChange={updateField}
                >
                  <option value="">No ID saved</option>
                  {idOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Last 4 ID digits (optional)
                <input
                  className={inputClass}
                  name="idLast4"
                  value={form.idLast4}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      idLast4: event.target.value.replace(/\D/g, '').slice(0, 4),
                    }))
                  }
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save passenger'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading passengers...
        </div>
      ) : passengers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <UserRound className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No saved passengers yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Add passenger details here to manage them from your account.
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            Add your first passenger
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {passengers.map((passenger) => (
            <article
              key={passenger.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">
                      {passenger.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {passenger.gender === 'M'
                        ? 'Male'
                        : passenger.gender === 'F'
                          ? 'Female'
                          : passenger.gender === 'O'
                            ? 'Other'
                            : passenger.gender || 'Gender not specified'}
                      {' · '}
                      {passenger.dateOfBirth || 'Date of birth not available'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEditForm(passenger)}
                    aria-label={`Edit ${passenger.name}`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-cyan-50 hover:text-cyan-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePassenger(passenger)}
                    aria-label={`Delete ${passenger.name}`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Preferred berth
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {berthOptions.find(([value]) => value === passenger.berthPreference)?.[1]
                    || 'No preference'}
                </p>

                {passenger.idType && (
                  <p className="mt-3 text-sm text-slate-500">
                    {idOptions.find(([value]) => value === passenger.idType)?.[1]
                      || passenger.idType}
                    {passenger.idLast4 ? ` · •••• ${passenger.idLast4}` : ''}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
