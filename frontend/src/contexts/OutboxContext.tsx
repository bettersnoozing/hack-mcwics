import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { EmailPreview } from '../contracts';

interface OutboxContextValue {
  emails: EmailPreview[];
  addEmail: (email: Omit<EmailPreview, 'id' | 'createdAt' | 'status'>) => EmailPreview;
  markSent: (id: string) => void;
  clearAll: () => void;
}

const OutboxContext = createContext<OutboxContextValue | null>(null);

const LS_KEY = 'mcgill-portal-outbox';

function loadEmails(): EmailPreview[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as EmailPreview[];
  } catch { /* ignore */ }
  return [];
}

function saveEmails(emails: EmailPreview[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(emails));
}

export function OutboxProvider({ children }: { children: ReactNode }) {
  const [emails, setEmails] = useState<EmailPreview[]>(loadEmails);

  const addEmail = useCallback((data: Omit<EmailPreview, 'id' | 'createdAt' | 'status'>) => {
    const email: EmailPreview = {
      ...data,
      id: Math.random().toString(36).slice(2, 10),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setEmails((prev) => {
      const next = [email, ...prev];
      saveEmails(next);
      return next;
    });
    return email;
  }, []);

  const markSent = useCallback((id: string) => {
    setEmails((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, status: 'sent' as const } : e));
      saveEmails(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEmails([]);
    saveEmails([]);
  }, []);

  return (
    <OutboxContext.Provider value={{ emails, addEmail, markSent, clearAll }}>
      {children}
    </OutboxContext.Provider>
  );
}

export function useOutbox() {
  const ctx = useContext(OutboxContext);
  if (!ctx) throw new Error('useOutbox must be used within OutboxProvider');
  return ctx;
}
