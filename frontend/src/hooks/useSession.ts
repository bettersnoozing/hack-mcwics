const useRealAuth = import.meta.env.VITE_USE_REAL_AUTH === 'true';

// Unified session info for components that need to know "who is logged in"
// without caring about which auth system is in use.
export interface SessionInfo {
  role: 'student' | 'admin' | null;
  name: string;
  email: string;
  id: string;
  // Club exec
  adminClub?: string | null;
  roles?: string[];
  // Only available in demo mode
  clubId?: string;
  clubName?: string;
  // Actions
  logout?: () => void;
  openPicker?: () => void;
}

// We import from the contexts but access them via useContext to avoid throwing
// when the provider isn't mounted.
import { useAuth } from '../contexts/AuthContext';
import { useDevSession } from '../contexts/DevSessionContext';

export function useSession(): SessionInfo {
  if (useRealAuth) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth();
    if (auth.user) {
      const isAdmin = auth.isAdmin;
      return {
        role: isAdmin ? 'admin' : 'student',
        name: auth.user.name,
        email: auth.user.email,
        id: auth.user.id,
        adminClub: auth.user.adminClub,
        roles: auth.user.roles,
        logout: auth.logout,
      };
    }
    return { role: null, name: '', email: '', id: '' };
  }

  // Demo mode
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { session, openPicker } = useDevSession();
  if (session) {
    return {
      role: session.role as 'student' | 'admin',
      name: session.name,
      email: session.email,
      id: session.id,
      clubId: session.role === 'admin' ? session.clubId : undefined,
      clubName: session.role === 'admin' ? session.clubName : undefined,
      openPicker,
    };
  }
  return { role: null, name: '', email: '', id: '', openPicker };
}
