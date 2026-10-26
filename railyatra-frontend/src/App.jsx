
import { useState } from 'react'
import {
  TrainFront,
  LayoutDashboard,
  UserRound,
  UsersRound,
  ShieldCheck,
  Menu,
  X,
  ArrowUpRight,
  ChevronRight,
  Bell,
  MapPin,
  Clock3,
  Settings,
  LogOut,
  Train,
  Ticket,
  Search,
  Sparkles,
  CircleCheck,
  Compass,
  CalendarDays,
} from 'lucide-react'

import { useAuth } from './auth/AuthProvider'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import PassengersPage from './pages/PassengersPage'
import PasswordPage from './pages/PasswordPage'
import AdminJourneysPage from './pages/AdminJourneysPage'
import TrainSearchPage from './pages/TrainSearchPage'
import BookingPage from './pages/BookingPage'
import MyBookingsPage from './pages/MyBookingsPage'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Train Search', path: '/trains', icon: Train },
  { label: 'My Bookings', path: '/bookings', icon: Ticket },
  { label: 'My Profile', path: '/profile', icon: UserRound },
  { label: 'Passengers', path: '/passengers', icon: UsersRound },
  {
    label: 'Password & Security',
    path: '/settings/password',
    icon: ShieldCheck,
  },
]

const pageTitles = {
  '/dashboard': [
    'Welcome to RailYatra',
    'Your travel account, all in one place.',
  ],
  '/profile': [
    'My Profile',
    'Manage your personal information and preferences.',
  ],
  '/passengers': [
    'Saved Passengers',
    'Manage passenger details for your journeys.',
  ],
  '/settings/password': [
    'Password & Security',
    'Keep your account secure.',
  ],
  '/admin/journeys': [
    'Admin Panel',
    'Create and review train journeys.',
  ],
  '/booking': [
    'Complete Your Booking',
    'Enter passenger details and confirm your journey.',
  ],
  '/bookings': [
    'My Bookings',
    'View your tickets, booking status, and cancellations.',
  ],
  '/trains': [
    'Find Your Train',
    'Search routes and plan your next journey.',
  ],
}

