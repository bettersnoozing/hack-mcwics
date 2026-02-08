import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { applicationApi, type ApplicationData, type AppStatus } from '../../services/applicationApi';
import { openRoleApi, type OpenRoleData } from '../../services/openRoleApi';

const ALL_STATUSES: AppStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
const statusVariant: Record<AppStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'default',
};
const statusLabel: Record<AppStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

type SortKey = 'applicantName' | 'jobTitle' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

function StatusDropdown({ current, onChange }: { current: AppStatus; onChange: (s: AppStatus) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  };

  return (
    <div>
      <button ref={btnRef} onClick={handleOpen} className="inline-flex items-center gap-1 cursor-pointer">
        <Badge variant={statusVariant[current]}>{statusLabel[current]}</Badge>
        <ChevronDown size={12} className="text-warmGray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-48 rounded-xl border border-warmGray-100 bg-white py-1 shadow-lg" style={{ top: pos.top, left: pos.left }}>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors cursor-pointer ${s === current ? 'bg-warmGray-50 font-medium' : 'hover:bg-warmGray-50'}`}
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

function RoleFilterDropdown({ roles, current, onChange }: {
  roles: OpenRoleData[];
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
        {current ? roles.find((r) => r._id === current)?.jobTitle ?? 'Role' : 'All Roles'}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-warmGray-100 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
            <button onClick={() => { onChange(null); setOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm cursor-pointer ${!current ? 'bg-warmGray-50 font-medium' : 'hover:bg-warmGray-50'}`}>
              All Roles {!current && <Check size={12} className="ml-auto text-calm-500" />}
            </button>
            {roles.map((r) => (
              <button key={r._id} onClick={() => { onChange(r._id); setOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm cursor-pointer ${current === r._id ? 'bg-warmGray-50 font-medium' : 'hover:bg-warmGray-50'}`}>
                {r.jobTitle} {current === r._id && <Check size={12} className="ml-auto text-calm-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ColumnVisibilityDropdown({ columns, visible, onToggle }: {
  columns: { key: string; label: string }[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" icon={<Columns3 size={14} />} onClick={() => setOpen((o) => !o)}>Columns</Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-warmGray-100 bg-white py-1 shadow-lg">
            {columns.filter((c) => c.key !== 'select').map((c) => (
              <button key={c.key} onClick={() => onToggle(c.key)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-warmGray-50 cursor-pointer">
                <div className={`flex h-4 w-4 items-center justify-center rounded border ${visible.has(c.key) ? 'border-brand-400 bg-brand-400 text-white' : 'border-warmGray-300'}`}>
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

const COLUMNS = [
  { key: 'select', label: '', defaultVisible: true },
  { key: 'applicantName', label: 'Applicant', defaultVisible: true },
  { key: 'applicantEmail', label: 'Email', defaultVisible: true },
  { key: 'jobTitle', label: 'Role', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'createdAt', label: 'Submitted', defaultVisible: true },
  { key: 'updatedAt', label: 'Updated', defaultVisible: false },
];

export function Applications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const clubId = user?.adminClub ?? '';
  const [allApps, setAllApps] = useState<ApplicationData[]>([]);
  const [roles, setRoles] = useState<OpenRoleData[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppStatus | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)),
  );

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    Promise.all([
      applicationApi.listForClub(clubId),
      openRoleApi.list(clubId),
    ])
      .then(([apps, r]) => { setAllApps(apps); setRoles(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clubId]);

  const filtered = useMemo(() => {
    let result = [...allApps];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.applicant.name.toLowerCase().includes(q) ||
        a.applicant.email.toLowerCase().includes(q) ||
        a.openRole.jobTitle.toLowerCase().includes(q),
      );
    }
    if (statusFilter) result = result.filter((a) => a.status === statusFilter);
    if (roleFilter) result = result.filter((a) => a.openRole._id === roleFilter);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'applicantName') cmp = a.applicant.name.localeCompare(b.applicant.name);
      else if (sortKey === 'jobTitle') cmp = a.openRole.jobTitle.localeCompare(b.openRole.jobTitle);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [allApps, search, statusFilter, roleFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a._id)));
  };

  const handleStatusChange = async (appId: string, status: AppStatus) => {
    try {
      const updated = await applicationApi.updateStatus(appId, status);
      setAllApps((prev) => prev.map((a) => (a._id === appId ? updated : a)));
      showToast(`Status updated to ${statusLabel[status]}`);
    } catch { /* ignore */ }
  };

  const handleBulkStatusChange = async (status: AppStatus) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) => applicationApi.updateStatus(id, status)));
    const refreshed = await applicationApi.listForClub(clubId);
    setAllApps(refreshed);
    setSelected(new Set());
    showToast(`Updated ${ids.length} application${ids.length !== 1 ? 's' : ''}`);
  };

  const toggleColumn = (key: string) => setVisibleCols((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Submitted'];
    const rows = filtered.map((a) => [a.applicant.name, a.applicant.email, a.openRole.jobTitle, statusLabel[a.status], a.createdAt.split('T')[0]]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown size={12} className="text-warmGray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-brand-500" /> : <ChevronDown size={12} className="text-brand-500" />;
  };

  if (authLoading) {
    return <PageContainer><div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div></PageContainer>;
  }

  if (!clubId) {
    return <PageContainer><EmptyStateCard emoji="🔒" title="No club assigned" description="Complete exec onboarding first." /></PageContainer>;
  }

  return (
    <AnimatedPage>
      <PageContainer className="max-w-6xl">
        <Link to="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} /> Back to Admin
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
              <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-48 rounded-xl border border-warmGray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-400/30" />
            </div>
            <div className="inline-flex rounded-xl bg-warmGray-100 p-1 flex-wrap">
              <button onClick={() => setStatusFilter(null)} className={`rounded-lg px-2 py-1 text-xs font-medium transition-all cursor-pointer ${!statusFilter ? 'bg-white text-warmGray-800 shadow-sm' : 'text-warmGray-500 hover:text-warmGray-700'}`}>All</button>
              {ALL_STATUSES.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-2 py-1 text-xs font-medium transition-all cursor-pointer ${statusFilter === s ? 'bg-white text-warmGray-800 shadow-sm' : 'text-warmGray-500 hover:text-warmGray-700'}`}>
                  {statusLabel[s].split(' ')[0]}
                </button>
              ))}
            </div>
            <RoleFilterDropdown roles={roles} current={roleFilter} onChange={setRoleFilter} />
          </div>
          <div className="flex items-center gap-2">
            <ColumnVisibilityDropdown columns={COLUMNS} visible={visibleCols} onToggle={toggleColumn} />
            <Button variant="outline" icon={<Download size={14} />} onClick={exportCSV}>Export</Button>
          </div>
        </div>

        {/* Bulk actions */}
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
                      <button onClick={toggleSelectAll} className={`flex h-4 w-4 items-center justify-center rounded border transition-colors cursor-pointer ${selected.size === filtered.length && filtered.length > 0 ? 'border-brand-400 bg-brand-400 text-white' : 'border-warmGray-300 hover:border-warmGray-400'}`}>
                        {selected.size === filtered.length && filtered.length > 0 && <Check size={10} />}
                      </button>
                    </th>
                  )}
                  {visibleCols.has('applicantName') && <th className="px-4 py-3 text-left"><button onClick={() => toggleSort('applicantName')} className="inline-flex items-center gap-1 font-medium text-warmGray-600 cursor-pointer">Applicant <SortIcon k="applicantName" /></button></th>}
                  {visibleCols.has('applicantEmail') && <th className="px-4 py-3 text-left font-medium text-warmGray-500">Email</th>}
                  {visibleCols.has('jobTitle') && <th className="px-4 py-3 text-left"><button onClick={() => toggleSort('jobTitle')} className="inline-flex items-center gap-1 font-medium text-warmGray-600 cursor-pointer">Role <SortIcon k="jobTitle" /></button></th>}
                  {visibleCols.has('status') && <th className="px-4 py-3 text-left"><button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 font-medium text-warmGray-600 cursor-pointer">Status <SortIcon k="status" /></button></th>}
                  {visibleCols.has('createdAt') && <th className="px-4 py-3 text-left"><button onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 font-medium text-warmGray-600 cursor-pointer">Submitted <SortIcon k="createdAt" /></button></th>}
                  {visibleCols.has('updatedAt') && <th className="px-4 py-3 text-left font-medium text-warmGray-500">Updated</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr key={app._id} onClick={() => navigate(`/admin/applications/${app._id}`)} className={`border-b border-warmGray-50 transition-colors cursor-pointer ${selected.has(app._id) ? 'bg-brand-50/30' : 'hover:bg-warmGray-50/50'}`}>
                    {visibleCols.has('select') && (
                      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(app._id)} className={`flex h-4 w-4 items-center justify-center rounded border transition-colors cursor-pointer ${selected.has(app._id) ? 'border-brand-400 bg-brand-400 text-white' : 'border-warmGray-300 hover:border-warmGray-400'}`}>
                          {selected.has(app._id) && <Check size={10} />}
                        </button>
                      </td>
                    )}
                    {visibleCols.has('applicantName') && <td className="px-4 py-3 font-medium text-warmGray-800">{app.applicant.name}</td>}
                    {visibleCols.has('applicantEmail') && <td className="px-4 py-3 text-warmGray-500">{app.applicant.email}</td>}
                    {visibleCols.has('jobTitle') && <td className="px-4 py-3 text-warmGray-700">{app.openRole.jobTitle}</td>}
                    {visibleCols.has('status') && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown current={app.status} onChange={(s) => handleStatusChange(app._id, s)} />
                      </td>
                    )}
                    {visibleCols.has('createdAt') && <td className="px-4 py-3 text-warmGray-500">{app.createdAt.split('T')[0]}</td>}
                    {visibleCols.has('updatedAt') && <td className="px-4 py-3 text-warmGray-500">{app.updatedAt.split('T')[0]}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
    </AnimatedPage>
  );
}
