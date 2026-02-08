import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Shield, ChevronRight } from 'lucide-react';

// ── Types ─────────────────────────────────────────────
interface StudentIdentity {
  role: 'student';
  id: string;
  name: string;
  email: string;
}

interface AdminIdentity {
  role: 'admin';
  id: string;
  name: string;
  email: string;
  clubId: string;
  clubName: string;
}

export type DemoSession = StudentIdentity | AdminIdentity;

interface DevSessionCtx {
  session: DemoSession | null;
  openPicker: () => void;
  clearSession: () => void;
}

const LS_SESSION_KEY = 'mcgill-portal-session';

const NOOP = () => {};

const DevSessionContext = createContext<DevSessionCtx>({
  session: null,
  openPicker: NOOP,
  clearSession: NOOP,
});

// ── Preset identities ─────────────────────────────────
const STUDENTS = [
  { id: 'stu-alice', name: 'Alice Chen', email: 'alice.chen@mail.mcgill.ca' },
  { id: 'stu-bob', name: 'Bob Martinez', email: 'bob.martinez@mail.mcgill.ca' },
  { id: 'stu-clara', name: 'Clara Kim', email: 'clara.kim@mail.mcgill.ca' },
  { id: 'stu-dave', name: 'Dave Park', email: 'dave.park@mail.mcgill.ca' },
  { id: 'stu-emma', name: 'Emma Wilson', email: 'emma.wilson@mail.mcgill.ca' },
];

const ADMIN_CLUBS = [
  { clubId: 'c1', clubName: 'McGill AI Society', adminId: 'adm-ai-1', adminName: 'Dr. Smith', adminEmail: 'admin@mcgillai.ca' },
  { clubId: 'c2', clubName: 'HackMcGill', adminId: 'adm-hack-1', adminName: 'Jordan Lee', adminEmail: 'admin@hackmcgill.ca' },
  { clubId: 'c4', clubName: 'McGill Robotics', adminId: 'adm-robo-1', adminName: 'Prof. Chen', adminEmail: 'admin@robotics.mcgill.ca' },
  { clubId: 'c5', clubName: 'McGill Women in CS', adminId: 'adm-wics-1', adminName: 'Maria Santos', adminEmail: 'admin@wics.mcgill.ca' },
];

// ── Provider ──────────────────────────────────────────
export function DevSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(() => {
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY);
      return raw ? (JSON.parse(raw) as DemoSession) : null;
    } catch { return null; }
  });
  const [pickerOpen, setPickerOpen] = useState(!session);

  useEffect(() => {
    if (session) localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(LS_SESSION_KEY);
  }, [session]);

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const clearSession = useCallback(() => { setSession(null); setPickerOpen(true); }, []);

  const pick = useCallback((s: DemoSession) => { setSession(s); setPickerOpen(false); }, []);

  return (
    <DevSessionContext.Provider value={{ session, openPicker, clearSession }}>
      {children}
      <AnimatePresence>
        {pickerOpen && <SessionPickerOverlay onPick={pick} currentSession={session} />}
      </AnimatePresence>
    </DevSessionContext.Provider>
  );
}

export function useDevSession(): DevSessionCtx {
  return useContext(DevSessionContext);
}

// ── Overlay UI ────────────────────────────────────────
type Step = 'role' | 'student' | 'admin';

function SessionPickerOverlay({ onPick, currentSession }: { onPick: (s: DemoSession) => void; currentSession: DemoSession | null }) {
  const [step, setStep] = useState<Step>('role');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-brand-50/90 via-white/95 to-calm-50/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg px-4"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cozy-400 to-brand-400 text-3xl shadow-lg">
            🤝
          </div>
          <h1 className="text-2xl font-bold text-warmGray-800">Demo Mode</h1>
          <p className="mt-1 text-sm text-warmGray-500">
            Choose an identity to explore the portal
          </p>
          <div className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
            No backend required — all data is local
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'role' && (
            <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
              <PickerCard
                icon={<User size={24} />}
                title="Student"
                description="Browse clubs, apply to positions, chat in forums"
                onClick={() => setStep('student')}
                gradient="from-calm-100 to-calm-200 text-calm-600"
              />
              <PickerCard
                icon={<Shield size={24} />}
                title="Club Admin"
                description="Manage recruitment, review applications, schedule interviews"
                onClick={() => setStep('admin')}
                gradient="from-brand-100 to-brand-200 text-brand-600"
              />
              {currentSession && (
                <button
                  onClick={() => onPick(currentSession)}
                  className="mt-2 w-full text-center text-sm text-warmGray-400 hover:text-warmGray-600 transition-colors cursor-pointer"
                >
                  Continue as {currentSession.name} →
                </button>
              )}
            </motion.div>
          )}

          {step === 'student' && (
            <motion.div key="student" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
              <button onClick={() => setStep('role')} className="mb-2 text-sm text-warmGray-400 hover:text-warmGray-600 transition-colors cursor-pointer">
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-warmGray-700 mb-3">Choose a student</h2>
              {STUDENTS.map((s) => (
                <PickerCard
                  key={s.id}
                  icon={<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-calm-100 text-xs font-bold text-brand-600">{s.name.charAt(0)}</div>}
                  title={s.name}
                  description={s.email}
                  onClick={() => onPick({ role: 'student', ...s })}
                  gradient="from-warmGray-50 to-warmGray-100 text-warmGray-600"
                  compact
                />
              ))}
            </motion.div>
          )}

          {step === 'admin' && (
            <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
              <button onClick={() => setStep('role')} className="mb-2 text-sm text-warmGray-400 hover:text-warmGray-600 transition-colors cursor-pointer">
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-warmGray-700 mb-3">Choose a club to admin</h2>
              {ADMIN_CLUBS.map((c) => (
                <PickerCard
                  key={c.clubId}
                  icon={<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-cozy-100 text-xs font-bold text-brand-600">{c.clubName.charAt(0)}</div>}
                  title={c.clubName}
                  description={`Signed in as ${c.adminName}`}
                  onClick={() => onPick({ role: 'admin', id: c.adminId, name: c.adminName, email: c.adminEmail, clubId: c.clubId, clubName: c.clubName })}
                  gradient="from-warmGray-50 to-warmGray-100 text-warmGray-600"
                  compact
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function PickerCard({ icon, title, description, onClick, gradient, compact }: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  gradient: string;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border border-warmGray-100 bg-white ${compact ? 'px-4 py-3' : 'px-6 py-5'} text-left shadow-sm transition-all hover:shadow-md hover:border-warmGray-200 cursor-pointer`}
    >
      <div className={`flex shrink-0 items-center justify-center ${compact ? 'h-8 w-8' : 'h-12 w-12 rounded-xl bg-gradient-to-br'} ${compact ? '' : gradient}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-warmGray-800 ${compact ? 'text-sm' : ''}`}>{title}</p>
        <p className="text-xs text-warmGray-500 truncate">{description}</p>
      </div>
      <ChevronRight size={16} className="text-warmGray-300 group-hover:text-warmGray-500 transition-colors shrink-0" />
    </button>
  );
}
