import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, Check, X, Search, Columns3, Download, ChevronUp, ChevronsUpDown,
} from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { EmailPreviewModal, generateInterviewInviteEmail, generateAcceptedEmail, generateRejectedEmail } from '../../components/EmailPreviewModal';
import { useApi } from '../../contexts/ApiContext';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../contexts/ToastContext';
import { useOutbox } from '../../contexts/OutboxContext';
import type { Application, ApplicationStatus, Position, RecruitmentPost } from '../../contracts';

// ── Status config ─────────────────────────────────────
const ALL_STATUSES: ApplicationStatus[] = ['submitted', 'under_review', 'interview_invited', 'interview_scheduled', 'accepted', 'rejected'];
const statusVariant: Record<ApplicationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default', submitted: 'info', under_review: 'warning', interview_invited: 'info', interview_scheduled: 'info', accepted: 'success', rejected: 'danger',
};
const statusLabel: Record<ApplicationStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', interview_invited: 'Interview Invited', interview_scheduled: 'Interview Scheduled', accepted: 'Accepted', rejected: 'Rejected',
};

// Statuses that trigger email preview
const EMAIL_STATUSES: ApplicationStatus[] = ['interview_invited', 'accepted', 'rejected'];

type SortKey = 'applicantName' | 'positionTitle' | 'status' | 'submittedAt';
type SortDir = 'asc' | 'desc';

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'select', label: '', defaultVisible: true },
  { key: 'applicantName', label: 'Applicant', defaultVisible: true },
  { key: 'applicantEmail', label: 'Email', defaultVisible: true },
  { key: 'positionTitle', label: 'Position', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'submittedAt', label: 'Submitted', defaultVisible: true },
  { key: 'updatedAt', label: 'Updated', defaultVisible: false },
];

