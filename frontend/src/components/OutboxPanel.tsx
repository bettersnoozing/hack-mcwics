import { useState } from 'react';
import { Mail, X, Trash2, Check, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutbox } from '../contexts/OutboxContext';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function OutboxButton() {
  const { emails } = useOutbox();
  const [open, setOpen] = useState(false);
  const pendingCount = emails.filter((e) => e.status === 'pending').length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-1.5 rounded-xl bg-warmGray-100 px-3 py-1.5 text-sm font-medium text-warmGray-600 transition-all hover:bg-warmGray-200 cursor-pointer"
      >
        <Inbox size={14} />
        Outbox
        {pendingCount > 0 && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full z-50 mt-2 w-96 rounded-2xl border border-warmGray-100 bg-white shadow-xl"
            >
              <OutboxPanelContent onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function OutboxPanelContent({ onClose }: { onClose: () => void }) {
  const { emails, markSent, clearAll } = useOutbox();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="max-h-[500px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between border-b border-warmGray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-brand-500" />
          <span className="font-semibold text-warmGray-800">Email Outbox</span>
          <Badge variant="default" className="text-xs">{emails.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {emails.length > 0 && (
            <button onClick={clearAll} className="rounded-lg p-1.5 text-warmGray-400 hover:bg-warmGray-100 hover:text-warmGray-600 transition-colors cursor-pointer">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1.5 text-warmGray-400 hover:bg-warmGray-100 hover:text-warmGray-600 transition-colors cursor-pointer">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="py-12 text-center">
            <Mail size={32} className="mx-auto text-warmGray-200 mb-2" />
            <p className="text-sm text-warmGray-500">No emails in outbox</p>
            <p className="text-xs text-warmGray-400 mt-1">Status change emails will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-warmGray-50">
            {emails.map((email) => (
              <div key={email.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                      className="flex items-center gap-1.5 text-left w-full cursor-pointer"
                    >
                      {expandedId === email.id ? <ChevronUp size={12} className="text-warmGray-400 shrink-0" /> : <ChevronDown size={12} className="text-warmGray-400 shrink-0" />}
                      <span className="text-sm font-medium text-warmGray-700 truncate">{email.subject}</span>
                    </button>
                    <p className="text-xs text-warmGray-500 mt-0.5 ml-5">To: {email.to}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {email.status === 'pending' ? (
                      <Badge variant="warning" className="text-[10px]">Pending</Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px]">Sent</Badge>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === email.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 ml-5 rounded-lg border border-warmGray-100 bg-warmGray-50/50 p-3">
                        <p className="text-xs text-warmGray-600 whitespace-pre-wrap">{email.body}</p>
                      </div>
                      <div className="mt-2 ml-5 flex items-center justify-between">
                        <span className="text-[10px] text-warmGray-400">
                          {new Date(email.createdAt).toLocaleString()}
                        </span>
                        {email.status === 'pending' && (
                          <Button
                            variant="outline"
                            className="text-xs h-7 px-2"
                            icon={<Check size={12} />}
                            onClick={() => markSent(email.id)}
                          >
                            Mark Sent
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