function App() {
  const { user, loading, logout } = useAuth()

  const [page, setPage] = useState('/dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const role = String(user?.role || '').toUpperCase()
  const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN'

  const visibleNavItems = isAdmin
    ? [
        ...navItems,
        {
          label: 'Admin Panel',
          path: '/admin/journeys',
          icon: ShieldCheck,
        },
      ]
    : navItems

  const [title, subtitle] =
    pageTitles[page] || pageTitles['/dashboard']

  function navigate(path) {
    setPage(path)
    setMenuOpen(false)
  }

  function startBooking(bookingDetails) {
    setSelectedBooking(bookingDetails)
    navigate('/booking')
  }

  async function handleLogout() {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      await logout()
    } catch {
      // AuthProvider handles the local session.
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-[#071b3a] text-cyan-300 shadow-xl shadow-blue-950/15">
            <TrainFront size={32} />
          </div>

          <div className="mx-auto mt-5 h-1.5 w-36 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-500" />
          </div>

          <p className="mt-4 text-sm font-medium text-slate-500">
            Restoring your RailYatra session...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {/* Mobile overlay */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-[#06152d]/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[278px] flex-col border-r border-slate-200/70 bg-white transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex h-[84px] items-center justify-between border-b border-slate-100 px-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#092b59] to-[#06152d] text-cyan-300 shadow-lg shadow-blue-950/15">
              <TrainFront size={26} strokeWidth={2.1} />
            </span>

            <span>
              <span className="block text-xl font-black tracking-tight text-[#071b3a]">
                RailYatra
              </span>
              <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-slate-400">
                YOUR JOURNEY, SIMPLIFIED
              </span>
            </span>
          </button>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            WORKSPACE
          </p>

          <nav className="space-y-1.5">
            {visibleNavItems.map(({ label, path, icon: Icon }) => {
              const active = page === path

              return (
                <button
                  type="button"
                  key={path}
                  onClick={() => navigate(path)}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-[#071b3a] text-white shadow-lg shadow-blue-950/15'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#071b3a]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      active
                        ? 'bg-white/10 text-cyan-300'
                        : 'text-slate-400 group-hover:text-cyan-700'
                    }`}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="flex-1">{label}</span>

                  {active && (
                    <ChevronRight size={16} className="text-cyan-300" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="my-6 border-t border-slate-100" />

          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            ACCOUNT
          </p>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
              <LogOut size={17} />
            </span>
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>

        {/* Sidebar footer */}
        <div className="mt-auto p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#092b59] via-[#071b3a] to-[#041126] p-5 text-white">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 rounded-full border border-white/10" />

            <span className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-cyan-300">
              <Sparkles size={20} />
            </span>

            <p className="relative text-sm font-bold">
              Travel with confidence
            </p>

            <p className="relative mt-2 text-xs leading-5 text-blue-100/70">
              Keep your travel details organized in one place.
            </p>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="relative mt-4 inline-flex items-center gap-2 text-xs font-bold text-cyan-300 transition hover:text-white"
            >
              Update profile <ArrowUpRight size={14} />
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] font-medium text-slate-400">
            RailYatra Account Portal
          </p>
        </div>
      </aside>

      {/* Main application */}
      <div className="min-h-screen lg:pl-[278px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">
                RAILYATRA <span className="mx-1 text-cyan-500">/</span> ACCOUNT
              </p>

              <p className="mt-1 truncate text-sm font-bold text-[#071b3a] sm:text-base">
                {title}
              </p>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="max-w-44 truncate text-xs font-bold text-slate-700">
                {user.fullName || user.email || 'Traveller'}
              </p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                {isAdmin ? 'Administrator' : 'RailYatra member'}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 font-bold text-[#092b59]">
              {(user.fullName || user.email || 'R')
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
          <div className="mb-7 sm:mb-9">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-700 sm:text-[11px]">
              YOUR RAILYATRA
            </p>

            <h1 className="text-2xl font-black tracking-tight text-[#071b3a] sm:text-3xl lg:text-[34px]">
              {title}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {subtitle}
            </p>
          </div>

          {page === '/dashboard' && (
            <Dashboard navigate={navigate} user={user} />
          )}

          {page === '/profile' && <ProfilePage />}

          {page === '/passengers' && <PassengersPage />}

          {page === '/settings/password' && <PasswordPage />}

          {page === '/trains' && (
            <TrainSearchPage onBook={startBooking} />
          )}

          {page === '/booking' && (
            <BookingPage
              bookingDetails={selectedBooking}
              user={user}
              onBack={() => navigate('/trains')}
              onNewSearch={() => {
                setSelectedBooking(null)
                navigate('/trains')
              }}
            />
          )}

          {page === '/bookings' && (
            <MyBookingsPage
              onSearchTrains={() => navigate('/trains')}
            />
          )}

          {page === '/admin/journeys' && isAdmin && (
            <AdminJourneysPage />
          )}

          {page === '/admin/journeys' && !isAdmin && (
            <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm font-medium text-red-700 shadow-sm">
              You do not have permission to access the admin panel.
            </section>
          )}

          <footer className="mt-12 border-t border-slate-200/80 pt-5">
            <div className="flex flex-col justify-between gap-2 text-[11px] text-slate-400 sm:flex-row sm:items-center">
              <p>© {new Date().getFullYear()} RailYatra. All rights reserved.</p>
              <p className="flex items-center gap-1.5">
                <CircleCheck size={13} className="text-emerald-600" />
                Your travel dashboard
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

function Dashboard({ navigate, user }) {
  const cards = [
    {
      title: 'Find a train',
      description: 'Explore train routes and plan your next trip.',
      icon: Search,
      path: '/trains',
      action: 'Search trains',
      accent: 'bg-cyan-50 text-cyan-800',
    },
    {
      title: 'My bookings',
      description: 'Review your tickets and booking status.',
      icon: Ticket,
      path: '/bookings',
      action: 'View bookings',
      accent: 'bg-indigo-50 text-indigo-700',
    },
    {
      title: 'Personal profile',
      description: 'Manage your details and travel preferences.',
      icon: UserRound,
      path: '/profile',
      action: 'View profile',
      accent: 'bg-sky-50 text-sky-700',
    },
    {
      title: 'Saved passengers',
      description: 'Manage passenger details for your journeys.',
      icon: UsersRound,
      path: '/passengers',
      action: 'Manage passengers',
      accent: 'bg-violet-50 text-violet-700',
    },
    {
      title: 'Password & security',
      description: 'Update your password and protect your account.',
      icon: ShieldCheck,
      path: '/settings/password',
      action: 'Manage security',
      accent: 'bg-emerald-50 text-emerald-700',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <section className="relative isolate overflow-hidden rounded-[26px] bg-gradient-to-br from-[#092b59] via-[#071b3a] to-[#041126] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-9 lg:p-10">
        <div className="pointer-events-none absolute -right-12 -top-16 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-7 top-6 -z-10 h-40 w-40 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute bottom-[-100px] right-[22%] -z-10 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] text-cyan-200 sm:text-[11px]">
            <Sparkles size={14} />
            YOUR NEXT JOURNEY STARTS HERE
          </span>

          <h2 className="mt-6 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
            Welcome back,
            <br />
            <span className="text-cyan-300">
              {user.fullName || 'Traveller'}.
            </span>
          </h2>

          <p className="mt-4 max-w-lg text-sm leading-7 text-blue-100/80 sm:text-base">
            Plan your journey, manage your bookings, and keep your travel
            details ready — all from one simple dashboard.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/trains')}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-extrabold text-[#071b3a] shadow-lg shadow-cyan-950/10 transition hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              <Search size={17} />
              Search trains
              <ArrowUpRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.13]"
            >
              <Ticket size={17} />
              My bookings
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 right-5 hidden text-white/[0.07] md:block lg:bottom-6 lg:right-9">
          <TrainFront size={160} strokeWidth={1.1} />
        </div>
      </section>

      {/* Quick information strip */}
      <section className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate('/trains')}
          className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800 transition group-hover:bg-cyan-100">
            <Compass size={23} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-[#071b3a]">
              Ready for your next trip?
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Search routes and check available trains.
            </span>
          </span>
          <ArrowUpRight size={18} className="shrink-0 text-slate-400 transition group-hover:text-cyan-700" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/bookings')}
          className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <CalendarDays size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-[#071b3a]">
              Keep track of your tickets
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Open My Bookings to check your booking details.
            </span>
          </span>
          <ArrowUpRight size={18} className="shrink-0 text-slate-400 transition group-hover:text-cyan-700" />
        </button>
      </section>

      {/* Account cards */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-700">
              QUICK ACCESS
            </p>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-[#071b3a] sm:text-2xl">
              Manage your account
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Everything you need, within reach.
            </p>
          </div>

          <Settings size={21} className="mb-1 shrink-0 text-slate-300" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(
            ({ title, description, icon: Icon, path, action, accent }) => (
              <button
                type="button"
                key={path}
                onClick={() => navigate(path)}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent} transition group-hover:scale-105`}>
                    <Icon size={22} />
                  </span>

                  <ArrowUpRight
                    size={17}
                    className="text-slate-300 transition group-hover:text-cyan-700"
                  />
                </div>

                <h3 className="mt-5 text-sm font-extrabold text-[#071b3a]">
                  {title}
                </h3>

                <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">
                  {description}
                </p>

                <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#092b59]">
                  {action}
                  <ChevronRight
                    size={14}
                    className="transition group-hover:translate-x-1"
                  />
                </span>
              </button>
            ),
          )}
        </div>
      </section>

      {/* Account reminder */}
      <section className="flex items-start gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-5 sm:p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <CircleCheck size={22} />
        </span>

        <div>
          <h3 className="text-sm font-extrabold text-[#071b3a]">
            Your travel space, all in one place
          </h3>
          <p className="mt-1.5 text-xs leading-6 text-slate-500 sm:text-sm">
            Use Train Search to discover journeys, My Bookings to review
            tickets, and your account pages to manage saved passenger details
            and security settings.
          </p>
        </div>
      </section>
    </div>
  )
}

export default App
