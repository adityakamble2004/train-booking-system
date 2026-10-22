
import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, TrainFront } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'

export default function AuthPage() {
  const { login, register } = useAuth()

  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState([])

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  })

  const isRegister = mode === 'register'

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setFieldErrors([])
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setSuccess('')
    setFieldErrors([])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    setFieldErrors([])

    try {
      if (isRegister) {
        if (!/[A-Za-z]/.test(form.password) ||
            !/[0-9]/.test(form.password)) {
          throw new Error(
            'Password must contain at least one letter and one digit.',
          )
        }

        const details = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
        }

        // The backend treats an empty phone string as invalid.
        if (form.phone.trim()) {
          details.phone = form.phone.trim()
        }

        const data = await register(details)

        if (data.accessToken && data.user) {
          setSuccess('Your account has been created.')
        } else {
          setSuccess('Account created. Please sign in.')
          setMode('login')
        }
      } else {
        await login({
          email: form.email.trim(),
          password: form.password,
        })
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setFieldErrors(err.fieldErrors || [])
    } finally {
      setBusy(false)
    }
  }

  function fieldError(name) {
    return fieldErrors.find((item) => item.field === name)?.message
  }

  const inputClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10'

  return (
    <main className="flex min-h-screen bg-white">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <div className="absolute -right-24 top-1/4 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-8 top-1/3 h-64 w-64 rounded-full border border-white/10" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
            <TrainFront size={27} />
          </span>
          <div>
            <p className="text-xl font-extrabold">RailYatra</p>
            <p className="text-xs text-blue-200">Your journey, simplified</p>
          </div>
        </div>

        <div className="relative max-w-lg py-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            A smarter way to travel
          </p>
          <h1 className="mt-5 text-5xl font-extrabold leading-tight tracking-tight">
            Your journeys.
            <br />
            Your people.
            <br />
            One place.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-blue-100">
            Manage your travel profile, keep passenger details organized,
            and stay in control of your account.
          </p>
        </div>

        <p className="relative text-xs text-blue-200">
          RailYatra · Travel made simpler
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-950 text-cyan-300">
              <TrainFront size={24} />
            </span>
            <span className="text-xl font-extrabold">RailYatra</span>
          </div>

          <p className="text-sm font-bold uppercase tracking-widest text-cyan-700">
            Your travel account
          </p>

          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {isRegister
              ? 'Set up your account to manage your travel details.'
              : 'Sign in to manage your profile and passengers.'}
          </p>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-lg py-2.5 text-sm font-semibold ${
                !isRegister
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-lg py-2.5 text-sm font-semibold ${
                isRegister
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Create account
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <>
                <div>
                  <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={updateField}
                    className={inputClass}
                    placeholder="Enter your full name"
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                  {fieldError('fullName') && (
                    <p className="mt-1 text-xs text-red-600">{fieldError('fullName')}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                    Phone number <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    value={form.phone}
                    onChange={updateField}
                    className={inputClass}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                  />
                  {fieldError('phone') && (
                    <p className="mt-1 text-xs text-red-600">{fieldError('phone')}</p>
                  )}
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                className={inputClass}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              {fieldError('email') && (
                <p className="mt-1 text-xs text-red-600">{fieldError('email')}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={updateField}
                  className={`${inputClass} pr-12`}
                  placeholder={isRegister ? '8–72 characters' : 'Enter your password'}
                  minLength={isRegister ? 8 : undefined}
                  maxLength={72}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
              {fieldError('password') && (
                <p className="mt-1 text-xs text-red-600">{fieldError('password')}</p>
              )}
              {isRegister && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Use 8–72 characters, including at least one letter and one digit.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/10 transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? 'Please wait…'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Your account requests are securely connected to the RailYatra server.
          </p>
        </div>
      </section>
    </main>
  )
}
