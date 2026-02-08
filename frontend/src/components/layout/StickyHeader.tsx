import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Shield, FlaskConical, User, LogOut, Users } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { OutboxButton } from '../OutboxPanel';

const useRealAuth = import.meta.env.VITE_USE_REAL_AUTH === 'true';

export function StickyHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();

  const navLinks = [
    { to: '/', label: 'Discover', icon: undefined as React.ReactNode },
    ...(session.role === 'student'
      ? [{ to: '/app', label: 'Dashboard', icon: <LayoutDashboard size={16} /> as React.ReactNode }]
      : []),
    ...(session.role === 'admin'
      ? [{ to: '/admin', label: 'Admin', icon: <Shield size={16} /> as React.ReactNode }]
      : []),
    ...(session.roles?.includes('CLUB_LEADER') && session.adminClub
      ? [{ to: `/exec/club/${session.adminClub}`, label: 'Exec', icon: <Users size={16} /> as React.ReactNode }]
      : session.role && !session.roles?.includes('CLUB_LEADER')
        ? [{ to: '/exec/auth', label: 'Exec Portal', icon: <Users size={16} /> as React.ReactNode }]
        : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-warmGray-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cozy-400 to-brand-400 text-lg shadow-sm">
            🤝
          </div>
          <span className="text-lg font-bold text-warmGray-800 hidden sm:inline">
            McGill Clubs
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = link.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-warmGray-100 text-warmGray-800'
                    : 'text-warmGray-500 hover:text-warmGray-700 hover:bg-warmGray-50'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}

          {/* Outbox button (admin only) */}
          {session.role === 'admin' && (
            <div className="ml-2">
              <OutboxButton />
            </div>
          )}

          {/* Demo Mode pill (only in demo mode) */}
          {!useRealAuth && session.openPicker && (
            <button
              onClick={session.openPicker}
              className="ml-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-warmGray-500 hover:text-warmGray-700 hover:bg-warmGray-50 transition-colors cursor-pointer"
            >
              <FlaskConical size={14} />
              <span className="hidden sm:inline">Demo</span>
            </button>
          )}

          {/* Auth: Sign In link (when not logged in, real auth mode) */}
          {useRealAuth && !session.role && (
            <Link
              to="/auth"
              className="ml-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-warmGray-500 hover:text-warmGray-700 hover:bg-warmGray-50 transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Identity pill */}
          {session.name && (
            <div className="ml-1 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cozy-400/10 to-brand-400/10 px-3 py-2 text-sm font-medium text-warmGray-700">
              <User size={14} />
              <span className="hidden sm:inline max-w-[100px] truncate">{session.name}</span>
              <span className="inline-flex items-center rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warmGray-500">
                {session.role}
              </span>
            </div>
          )}

          {/* Logout (real auth only) */}
          {useRealAuth && session.logout && (
            <button
              onClick={() => { session.logout!(); navigate('/auth'); }}
              className="ml-1 rounded-xl p-2 text-warmGray-400 hover:text-warmGray-600 hover:bg-warmGray-50 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
