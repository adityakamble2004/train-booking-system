
import { useEffect, useState } from 'react';
import { accountRequest, ApiError } from '../api/accountClient';
import { Save, UserRound, LoaderCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

const initialProfile = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  preferredClass: 'SL',
  preferredBerth: 'NO_PREFERENCE',
  homeStationCode: '',
  language: 'en',
  notifyEmail: true,
  notifySms: false,
};

const trainClasses = [
  ['SL', 'Sleeper (SL)'],
  ['3A', 'AC 3 Tier (3A)'],
  ['2A', 'AC 2 Tier (2A)'],
  ['1A', 'AC First Class (1A)'],
  ['CC', 'Chair Car (CC)'],
  ['EC', 'Executive Chair Car (EC)'],
  ['2S', 'Second Sitting (2S)'],
  ['3E', 'AC 3 Economy (3E)'],
];

const berthOptions = [
  ['NO_PREFERENCE', 'No preference'],
  ['LOWER', 'Lower'],
  ['MIDDLE', 'Middle'],
  ['UPPER', 'Upper'],
  ['SIDE_LOWER', 'Side lower'],
  ['SIDE_UPPER', 'Side upper'],
];

function getErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === 'PROFILE_NOT_FOUND') {
      return 'Your profile was not found. Please contact support or check your account backend.';
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

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError('');

        const data = await accountRequest('/users/me/profile');

        if (!active) return;

        setProfile({
          ...initialProfile,
          ...data,
          fullName: data.fullName || '',
          dateOfBirth: data.dateOfBirth || '',
          gender: data.gender || '',
          preferredClass: data.preferredClass || 'SL',
          preferredBerth: data.preferredBerth || 'NO_PREFERENCE',
          homeStationCode: data.homeStationCode || '',
          language: data.language || 'en',
          notifyEmail: data.notifyEmail ?? true,
          notifySms: data.notifySms ?? false,
        });

        setEmail(data.email || '');
        setPhone(data.phone || '');
        setEmailVerified(Boolean(data.emailVerified));
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!profile.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (
      profile.homeStationCode &&
      !/^[a-zA-Z0-9]{1,15}$/.test(profile.homeStationCode)
    ) {
      setError('Home station code must contain only letters and numbers (maximum 15 characters).');
      return;
    }

    const body = {
      fullName: profile.fullName.trim(),
      gender: profile.gender || null,
      preferredClass: profile.preferredClass,
      preferredBerth: profile.preferredBerth,
      homeStationCode: profile.homeStationCode.trim() || null,
      language: profile.language,
      notifyEmail: profile.notifyEmail,
      notifySms: profile.notifySms,
    };

    if (profile.dateOfBirth) {
      body.dateOfBirth = profile.dateOfBirth;
    }

    try {
      setSaving(true);

      const data = await accountRequest('/users/me/profile', {
        method: 'PUT',
        body,
      });

      if (data) {
        setProfile((current) => ({
          ...current,
          ...data,
          dateOfBirth: data.dateOfBirth || '',
        }));
        setEmail(data.email || email);
        setPhone(data.phone || phone);
        setEmailVerified(Boolean(data.emailVerified));
      }

      setSuccess('Your profile has been saved successfully.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10';

  const labelClass = 'block text-sm font-medium text-slate-700';

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              My Profile
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your personal details and travel preferences.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-lg font-semibold text-slate-900">Personal information</h3>
          <p className="mt-1 text-sm text-slate-500">
            Your email and phone number are displayed as account information.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Full name *
              <input
                className={inputClass}
                name="fullName"
                value={profile.fullName}
                onChange={updateField}
                maxLength={100}
                required
                autoComplete="name"
                placeholder="Enter your full name"
              />
            </label>

            <label className={labelClass}>
              Email address
              <input
                className={`${inputClass} bg-slate-50`}
                value={email}
                readOnly
                placeholder="Not available"
              />
              <span className="mt-1 block text-xs text-slate-500">
                {emailVerified ? 'Email verified' : 'Email verification status is not verified'}
              </span>
            </label>

            <label className={labelClass}>
              Phone number
              <input
                className={`${inputClass} bg-slate-50`}
                value={phone}
                readOnly
                placeholder="Not available"
              />
            </label>

            <label className={labelClass}>
              Date of birth
              <input
                className={inputClass}
                type="date"
                name="dateOfBirth"
                value={profile.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={updateField}
              />
            </label>

            <label className={labelClass}>
              Gender
              <select className={inputClass} name="gender" value={profile.gender} onChange={updateField}>
                <option value="">Prefer not to specify</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </label>

            <label className={labelClass}>
              Home station code
              <input
                className={inputClass}
                name="homeStationCode"
                value={profile.homeStationCode}
                onChange={updateField}
                maxLength={15}
                placeholder="e.g. PUNE"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-lg font-semibold text-slate-900">Travel preferences</h3>
          <p className="mt-1 text-sm text-slate-500">
            Set your preferred class and berth for future journeys.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Preferred train class
              <select className={inputClass} name="preferredClass" value={profile.preferredClass} onChange={updateField}>
                {trainClasses.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Preferred berth
              <select className={inputClass} name="preferredBerth" value={profile.preferredBerth} onChange={updateField}>
                {berthOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Language
              <select className={inputClass} name="language" value={profile.language} onChange={updateField}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
          <p className="mt-1 text-sm text-slate-500">
            Choose which notifications you want to receive.
          </p>

          <div className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <span>
                <span className="block text-sm font-medium text-slate-800">Email notifications</span>
                <span className="mt-1 block text-xs text-slate-500">Receive updates by email.</span>
              </span>
              <input
                className="h-5 w-5 accent-cyan-600"
                type="checkbox"
                name="notifyEmail"
                checked={profile.notifyEmail}
                onChange={updateField}
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <span>
                <span className="block text-sm font-medium text-slate-800">SMS notifications</span>
                <span className="mt-1 block text-xs text-slate-500">Receive updates by text message.</span>
              </span>
              <input
                className="h-5 w-5 accent-cyan-600"
                type="checkbox"
                name="notifySms"
                checked={profile.notifySms}
                onChange={updateField}
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
