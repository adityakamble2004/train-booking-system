
import { useState } from 'react';
import {
  LockKeyhole,
  Eye,
  EyeOff,
  LoaderCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { accountRequest, ApiError } from '../api/accountClient';
import { useAuth } from '../auth/AuthProvider';

export default function PasswordPage() {
  const { logout } = useAuth();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [visible, setVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setSuccess('');
  }

  function toggleVisibility(field) {
    setVisible((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  function getErrorMessage(err) {
    if (err instanceof ApiError) {
      if (err.code === 'WRONG_CURRENT_PASSWORD') {
        return 'Your current password is incorrect.';
      }

      if (err.code === 'SAME_PASSWORD') {
        return 'Your new password must be different from your current password.';
      }

      if (err.fieldErrors?.length) {
        return err.fieldErrors
          .map((item) => `${item.field}: ${item.message}`)
          .join(' ');
      }

      return err.message;
    }

    return err?.message || 'Unable to change your password. Please try again.';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (form.newPassword.length < 8 || form.newPassword.length > 72) {
      setError('Your new password must be between 8 and 72 characters.');
      return;
    }

    if (!/[A-Za-z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
      setError('Your new password must contain at least one letter and one number.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('The new password and confirmation do not match.');
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError('Your new password must be different from your current password.');
      return;
    }

    try {
      setLoading(true);

      await accountRequest('/users/me/password', {
        method: 'PUT',
        body: {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        },
      });

      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setSuccess('Your password has been changed. You will now be signed out.');

      // The backend revokes refresh tokens after a password change.
      // Sign out locally too, even if the logout request is no longer authorized.
      window.alert('Password changed successfully. Please sign in again with your new password.');

      try {
        await logout();
      } catch {
        // AuthProvider clears the local session even if the logout request fails.
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10';

  function PasswordField({ name, label, placeholder, autoComplete }) {
    return (
      <label className="block text-sm font-medium text-slate-700">
        {label}
        <span className="relative block">
          <input
            className={inputClass}
            type={visible[name] ? 'text' : 'password'}
            name={name}
            value={form[name]}
            onChange={updateField}
            autoComplete={autoComplete}
            placeholder={placeholder}
            required
          />
          <button
            type="button"
            onClick={() => toggleVisibility(name)}
            aria-label={visible[name] ? `Hide ${label}` : `Show ${label}`}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
          >
            {visible[name] ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </span>
      </label>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Change Password
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update your password to keep your account secure.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <PasswordField
          name="currentPassword"
          label="Current password"
          placeholder="Enter your current password"
          autoComplete="current-password"
        />

        <PasswordField
          name="newPassword"
          label="New password"
          placeholder="Enter your new password"
          autoComplete="new-password"
        />

        <p className="-mt-3 text-xs text-slate-500">
          Use 8–72 characters, including at least one letter and one number.
        </p>

        <PasswordField
          name="confirmPassword"
          label="Confirm new password"
          placeholder="Enter your new password again"
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <LockKeyhole className="h-5 w-5" />
          )}
          {loading ? 'Updating password...' : 'Change password'}
        </button>
      </form>
    </div>
  );
}
