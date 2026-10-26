
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
} from 'lucide-react'

import { useAuth } from './auth/AuthProvider'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage';
import PassengersPage from './pages/PassengersPage';
import PasswordPage from './pages/PasswordPage';
import AdminJourneysPage from './pages/AdminJourneysPage';
import TrainSearchPage from './pages/TrainSearchPage';
import BookingPage from './pages/BookingPage'
import { Train } from 'lucide-react';
import MyBookingsPage from './pages/MyBookingsPage'
import { Ticket } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', path: '/profile', icon: UserRound },
  { label: 'Passengers', path: '/passengers', icon: UsersRound },
  {
    label: 'Password & Security',
    path: '/settings/password',
    icon: ShieldCheck,
  },
  {
    label: 'Train Search',
    path: '/trains',
    icon: Train
  },

  {
    label: 'My Bookings',
    path: '/bookings',
    icon: Ticket,
  },

]

function App() {
  const { user, loading, logout } = useAuth()

  const [page, setPage] = useState('/dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const role = String(user?.role || '').toUpperCase()
  const [selectedBooking, setSelectedBooking] = useState(null)
  const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN'
  const visibleNavItems = isAdmin
    ? [...navItems, { label: 'Admin Panel', path: '/admin/journeys', icon: ShieldCheck }]
    : navItems

  const titles = {
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
  }

  const [title, subtitle] = titles[page] || titles['/dashboard']

  function navigate(path) {
    setPage(path)
    setMenuOpen(false)
  }
  function startBooking(bookingDetails) {
    setSelectedBooking(bookingDetails)
    navigate('/booking')
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // The local session is cleared by AuthProvider.
      // The user can still return to the login screen.
    }
  }

  // 1. Wait while the application checks the saved refresh cookie.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="mt-4 text-sm text-slate-500">
            Restoring your RailYatra session...
          </p>
        </div>
      </div>
    )
  }

  // 2. Users who are not signed in must see the login/register screen.
  if (!user) {
    return <AuthPage />
  }

  // 3. Only signed-in users can see the account dashboard.
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-950 text-cyan-300">
              <TrainFront size={25} />
            </span>

            <span className="text-left">
              <span className="block text-lg font-extrabold tracking-tight">
                RailYatra
              </span>
              <span className="block text-xs text-slate-500">
                Your journey, simplified
              </span>
            </span>
          </button>

          <button
            type="button"
            className="lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        <div className="px-5 pt-8">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Account
          </p>

          <nav className="space-y-1">
            {visibleNavItems.map(({ label, path, icon: Icon }) => {
              const active = page === path

              return (
                <button
                  type="button"
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active
                    ? 'bg-blue-950 text-white shadow-lg shadow-blue-950/10'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                >
                  <Icon size={19} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={16} />}
                </button>
              )
            })}
          </nav>

          {/* Sign-out button */}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={19} />
            Sign out
          </button>
        </div>

        <div className="mt-auto p-5">
          <div className="rounded-2xl bg-gradient-to-br from-blue-950 to-slate-800 p-5 text-white">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
              <TrainFront size={22} />
            </div>

            <p className="font-bold">Travel with confidence</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Keep your profile and passenger details up to date.
            </p>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-white"
            >
              Update profile <ArrowUpRight size={15} />
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            RailYatra · Account portal
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 hover:bg-slate-100 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="text-xs font-medium text-slate-500">
                RailYatra / Account
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:block">
              {user.fullName || user.email}
            </span>

            <span
              title="Notifications are not connected yet"
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600"
            >
              <Bell size={19} />
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          <div className="mb-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              YOUR RAILYATRA
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
              {subtitle}
            </p>
          </div>

          {page === '/dashboard' && (
            <Dashboard navigate={navigate} user={user} />
          )}

          {page === '/profile' && <ProfilePage />}

          {page === '/passengers' && <PassengersPage />}

          {page === '/settings/password' && <PasswordPage />}

          {page === '/trains' && <TrainSearchPage onBook={startBooking} />}


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


          {page === '/admin/journeys' && isAdmin && <AdminJourneysPage />}
          {page === '/admin/journeys' && !isAdmin && (
            <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">You do not have permission to access the admin panel.</section>
          )}

        </main>
      </div>
    </div>
  )
}

function Dashboard({ navigate, user }) {
  const cards = [
    {
      title: 'Personal profile',
      text: 'Manage your details and travel preferences.',
      icon: UserRound,
      path: '/profile',
      action: 'View profile',
    },
    {
      title: 'Saved passengers',
      text: 'Manage details for up to 20 passengers.',
      icon: UsersRound,
      path: '/passengers',
      action: 'Manage passengers',
    },
    {
      title: 'Password & security',
      text: 'Update your password and protect your account.',
      icon: ShieldCheck,
      path: '/settings/password',
      action: 'Manage security',
    },
  ]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-800 p-7 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-44 w-44 rounded-full border border-white/10" />

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
            <MapPin size={14} /> YOUR TRAVEL ACCOUNT
          </span>

          <h2 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
            Welcome, {user.fullName || 'traveller'}.
            <br />
            Your journey starts here.
          </h2>

          <p className="mt-4 max-w-md text-sm leading-6 text-blue-100">
            Keep your profile current, organize passenger details, and manage
            your account security from one place.
          </p>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-blue-950 transition hover:bg-cyan-200"
          >
            Complete your profile <ArrowUpRight size={17} />
          </button>
        </div>

        <TrainFront
          className="absolute bottom-7 right-8 hidden text-white/10 sm:block"
          size={150}
          strokeWidth={1}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Account management
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Everything you need, within reach.
            </p>
          </div>

          <Settings size={20} className="text-slate-400" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ title, text, icon: Icon, path, action }) => (
            <button
              type="button"
              key={path}
              onClick={() => navigate(path)}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg hover:shadow-slate-200/60"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800 transition group-hover:bg-cyan-100">
                <Icon size={23} />
              </span>

              <h3 className="mt-5 font-bold text-slate-900">{title}</h3>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {text}
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-900">
                {action} <ArrowUpRight size={16} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Clock3 size={20} />
        </span>

        <div>
          <h3 className="font-bold text-slate-900">
            A better travel experience
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Your account dashboard is ready. Profile, passenger, and security
            features will become fully functional as we connect their APIs.
          </p>
        </div>
      </section>
    </div>
  )
}

function Placeholder({ icon: Icon, title, text }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm sm:px-10">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800">
        <Icon size={30} />
      </span>

      <h2 className="mt-5 text-xl font-bold text-slate-900">{title}</h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {text}
      </p>
    </section>
  )
}

export default App