// ── Inline status dropdown ────────────────────────────
function StatusDropdown({
  current,
  onChange,
}: {
  current: ApplicationStatus;
  onChange: (s: ApplicationStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="inline-flex items-center gap-1 cursor-pointer"
      >
        <Badge variant={statusVariant[current]}>{statusLabel[current]}</Badge>
        <ChevronDown size={12} className="text-warmGray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-warmGray-100 bg-white py-1 shadow-lg">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(s);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                  s === current ? 'bg-warmGray-50 font-medium' : 'hover:bg-warmGray-50'
                }`}
              >
                <Badge variant={statusVariant[s]} className="text-xs">{statusLabel[s]}</Badge>
                {s === current && <Check size={12} className="ml-auto text-calm-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Column visibility dropdown ────────────────────────
function ColumnVisibilityDropdown({
  columns,
  visible,
  onToggle,
}: {
  columns: ColumnDef[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" icon={<Columns3 size={14} />} onClick={() => setOpen((o) => !o)}>
        Columns
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-warmGray-100 bg-white py-1 shadow-lg">
            {columns.filter((c) => c.key !== 'select').map((c) => (
              <button
                key={c.key}
                onClick={() => onToggle(c.key)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-warmGray-50 cursor-pointer"
              >
                <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                  visible.has(c.key) ? 'border-brand-400 bg-brand-400 text-white' : 'border-warmGray-300'
                }`}>
                  {visible.has(c.key) && <Check size={10} />}
                </div>
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Position filter dropdown ──────────────────────────
function PositionFilterDropdown({
  positions,
  current,
  onChange,
}: {
  positions: Position[];
  current: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-warmGray-200 bg-white px-3 py-2 text-sm text-warmGray-600 transition-colors hover:border-warmGray-300 cursor-pointer"
      >
        {current ? positions.find((p) => p.id === current)?.title ?? 'Position' : 'All Positions'}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-warmGray-100 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm cursor-pointer ${!current ? 'bg-warmGray-50 font-medium' : 'hover:bg-warmGray-50'}`}
            >
              All Positions
              {!current && <Check size={12} className="ml-auto text-calm-500" />}
            </button>
            {positions.map((p) => (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm cursor-pointer ${current === p.id ? 'bg-warmGray-50 font-medium' : 'hover:bg-warmGray-50'}`}
              >
                {p.title}
                {current === p.id && <Check size={12} className="ml-auto text-calm-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────
export function Applications() {
  const api = useApi();
  const session = useSession();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { addEmail } = useOutbox();

  const [allApps, setAllApps] = useState<Application[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(null);
  const [positionFilter, setPositionFilter] = useState<string | null>(null);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('submittedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)),
  );

  // Email preview modal
  const [emailPreview, setEmailPreview] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    appId: string;
    status: ApplicationStatus;
  } | null>(null);

  const clubId = session.role === 'admin' ? (session.clubId ?? '') : '';

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    Promise.all([
      api.listApplicationsForClub(clubId),
      api.listRecruitmentPosts(clubId),
    ]).then(([apps, posts]) => {
      setAllApps(apps);
      const allPositions = posts.flatMap((p: RecruitmentPost) => p.positions);
      setPositions(allPositions);
      setLoading(false);
    });
  }, [api, clubId]);

  // ── Filtering & sorting ───────────────────────────
  const filtered = useMemo(() => {
    let result = [...allApps];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.applicantName.toLowerCase().includes(q) ||
          a.applicantEmail.toLowerCase().includes(q) ||
          a.positionTitle.toLowerCase().includes(q),
      );
    }

    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (positionFilter) {
      result = result.filter((a) => a.positionId === positionFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'applicantName') cmp = a.applicantName.localeCompare(b.applicantName);
      else if (sortKey === 'positionTitle') cmp = a.positionTitle.localeCompare(b.positionTitle);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'submittedAt') cmp = a.submittedAt.localeCompare(b.submittedAt);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allApps, search, statusFilter, positionFilter, sortKey, sortDir]);

  // ── Handlers ──────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const generateEmailForStatus = (app: Application, status: ApplicationStatus) => {
    const data = {
      studentEmail: app.applicantEmail,
      studentName: app.applicantName,
      clubName: app.clubName,
      positionTitle: app.positionTitle,
    };
    if (status === 'interview_invited') return generateInterviewInviteEmail(data);
    if (status === 'accepted') return generateAcceptedEmail(data);
    if (status === 'rejected') return generateRejectedEmail(data);
    return null;
  };

  const handleStatusChange = async (appId: string, status: ApplicationStatus) => {
    const app = allApps.find((a) => a.id === appId);
    if (!app) return;

    // If this status triggers an email, show preview first
    if (EMAIL_STATUSES.includes(status)) {
      const email = generateEmailForStatus(app, status);
      if (email) {
        setEmailPreview(email);
        setPendingStatusChange({ appId, status });
        return;
      }
    }

    // Otherwise just update directly
    const updated = await api.updateApplicationStatus(appId, status);
    setAllApps((prev) => prev.map((a) => (a.id === appId ? updated : a)));
    showToast(`Status updated to ${statusLabel[status]}`);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange || !emailPreview) return;
    
    // Add email to outbox
    addEmail(emailPreview);
    
    // Update status
    const updated = await api.updateApplicationStatus(pendingStatusChange.appId, pendingStatusChange.status);
    setAllApps((prev) => prev.map((a) => (a.id === pendingStatusChange.appId ? updated : a)));
    showToast(`Status updated to ${statusLabel[pendingStatusChange.status]}`);
    
    // Clear modal state
    setEmailPreview(null);
    setPendingStatusChange(null);
  };

  const cancelStatusChange = () => {
    setEmailPreview(null);
    setPendingStatusChange(null);
  };

  const handleBulkStatusChange = async (status: ApplicationStatus) => {
    if (selected.size === 0) return;
    
    // For email statuses, handle one by one with previews (simplified: just do the first one)
    if (EMAIL_STATUSES.includes(status)) {
      const firstApp = allApps.find((a) => selected.has(a.id));
      if (firstApp) {
        const email = generateEmailForStatus(firstApp, status);
        if (email) {
          setEmailPreview(email);
          setPendingStatusChange({ appId: firstApp.id, status });
          return;
        }
      }
    }

    const ids = Array.from(selected);
    const updated = await api.bulkUpdateApplicationStatus(ids, status);
    setAllApps((prev) =>
      prev.map((a) => {
        const u = updated.find((x) => x.id === a.id);
        return u ?? a;
      }),
    );
    setSelected(new Set());
    showToast(`Updated ${updated.length} application${updated.length !== 1 ? 's' : ''} to ${statusLabel[status]}`);
  };

  const toggleColumn = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Position', 'Status', 'Submitted'];
    const rows = filtered.map((a) => [a.applicantName, a.applicantEmail, a.positionTitle, statusLabel[a.status], a.submittedAt]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown size={12} className="text-warmGray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-brand-500" /> : <ChevronDown size={12} className="text-brand-500" />;
  };

  // ── Render ────────────────────────────────────────
  return (
    <AnimatedPage>
      <PageContainer className="max-w-6xl">
        <Link to="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to Admin
        </Link>

        <SectionHeader
          title="Applications"
          subtitle={loading ? 'Loading...' : `${filtered.length} application${filtered.length !== 1 ? 's' : ''}`}
          className="mb-6"
        />

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warmGray-400" />
              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 rounded-xl border border-warmGray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-400/30"
              />
            </div>

            <div className="inline-flex rounded-xl bg-warmGray-100 p-1 flex-wrap">
              <button
                onClick={() => setStatusFilter(null)}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition-all cursor-pointer ${
                  !statusFilter ? 'bg-white text-warmGray-800 shadow-sm' : 'text-warmGray-500 hover:text-warmGray-700'
                }`}
              >
                All
              </button>
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-all cursor-pointer ${
                    statusFilter === s ? 'bg-white text-warmGray-800 shadow-sm' : 'text-warmGray-500 hover:text-warmGray-700'
                  }`}
                >
                  {statusLabel[s].split(' ')[0]}
                </button>
              ))}
            </div>

            <PositionFilterDropdown
              positions={positions}
              current={positionFilter}
              onChange={setPositionFilter}
            />
          </div>

          <div className="flex items-center gap-2">
            <ColumnVisibilityDropdown columns={COLUMNS} visible={visibleCols} onToggle={toggleColumn} />
            <Button variant="outline" icon={<Download size={14} />} onClick={exportCSV}>
              Export
            </Button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-2 flex-wrap">
            <span className="text-sm font-medium text-brand-700">{selected.size} selected</span>
            <div className="h-4 w-px bg-brand-200" />
            <span className="text-xs text-warmGray-500">Set status:</span>
            {ALL_STATUSES.map((s) => (
              <button key={s} onClick={() => handleBulkStatusChange(s)} className="cursor-pointer">
                <Badge variant={statusVariant[s]} className="cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-brand-300 transition-all">
                  {statusLabel[s].split(' ')[0]}
                </Badge>
              </button>
            ))}
            <button onClick={() => setSelected(new Set())} className="ml-auto rounded-lg p-1 text-warmGray-400 hover:text-warmGray-600 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyStateCard emoji="📋" title="No applications" description="No applications match your filters." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-warmGray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warmGray-100 bg-warmGray-50/70">
                  {visibleCols.has('select') && (
                    <th className="w-10 px-3 py-3">
                      <button
                        onClick={toggleSelectAll}
                        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors cursor-pointer ${
                          selected.size === filtered.length && filtered.length > 0
                            ? 'border-brand-400 bg-brand-400 text-white'
                            : 'border-warmGray-300 hover:border-warmGray-400'
                        }`}
                      >
                        {selected.size === filtered.length && filtered.length > 0 && <Check size={10} />}
                      </button>
                    </th>
                  )}
                  {visibleCols.has('applicantName') && (
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort('applicantName')} className="inline-flex items-center gap-1 font-medium text-warmGray-600 cursor-pointer">
                        Applicant <SortIcon k="applicantName" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has('applicantEmail') && (
                    <th className="px-4 py-3 text-left font-medium text-warmGray-500">Email</th>
                  )}
                  {visibleCols.has('positionTitle') && (
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort('positionTitle')} className="inline-flex items-center gap-1 font-medium text-warmGray-600 cursor-pointer">
                        Position <SortIcon k="positionTitle" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has('status') && (
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 font-medium text-warmGray-600 cursor-pointer">
                        Status <SortIcon k="status" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has('submittedAt') && (
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort('submittedAt')} className="inline-flex items-center gap-1 font-medium text-warmGray-600 cursor-pointer">
                        Submitted <SortIcon k="submittedAt" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has('updatedAt') && (
                    <th className="px-4 py-3 text-left font-medium text-warmGray-500">Updated</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => navigate(`/admin/applications/${app.id}`)}
                    className={`border-b border-warmGray-50 transition-colors cursor-pointer ${
                      selected.has(app.id) ? 'bg-brand-50/30' : 'hover:bg-warmGray-50/50'
                    }`}
                  >
                    {visibleCols.has('select') && (
                      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(app.id)}
                          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors cursor-pointer ${
                            selected.has(app.id)
                              ? 'border-brand-400 bg-brand-400 text-white'
                              : 'border-warmGray-300 hover:border-warmGray-400'
                          }`}
                        >
                          {selected.has(app.id) && <Check size={10} />}
                        </button>
                      </td>
                    )}
                    {visibleCols.has('applicantName') && (
                      <td className="px-4 py-3 font-medium text-warmGray-800">{app.applicantName}</td>
                    )}
                    {visibleCols.has('applicantEmail') && (
                      <td className="px-4 py-3 text-warmGray-500">{app.applicantEmail}</td>
                    )}
                    {visibleCols.has('positionTitle') && (
                      <td className="px-4 py-3 text-warmGray-700">{app.positionTitle}</td>
                    )}
                    {visibleCols.has('status') && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown current={app.status} onChange={(s) => handleStatusChange(app.id, s)} />
                      </td>
                    )}
                    {visibleCols.has('submittedAt') && (
                      <td className="px-4 py-3 text-warmGray-500">{app.submittedAt.split('T')[0]}</td>
                    )}
                    {visibleCols.has('updatedAt') && (
                      <td className="px-4 py-3 text-warmGray-500">{app.updatedAt.split('T')[0]}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Email Preview Modal */}
        <EmailPreviewModal
          open={!!emailPreview}
          onClose={cancelStatusChange}
          onConfirm={confirmStatusChange}
          email={emailPreview}
        />
      </PageContainer>
    </AnimatedPage>
  );
}
